# P3 待办完整列表页 · 设计规格

> 日期：2026-10-15 · 状态：待用户审阅后进入实现计划

## 1. 目标

把 `/#/todos` 从占位页升级为完整待办管理界面，与主页面「今日待办」卡片共用同一套 `todoRepo` / `projectRepo` 数据。

**范围内（完整 P3）**

1. 智能列表视图 + 项目分组（双栏）
2. 优先级展示与修改
3. 子任务拆解与完成度
4. 列表内拖拽排序
5. 批量：改期、改优先级、移入项目、归档（= 软删除）
6. 回收站 UI（恢复 / 永久删除 / 清空）

**范围外**

- 独立标签表、标签管理页
- `archived` 字段与归档视图（归档语义 = 进回收站）
- ⌘K、全局快捷键、PWA（仍属 P7）
- 跨项目的「看板列」视图

## 2. 架构决策

采用 **功能切片 + 视图状态进 URL**：

- 业务数据：IndexedDB via repositories + `useLiveQuery`
- 视图/项目：hash query（`view`、`project`），可刷新、可后退
- 次级筛选、展开行、多选：组件内 React state（不持久化）
- **不**再建 Todo Zustand store，避免与 Dexie 双源同步

硬约束不变：组件禁止直接 `import { db }`。

## 3. 路由与 URL

路径：`/#/todos`

| 参数 | 值 | 默认 |
| --- | --- | --- |
| `view` | `today` \| `week` \| `inbox` \| `all` \| `done` \| `trash` | `today` |
| `project` | 项目 id | 无 |

侧栏点击项目时：设置 `project`，并将 `view` 切到 `all`（避免与 `inbox` 语义冲突）。  
`trash` 始终全局，忽略 `project`。

## 4. 页面布局

```
┌─────────────┬──────────────────────────────────────┐
│ 智能列表     │  顶栏：标题 · 计数 · 新建             │
│  今天/本周/  │  次级筛选：优先级 · 标签              │
│  收件箱/全部 │  ─────────────────────────────────── │
│  已完成      │  任务列表（可展开行内编辑）             │
│  回收站      │  多选时底部批量操作条                  │
│ ─────────── │                                      │
│ 项目         │                                      │
│  + 新建项目  │                                      │
└─────────────┴──────────────────────────────────────┘
```

- ≥768px：左栏约 220px + 右栏自适应
- <768px：左栏改为顶部横向滚动 chips（智能列表 + 项目）

## 5. 目录结构

```
src/features/todos/
  TodosPage.tsx       # 拼装 + 读 URL
  TodoSidebar.tsx
  TodoToolbar.tsx
  TodoList.tsx
  TodoRow.tsx         # 折叠行 + 展开编辑
  TodoBatchBar.tsx
  TodoTrash.tsx
  useTodoQuery.ts     # 解析 URL + useLiveQuery
  filters.ts          # 纯函数：视图/优先级/标签过滤
```

可复用现有 UI：`Panel` / `Checkbox` / `Empty` / `Skeleton` / `Button` / `Modal` / `Dropdown`；拖拽沿用 `@dnd-kit`。

## 6. 视图口径

| view | 含义 |
| --- | --- |
| `today` | 未完成 +（无到期日 **或** 到期日 ≤ 今天）— 与 `todoRepo.listToday` 相同 |
| `week` | 未完成 + 到期日在本周一～周日（ISO 周）；**不含**未排期 |
| `inbox` | 未完成 + 无 `projectId` |
| `all` | 全部未完成 |
| `done` | `done === true`，按 `completedAt` 倒序 |
| `trash` | `trash` 表中 `table === 'todos'`，按 `deletedAt` 倒序 |

有 `project` 时：在 `today` / `week` / `inbox` / `all` / `done` 上再叠 `projectId`；`inbox` + 项目以项目为准（见 §3）。

**次级筛选**（会话 state，不进 URL）

- 优先级：全部 / P1–P3 / 无优先级
- 标签：从当前结果集抽出的 chips，多选为交集

## 7. 数据层变更

**不改 schema**（无迁移）。

