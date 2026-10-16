# P4 笔记 + 书签完整页 · 设计规格

> 日期：2026-10-15 · 状态：已实现

## 1. 目标

把 `/#/notes`、`/#/bookmarks` 从占位页升级为完整管理界面，与主页面「速记」「书签」卡片共用同一套 `noteRepo` / `bookmarkRepo`。

**范围内（P4 核心 · 方案 B）**

1. 笔记：左列表 + 右编辑器；编辑 / 预览 Tab；标题、Markdown 正文、标签、置顶
2. 笔记：新建、编辑、软删；列表只渲染摘要
3. 书签：左分组侧栏 + 右组内列表；分组与条目 CRUD；组内拖拽排序；点击累加 `clicks` 并外开
4. 书签图标：首字母方块（不做 favicon / HTML 导入）
5. 选中态进 URL：`#/notes?id=`、`#/bookmarks?group=`

**范围外**

- HTML / 浏览器书签导入、favicon 抓取
- 富文本编辑器、协同、附件 / 图片上传
- 独立标签管理页、⌘K 全局搜索（属后续）
- 笔记 / 书签独立回收站大页（软删进现有 `trash`；本阶段不做专用 trash UI）
- 新建笔记 / 书签 Zustand store

## 2. 架构决策

采用 **功能切片 + 视图状态进 URL**（与 P3 待办一致）：

| 层 | 职责 |
| --- | --- |
| `noteRepo` / `bookmarkRepo` | 唯一写库入口 |
| `features/notes/*`、`features/bookmarks/*` | 页面拼装与交互；禁止 `import { db }` |
| hash query | 笔记 `id`、书签 `group`；可刷新、可后退 |
| React state | 编辑草稿、edit/preview Tab、拖拽中、侧栏新建输入 |

- 业务数据：IndexedDB via repositories + `useLiveQuery`
- **不**再建笔记 / 书签 Zustand store，避免与 Dexie 双源同步
- 书签分组继续用字符串字段 `group`（与现 schema 一致），侧栏从数据派生；不新建 `bookmarkGroups` 表
- Markdown 预览：轻量 `react-markdown`（或等价）；不渲染未消毒 raw HTML
- 拖拽：复用已有 `@dnd-kit/*`

## 3. 路由与 URL

| 路径 | 参数 | 默认 / 回退 |
| --- | --- | --- |
| `/#/notes` | `id` = 笔记 id | 无或无效 → 右栏空态，清掉无效 `id` |
| `/#/bookmarks` | `group` = 分组名 | 缺省或无效 → 第一个有数据的组，否则 `DEFAULT_BOOKMARK_GROUP`（「常用」） |

新建笔记成功后：写入 URL `id`，焦点进标题。  
侧栏切换分组：只改 `group` query。

## 4. 页面布局与交互

### 4.1 笔记

```
┌──────────────┬─────────────────────────────────────┐
│ 搜索 / 新建   │  标题输入                             │
│ ──────────── │  [编辑] [预览]                        │
│ 置顶区        │  ─────────────────────────────────  │
│ 其余列表      │  textarea 或 Markdown 预览            │
│ （摘要一行）  │  底：标签 · 更新时间 · 删除            │
└──────────────┴─────────────────────────────────────┘
```

- ≥768px：左栏约 280px + 右栏自适应
- <768px：上下堆叠（上列表限制高度可滚动）
- 标题 / 正文 / 标签：失焦或短防抖保存；置顶点按即写（`togglePin`）
- 删除：`noteRepo.remove`（软删）→ 清 URL → toast
- 切换编辑 / 预览 Tab：共用同一草稿 state，不丢未保存内容
- 列表排序：置顶优先，其余按 `updatedAt` 降序（与现 `listAll` 一致）

### 4.2 书签

```
┌──────────────┬─────────────────────────────────────┐
│ 分组列表      │  顶：组名 · 计数 · + 添加书签          │
│ + 新建分组    │  列表行：字母图标 · 标题 · url 摘要   │
│              │        打开 · 行内/弹层编辑 · 拖拽柄   │
└──────────────┴─────────────────────────────────────┘
```

