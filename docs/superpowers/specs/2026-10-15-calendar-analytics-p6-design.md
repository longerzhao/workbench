# P6 日历 + 看板 · 设计规格

> 日期：2026-10-15 · 状态：已实现

## 1. 目标

把 `/#/calendar`、`/#/analytics` 从占位页升级为可用全页；主页「今日日程」「本周趋势」继续共用同一套 repository。

**范围内（完整 P6 · 方案 A）**

1. 日历月视图 + 周视图；日程表单 CRUD（无拖拽改期、无重复、无跨天）
2. URL：`?view=month|week&date=YYYY-MM-DD`
3. 看板四图：待办完成量趋势、专注时长趋势、习惯本周达成、项目未完成分布
4. 功能切片；聚合纯函数可测

**范围外**

- 拖拽改期、拉伸时长、重复规则、跨天事件
- 图表导出、高效时段热力、第三方日历同步
- 月格内展示待办到期日（避免范围膨胀）
- ⌘K（P7）

## 2. 架构决策

采用 **双功能切片 + 共用聚合纯函数**：

| 层 | 职责 |
| --- | --- |
| `eventRepo` | 日程唯一写库 |
| todo / pomodoro / habit / project repos | 看板只读聚合 |
| `lib/calendarGrid.ts` | 月矩阵、周范围、HH:mm 校验 |
| `lib/analyticsStats.ts` | 习惯周达成、项目积压 |
| `features/calendar/*` | 日历页 |
| `features/analytics/*` | 看板页 |

- 视图状态：hash query（`view`、`date`）
- 弹层/草稿：React state
- 不新建日历/看板 Zustand store
- features **禁止** `import { db }`
- 周视图小时带：默认 **06:00–22:00**；全天事件置顶条
- 重叠事件：简单叠放/轻微左偏移，不做完整避让

## 3. 路由与 URL

| 路径 | 参数 | 默认 |
| --- | --- | --- |
| `/#/calendar` | `view=month\|week`，`date=YYYY-MM-DD` | `month`，今天 |
| `/#/analytics` | 可选 `days=14\|30` | `14` |

导航项已存在，无需新增。

## 4. 页面布局与交互

### 4.1 日历

```
顶栏：⟨ ⟩ · 标题（月/周）· [月][周] · 今天 · +新建
月：日一二… 格子内 ≤2～3 条摘要 +「+N」；点格新建；点事件编辑
周：全天条 + 06–22 时间轴；点空白/事件打开表单
```

表单字段：标题*、日期、全天、开始/结束、颜色、备注、删除（编辑时）。  
校验：标题非空；非全天时 `end > start`。

主页 `ScheduleCard`：可链到 `/calendar`（带今日 date）。

### 4.2 看板

```
┌ 完成量趋势 ┬ 专注时长趋势 ┐  顶栏切换近 14/30 天
├ 习惯本周达成 ─────────────┤
├ 项目未完成分布 ───────────┤
└───────────────────────────┘
```

- 习惯：仅未归档；展示 本周打卡数 / targetPerWeek
- 项目：各项目 `done=false` 计数；无 `projectId` →「收件箱」
- 各图独立空态

## 5. 数据与 Repo

不改 schema。`CalendarEvent` 沿用现字段。

**沿用**

- `eventRepo.listByDate` / `listBetween` / `create` / `update` / `remove`
- `todoRepo.dailyCompletedSeries` / `listOpen`
- `pomodoroRepo.dailySeries`
- `habitRepo.listActive` + logs / matrix
- `projectRepo.listAll`

**可选扩展**

- `eventRepo.get(id)`（若深链需要）

**纯函数**

- `buildMonthCells(year, month)` → 周行列（含上/下月补位标记）
- `weekDates(anchor)` → 周一～周日
- `isValidTimeRange(start, end, allDay)`
- `habitWeekProgress(...)` / `openTodosByProject(...)`

## 6. 目录结构

```
src/lib/calendarGrid.ts
src/lib/calendarGrid.test.ts
src/lib/analyticsStats.ts
src/lib/analyticsStats.test.ts

src/features/calendar/
  CalendarPage.tsx
  useCalendarQuery.ts
  MonthView.tsx
  WeekView.tsx
  EventForm.tsx

src/features/analytics/
  AnalyticsPage.tsx
  CompletedTrendChart.tsx
  FocusTrendChart.tsx
  HabitWeekChart.tsx
  ProjectOpenChart.tsx
```

## 7. 边界与错误

- 无日程 / 无统计数据：空态引导
- 非法时间：toast，不写库
- 保存失败：toast，保留弹层草稿

## 8. 验收

1. 月/周与 date 刷新保持；「今天」回到当日
2. 日程 CRUD 与主页今日日程卡一致
3. 看板四图有数正确、无数空态
4. 无 features 直连 `db`
5. `pnpm typecheck && pnpm lint && pnpm test` 通过

## 9. 依赖

已有：Recharts、dayjs、Dexie。不引入 FullCalendar 等重型库。
