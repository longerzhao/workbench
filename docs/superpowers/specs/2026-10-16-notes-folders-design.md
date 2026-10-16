# 笔记目录树 · 设计规格

> 日期：2026-10-16 · 状态：已实现

## 1. 目标

在笔记侧栏用 **可嵌套目录 + 笔记混排树** 分组；一篇笔记只属于一个目录（或根级未分类）。

**范围内**

1. `noteFolders` 表 + `Note.folderId`
2. 侧栏树：展开/折叠、新建目录、重命名、删除目录
3. 新建笔记落在当前选中目录（未选则根级）
4. 拖拽：笔记拖入目录；目录拖到另一目录下（防成环）
5. 搜索时临时扁平列表；清空搜索回树
6. Dexie schema 升级；旧笔记 `folderId = null`

**范围外**

- 笔记挂多个目录、目录权限、批量多选移动
- 移动端完整树（保持紧凑搜索 + 简化列表）
- 独立回收站大页、跨设备同步

## 2. 数据模型

### 2.1 NoteFolder

```ts
interface NoteFolder {
  id: string;
  name: string;
  parentId: string | null; // null = 根
  order: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
```

### 2.2 Note 变更

- 新增 `folderId: string | null`（null = 根级）
- 标签 / 置顶 / 软删不变

### 2.3 Dexie

- 新版本：`noteFolders: '&id, parentId, order'`
- `notes` 索引增加 `folderId`（保留 `updatedAt, createdAt, *tags`）
- upgrade：已有 notes 补 `folderId: null`

### 2.4 删除目录

- 不级联删笔记
- 直接子文件夹：`parentId` → 被删目录的 `parentId`
- 直接子笔记：`folderId` → 被删目录的 `parentId`

## 3. 仓储

| Repo | 职责 |
| --- | --- |
| `noteFolderRepo` | CRUD、同级 reorder、`listAll`、移动（校验不成环） |
| `noteRepo` | `create` 接受 `folderId`；`moveToFolder(id, folderId)` |

features **禁止** `import { db }`。

成环校验：目标目录不能是源目录自身或其子孙。

## 4. UI

```
┌─────────────────────┬──────────────────────────┐
│ 搜索 / +笔记 / +目录  │  标题 / 编辑·预览 / …      │
│ ─────────────────── │                          │
│ ▾ 工作               │                          │
│   ▸ 项目A            │                          │
│   📄 方案稿           │                          │
│ ▾ 生活               │                          │
│ 📄 未分类笔记         │                          │
└─────────────────────┴──────────────────────────┘
```

- 文件夹行：图标、名称、展开箭头；右键或 hover：重命名 / 删除 / 在此新建
- 笔记行：标题摘要（现有卡片信息精简为树行）、置顶标记；点击 → `?id=`
- 选中文件夹（高亮）决定「新建笔记」的默认 `folderId`
- URL 仍只用 `id`（不强制 `folderId` query）

## 5. 拖拽

- 复用 `@dnd-kit`
- 笔记 → 文件夹：改 `folderId`
- 文件夹 → 文件夹：改 `parentId`（失败 toast）
- 同级排序：更新 `order`（目录）/ 可选笔记 order（本轮笔记树内顺序：置顶优先 + `updatedAt`，不做笔记 order 字段）

## 6. 测试

- `noteFolderRepo`：成环拒绝、删目录提升子项
- 树构建纯函数：`buildNoteTree(folders, notes)` 可单测

## 7. 文件

- `src/db/schema.ts`、`src/db/index.ts`（若有 version helpers）
- `src/db/repositories/noteFolderRepo.ts`、`noteRepo.ts`
- `src/lib/noteTree.ts` (+ test)
- `src/features/notes/NoteSidebar.tsx` 及树子组件
- `docs/superpowers/specs/2026-10-16-notes-folders-design.md`
