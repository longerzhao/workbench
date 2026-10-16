# P5 习惯 + 番茄统计 · 设计规格

> 日期：2026-10-15 · 状态：已实现

## 1. 目标

把 `/#/habits` 从占位页做成完整习惯管理页，并新增 `/#/pomodoro` 番茄统计页；主页「习惯打卡」「番茄钟」卡片继续共用同一套 `habitRepo` / `pomodoroRepo` 与现有计时 Zustand store。

**范围内（完整 P5 · 方案 A）**

1. 习惯页：上方年度热力图 + 下方习惯列表（上热力下列表布局）
2. 习惯 CRUD：名称、图标、颜色、每周目标；拖拽排序；归档（保留历史）
3. 连续天数 / 最长连续；单习惯热力格子可补打/撤销（`toggleLog`）
4. 番茄统计页：今日/本周汇总、近 N 天趋势（Recharts）、最近会话列表
5. 导航增加「番茄」；计时仍在主页卡，设置仍在设置弹层

**范围外**

- 习惯社交、系统推送提醒、多设备同步
- 番茄全屏沉浸页、网站拦截、白噪音库
- P6 看板多维总览（主页趋势卡可继续用现有聚合）
- 新建习惯 Zustand store；页内第二套计时器 UI

## 2. 架构决策

采用 **双功能切片 + 共用统计纯函数**：

| 层 | 职责 |
| --- | --- |
| `habitRepo` / `pomodoroRepo` | 唯一写库入口 |
| `lib/habitStats.ts`、`lib/heatmap.ts` | 连续/最长连续、年格子与强度；Vitest |
| `features/habits/*` | `/#/habits` |
| `features/pomodoro/*` | `/#/pomodoro` |
| `app/navigation.ts` + `router.tsx` | 番茄路由与侧栏/底栏入口 |
| `usePomodoroStore` | 仅运行时计时（已有）；统计页只读 DB |

- 业务数据：IndexedDB via repositories + `useLiveQuery`
- 热力筛选（全部 / 某习惯）、是否显示归档：React state；可选 URL `?habit=`（实现期优先 state，需要深链再补）
- features **禁止** `import { db }`
- 不与 Dexie 双写进行中的番茄会话

## 3. 路由与导航

| 路径 | 说明 |
| --- | --- |
| `/#/habits` | 热力 + 列表 |
| `/#/pomodoro` | 统计（新建） |

`NAV_ITEMS` 在「习惯」与「书签」之间（或习惯之后）插入番茄项；`MobileNav` 自动跟随。

## 4. 页面布局与交互

### 4.1 习惯

```
┌──────────────────────────────────────────────────┐
│ 年度热力图  [全部 ▼] · 图例 · 今年打卡汇总         │
│ （按周列的贡献图）                                 │
├──────────────────────────────────────────────────┤
│ 我的习惯 · [显示归档] · + 新建                     │
│ 行：图标 名称 本周进度 连续天数 · 操作             │
└──────────────────────────────────────────────────┘
```

- 默认当前自然年
- **全部**：格子强度 = 当日有打卡的习惯数；**不可**点格 toggle（多习惯歧义）
- **单个习惯**：可点格补打/撤销；与主页卡同一 `habitRepo.toggleLog`
- 未来日期禁用；tooltip：日期 + 明细
- 新建/编辑弹层：名称、`HABIT_ICONS`、颜色、`targetPerWeek`
- 归档：`archived=true`，默认列表隐藏，可「显示归档」；删除沿用现 `remove`（清 logs + 软删）
- 列表拖拽排序：`reorder`（复用待办/书签的 order 槽位写法）

### 4.2 番茄

```
┌──────────┬──────────┬──────────┐
│ 今日完成 │ 今日专注 │ 本周完成 │
├──────────┴──────────┴──────────┤
│ 近 14/30 天专注趋势（Recharts）  │
├────────────────────────────────┤
│ 最近会话列表（完成 / 放弃）      │
└────────────────────────────────┘
```

- 不做页内计时器
- 可提供「打开设置」入口（触发现有设置弹层或文案指引）
- 会话只读

### 4.3 主页卡片

`HabitsCard` / `PomodoroCard` UI 不大改；习惯卡可增加链到 `/habits`。

## 5. 数据与 Repo

不改 schema。

**已有（沿用）**

- `habitRepo`：`listActive` / `listAll` / `create` / `update` / `remove` / `toggleLog` / `logsBetween` / `recentMatrix` / `streak` / `dailyLogSeries`
- `pomodoroRepo`：`start` / `finish` / `listBetween` / `listToday` / `todayFocusSeconds` / `todayCompletedCount` / `dailySeries`

**本阶段扩展**

- `habitRepo.reorder(orderedIds)`
- `habitRepo.logsForYear(year)` 或 `logsBetween` 包一年；按 habit 过滤在查询层或 `lib` 完成
- `pomodoroRepo.listRecent(limit)`；周汇总可用 `listBetween` + 纯函数

**纯函数**

- `currentStreak(dates, at)` / `longestStreak(dates)`（与现 repo `streak` 语义对齐：今天未打从昨天起算）
- `buildYearCells(year, countsByDate)` → 周列格子 + 强度档（0–4）
- `weekProgress(logs, habitId, weekRange, targetPerWeek)`

## 6. 目录结构

```
src/lib/habitStats.ts
src/lib/habitStats.test.ts
src/lib/heatmap.ts
src/lib/heatmap.test.ts

src/features/habits/
  HabitsPage.tsx
  HabitHeatmap.tsx
  HabitList.tsx
  HabitRow.tsx
  HabitForm.tsx

src/features/pomodoro/
  PomodoroPage.tsx
  PomodoroStats.tsx
  PomodoroChart.tsx
  PomodoroSessionList.tsx
```

## 7. 边界与错误

- 无习惯：热力与列表空态 + 引导新建
- 全部归档：活跃空列表，可显示归档
- 打卡/保存失败：toast
- 图表无数据：空态，不坏轴
- 窄屏：单列滚动；底栏含番茄（可横滑）

## 8. 验收

1. 习惯新建 → 热力有点 → 连续天数更新 → 归档后默认隐藏且历史可查
2. 单习惯热力补打/撤销与主页卡一致
3. 番茄完成后统计数字与趋势、会话列表更新
4. 可从导航进入 `/habits`、`/pomodoro`；无 features 直连 `db`
5. `pnpm typecheck && pnpm lint && pnpm test` 通过

## 9. 依赖

- 已有：Recharts、`@dnd-kit`、lucide、`habitIcons`、番茄 Zustand store
- 无强制新依赖