- 行点击标题或图标：`recordClick` + `window.open(url, '_blank', 'noopener,noreferrer')`
- 字母图标：标题首字；无标题则用 `hostnameOf(url)` 首字母
- 组内按 `order` 拖拽排序（全页列表）；主页卡片仍可按 clicks 展示（现有 `grouped()`）
- 分组改名：批量更新该组条目的 `group`；重名拒绝并 toast
- 删除分组：组内条目改到「常用」（或空组名归一为默认组），不批量软删条目
- URL / 标题校验失败：toast，不写库；`normalizeUrl` 沿用现逻辑

### 4.3 主页卡片

`NotesCard` / `BookmarksCard` 本阶段 UI 不大改，只保证与全页共用 repo，读写一致。

## 5. 数据模型与 Repo

沿用现 schema，**不改表结构**：

| 实体 | 字段 |
| --- | --- |
| `Note` | id, title, content, tags[], pinned, createdAt, updatedAt |
| `Bookmark` | id, title, url, icon?, group, order, clicks, createdAt |

`icon` 可留空；UI 一律字母方块。

**已有 API（沿用）**

- `noteRepo`：`listAll` / `listRecent` / `get` / `create` / `update` / `togglePin` / `remove` / `deriveTitle`
- `bookmarkRepo`：`listAll` / `grouped` / `create` / `update` / `remove` / `recordClick` / `normalizeUrl` / `hostnameOf` / `DEFAULT_BOOKMARK_GROUP`

**本阶段需扩展**

- `bookmarkRepo.listByGroup(group)`：组内按 `order` 升序
- `bookmarkRepo.listGroupNames()`：派生去重分组名（含默认组展示策略）
- `bookmarkRepo.reorder(group, orderedIds)`：写回 `order`
- `bookmarkRepo.renameGroup(from, to)`：批量改 `group`，目标名冲突则抛错 / 返回失败
- `bookmarkRepo.dissolveGroup(group)`：组内改到默认组（或指定目标组）

笔记侧现有 API 足够；摘要截断为 UI / `lib` 纯函数，不进 repo。

## 6. 目录结构

```
src/features/notes/
  NotesPage.tsx
  NoteSidebar.tsx
  NoteEditor.tsx        # 标题 + Tab + textarea + 元信息
  NotePreview.tsx       # Markdown 渲染
  useNoteQuery.ts       # 解析 URL id + live query

src/features/bookmarks/
  BookmarksPage.tsx
  BookmarkSidebar.tsx
  BookmarkList.tsx
  BookmarkRow.tsx
  BookmarkForm.tsx      # 新建 / 编辑弹层或行内表单
  useBookmarkQuery.ts   # 解析 URL group + live query
```

纯函数（摘要、字母图标、分组校验）放 feature 内 `*.ts` 或 `src/lib/`，避免 feature 互相深层依赖。

## 7. 边界与错误

- 笔记 id 不存在 / 已删：清 query，右栏空态
- 书签 group 无成员：右栏空列表 + 添加入口
- 分组重名：拒绝并 toast
- 写入失败：toast + 保留本地草稿
- 预览：不渲染未消毒 raw HTML
- 外开被拦截：仍累计 clicks（可选 toast，低优先级）

## 8. 验收

1. 笔记：新建 → URL 带 id → 编辑/预览一致 → 刷新仍选中 → 软删后列表消失且 URL 清除
2. 标签、置顶反映在列表展示 / 排序
3. 书签：建组 → 加条目 → 拖拽改序 → 点击 clicks+1 且新开标签 → 改组名后条目在新组
4. 主页卡片与全页读写一致
5. 组件无直接 `import { db }`
6. `pnpm lint` / typecheck 通过

测试策略：手测为主；摘要 / 字母图标 / 分组派生可补小单测；不强制 E2E。

## 9. 依赖

- 新增：`react-markdown`（及项目需要的 sanitizer / 配置，避免 raw HTML）
- 已有：`@dnd-kit/core`、`@dnd-kit/sortable`、Dexie、`useLiveQuery`