`todoRepo` 增补：

- 统一查询入口，例如 `listByFilter({ view, projectId })`（或等价的 `listWeek` / `listDone` 组合）；页面不自行拼业务口径
- 子任务：`addSubtask` / `toggleSubtask` / `removeSubtask` / `updateSubtask`
- 批量：`updateMany(ids, patch)`、`removeMany(ids)`（内部走 `moveToTrash`）
- 现有 `reorder` 复用；仅在允许拖拽的视图写回

回收站：

- `listTrashTodos()`（过滤 `table === 'todos'`）
- 复用 `restoreFromTrash` / `purgeFromTrash` / `emptyTrash`（清空时仅删 todos 条目，或提供 `emptyTodoTrash`）

`projectRepo`：已有 create / update / remove（删项目时任务退回收件箱）足够；侧栏提供新建/重命名/删除 UI。

## 8. 交互规格

### 8.1 新建

顶栏输入回车创建。

| 当前上下文 | 默认字段 |
| --- | --- |
| `today` | `dueDate = today` |
| `week` | `dueDate =` 今天（若今天在本周内）或本周日 |
| `inbox` / `all` | 无到期 |
| 选中项目 | 带上 `projectId` |

### 8.2 行 · 折叠

勾选完成 · 标题 · 优先级点 · 到期 · 子任务进度（如 `2/5`）· 悬停删除。  
点行空白展开；勾选与删除 `stopPropagation`。

### 8.3 行 · 展开（行内编辑）

字段：标题、备注、优先级、到期日、所属项目、标签（回车添 chip）、子任务列表。  
变更即时写 repo，无「保存」按钮。`Esc` 或再点同一行收起。

### 8.4 多选与批量

独立多选 checkbox（与完成勾选分开）。选中 ≥1 时底部条：

- 改期
- 改优先级
- 移入项目
- 归档（= `removeMany` 软删除）
- 取消选择

`done` / `trash` 视图不启用多选与拖拽。

### 8.5 拖拽

仅在 `today` | `week` | `inbox` | `all`，且**无次级筛选**时启用。  
完成后调用 `todoRepo.reorder(orderedIds)`（传入重排后的当前列表 id 顺序；实现时需明确是「仅更新这批 id 的相对 order」还是「与全表 order 合并」——推荐：读取当前全表 order，仅重写本批 id 的相对顺序，避免打乱其他视图任务）。

### 8.6 回收站

展示标题 + 删除时间；恢复 / 永久删除；顶栏「清空待办回收站」。无展开编辑。

### 8.7 空态 / 错误

`Empty` + `Skeleton`；repo 失败 `toast`；批量部分失败提示数量。

## 9. 验收标准

- [ ] `/#/todos` 双栏（窄屏 chips）可用；`view`/`project` 刷新保持
- [ ] 今天视图与主页面今日待办口径一致、数据互通
- [ ] 增删改、勾选、子任务、优先级/到期/项目/标签、拖拽均可用
- [ ] 批量改期 / 优先级 / 移项目 / 归档进回收站
- [ ] 回收站恢复、永久删除、清空；与 7 天 `pruneTrash` 一致
- [ ] 无组件直接 `import { db }`
- [ ] `pnpm typecheck` / `pnpm lint` 通过

## 10. 风险与对策

| 风险 | 对策 |
| --- | --- |
| 拖拽写回打乱其他视图顺序 | 仅无次级筛选时允许拖拽；reorder 只调整参与列表的相对 order |
| 批量软删除部分失败 | 事务或逐条 + toast 汇总失败数 |
| 窄屏与全局 MobileNav 重叠 | chips 放在内容顶，不新增第三层底部栏 |
| 标签无独立表，chips 可能稀疏 | 仅从当前结果集派生；不建标签管理 |

## 11. 已确认决策摘要

| # | 决策 |
| --- | --- |
| 1 | 完整 P3（含批量与回收站 UI） |
| 2 | 双栏布局 |
| 3 | 行内展开编辑 |
| 4 | 归档 = 批量软删除进回收站 |
| 5 | 功能切片 + URL 驱动视图状态 |
