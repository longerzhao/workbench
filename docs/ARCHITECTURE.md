# 个人工作台 · 方案与架构设计

> 版本 v1（待评审）· 目录 `/Users/zlong/workspace/ws_zlong/zlong`

## 1. 目标与范围

**一句话**：一个纯本地、零后端、打开即用的个人工作台，把「待办 / 笔记 / 日历 / 习惯 / 番茄钟 / 书签 / 数据看板」收进同一个主页面。

**核心原则**

| 原则 | 说明 |
| --- | --- |
| 本地优先 | 数据全部留在浏览器（IndexedDB），不发任何网络请求，隐私可控 |
| 主页面即入口 | Dashboard 不是导航页，而是各模块的「活摘要」，在这里就能完成 80% 的日常操作 |
| 可迁移 | 一键导出/导入 JSON，换设备/换浏览器不丢数据 |
| 分层解耦 | 数据访问统一走 Repository 层，未来接后端只换实现，不动 UI |

**v1 范围内**：待办、笔记、日历/日程、习惯打卡、番茄钟、书签、数据看板、主页面布局、导入导出、明暗主题。

**v1 范围外（预留）**：多用户、云同步、协作、移动端 App、富文本所见即所得编辑器、第三方日历双向同步。

---

## 2. 技术选型

已确认：**Vite + React + TypeScript 纯前端单页 + 浏览器本地存储**。

| 层 | 选型 | 版本 | 理由 |
| --- | --- | --- | --- |
| 构建 | Vite | 8.x | 冷启动秒级，HMR 快，配置极简 |
| 框架 | React | 19.x | 生态最全，后续接任何库都不缺方案 |
| 语言 | TypeScript | 5.9.x | 见下方说明 |
| 样式 | Tailwind CSS + `@tailwindcss/vite` | 4.x | v4 用 CSS-first 配置，无需 `tailwind.config.js`；主题用 CSS 变量切换明暗 |
| 路由 | react-router-dom | 7.x | `createHashRouter`，静态托管/`file://` 直接打开都不 404 |
| 本地库 | Dexie | 4.x | IndexedDB 的类型化封装，支持索引查询与版本迁移 |
| 响应式查询 | dexie-react-hooks | 4.x | `useLiveQuery` 让 UI 跟随 DB 自动更新，省掉一整套状态同步代码 |
| UI 偏好状态 | Zustand + persist | 5.x | 主题、侧栏折叠、看板卡片布局等短期状态；持久化到 localStorage |
| 图表 | Recharts | 3.x | React 声明式，做迷你趋势图/环形图够用且体积可控 |
| 图标 | lucide-react | 1.x | 线性风格统一，tree-shaking 友好 |
| 日期 | dayjs | 1.x | 2KB，中文 locale 开箱即用 |
| 拖拽 | @dnd-kit | latest | 待办排序 + 看板卡片重排 |
| 校验 | zod | 4.x | 导入 JSON 时做结构校验，防止脏数据写进 DB |
| 测试 | Vitest + Testing Library | 5.x | 与 Vite 同源配置，零额外接入成本 |
| 代码规范 | ESLint(flat) + typescript-eslint + Prettier | 8.x | 统一风格 |

**关于 TypeScript 版本**：registry 上 `latest` 已是 7.0（原生 Go 编译器），但 `typescript-eslint` 8.x 的类型感知规则尚未覆盖 7.x。新项目追求稳定，v1 锁定 **TS 5.9.x**，等工具链跟上再升 7。

**明确不引入**：组件库（Ant Design / MUI / shadcn）。工作台只有十来个基础组件，自己写反而更轻、视觉更统一。若后期需要，`components/ui/` 已按可替换方式组织。

---

## 3. 总体架构

```
┌──────────────────────────────────────────────────────────────┐
│  表现层  features/*  (页面 + 模块组件)                        │
│  dashboard · todos · notes · calendar · habits · pomodoro     │
│  bookmarks · analytics                                        │
└───────────────┬──────────────────────────┬───────────────────┘
                │ hooks                    │ zustand (UI 偏好)
┌───────────────▼──────────────┐  ┌────────▼───────────────────┐
│  数据访问层  db/repositories  │  │  app/store  (persist)      │
│  唯一读写入口，封装业务语义    │  │  theme / layout / pomodoro │
└───────────────┬──────────────┘  └────────────────────────────┘
                │
┌───────────────▼──────────────┐  ┌────────────────────────────┐
│  存储层  Dexie → IndexedDB    │  │  lib/backup  导出/导入 JSON │
│  db/schema.ts (表 + 索引 + 迁移)│ │  lib/stats   纯函数统计      │
└──────────────────────────────┘  └────────────────────────────┘
```

**关键约束**：组件不允许直接 `import { db }`。所有数据操作必须经过 `repositories/`，这样统计口径统一、可单测、可换存储。

---

## 4. 目录结构

```
zlong/
├── index.html
├── package.json
├── vite.config.ts            # @ 别名 / Tailwind 插件
├── tsconfig.json
├── eslint.config.js
├── .npmrc                    # store-dir / cache 指向工作区内（见 §10）
├── docs/ARCHITECTURE.md
└── src/
    ├── main.tsx
    ├── App.tsx               # 路由出口 + 全局布局
    ├── app/
    │   ├── router.tsx        # createHashRouter 路由表
    │   ├── providers.tsx     # 主题 / Toast / 全局快捷键
    │   └── store/
    │       ├── ui.ts         # 主题、侧栏、看板布局（persist）
    │       └── pomodoro.ts   # 计时器运行时状态（persist）
    ├── db/
    │   ├── index.ts          # Dexie 实例
    │   ├── schema.ts         # 表定义 + 类型 + 版本迁移
    │   └── repositories/
    │       ├── todoRepo.ts
    │       ├── noteRepo.ts
    │       ├── habitRepo.ts
    │       ├── pomodoroRepo.ts
    │       ├── eventRepo.ts
    │       └── bookmarkRepo.ts
    ├── features/
    │   ├── dashboard/        # ★ 主页面：Bento 卡片编排
    │   │   ├── DashboardPage.tsx
    │   │   ├── layout.ts     # 卡片注册表 + 默认布局
    │   │   └── cards/        # TodoCard / PomodoroCard / HabitCard ...
    │   ├── todos/            # pages / components / hooks
    │   ├── notes/
    │   ├── calendar/
    │   ├── habits/
    │   ├── pomodoro/
    │   ├── bookmarks/
    │   └── analytics/
    ├── components/
    │   ├── ui/               # Button Card Modal Input Checkbox Tabs Toast Empty
    │   ├── layout/           # AppShell Sidebar TopBar
    │   └── command/          # Cmd+K 命令面板
    ├── hooks/                # useHotkeys useNow useTheme useInterval useBackup
    ├── lib/
    │   ├── date.ts           # dayjs 封装、周起止、相对时间
    │   ├── id.ts             # crypto.randomUUID
    │   ├── stats.ts          # 纯函数：完成率、连续打卡、趋势聚合
    │   ├── backup.ts         # 导出/导入 + zod 校验
    │   └── cn.ts             # className 合并
    └── styles/index.css      # Tailwind 入口 + 主题 CSS 变量
```

---

## 5. 数据模型

Dexie 表定义（`src/db/schema.ts`，`&` 为唯一索引，`*` 为多值索引，`[a+b]` 为复合索引）：

```ts
db.version(1).stores({
  todos:     '&id, dueDate, projectId, order, createdAt, completedAt',
  projects:  '&id, order',
  notes:     '&id, updatedAt, createdAt, *tags',
  habits:    '&id, order',
  habitLogs: '&id, habitId, date, [habitId+date]',
  pomodoros: '&id, date, type, todoId, startedAt',
  events:    '&id, date, start',
  bookmarks: '&id, group, order, clicks',
  meta:      '&key',
  trash:     '&id, table, deletedAt',
});
```

> **实现期修正**：原方案给 `done` / `pinned` / `archived` 建了索引，这是错的。
> IndexedDB 的键只能是 number / string / Date / 二进制 / 数组，**布尔值不是合法键**，
> 这些索引里永远不会有条目。已从索引列表移除，改为 JS 过滤（个人数据量下完全够用）。

| 实体 | 字段 | 说明 |
| --- | --- | --- |
| `Todo` | id, title, note?, done, priority(0-3), dueDate?(YYYY-MM-DD), projectId?, tags[], subtasks[], order, createdAt, updatedAt, completedAt? | `order` 为浮点，拖拽插入取前后均值，避免全表重排 |
| `Note` | id, title, content(Markdown), tags[], pinned, createdAt, updatedAt | Dexie 存全文，列表页只渲染摘要，避免长文卡顿 |
| `Project` | id, name, color, order | 待办分组 |
| `Habit` | id, name, icon, color, targetPerWeek, archived, order, createdAt | |
| `HabitLog` | id, habitId, date, count | 唯一键 `[habitId+date]`，打卡即 upsert |
| `Pomodoro` | id, type('focus'\|'break'), durationSec, startedAt, endedAt?, todoId?, completed | 看板的番茄统计与「专注时长」都源于此表 |
| `Event` | id, title, date(YYYY-MM-DD), start(HH:mm), end(HH:mm), allDay, color, note?, createdAt | 用「日期 + 时刻字符串」而非 ISO 起止：渲染日时间轴更直接，且无时区坑。代价是暂不支持跨天事件 |
| `Bookmark` | id, title, url, icon?, group, order, clicks | `clicks` 用于「常用自动置顶」 |

**设计要点**

1. **软删除**：删除的实体进 `db.deleted`（`{table, id, payload, deletedAt}`），7 天内可撤销；这也让导入导出可以做增量合并。
2. **迁移**：每次结构变更追加 `db.version(n).stores({...}).upgrade(...)`，不做破坏性覆盖。
3. **时间格式**：日期型字段统一 `YYYY-MM-DD` 字符串（可索引、可排序、无时区坑）；时刻型字段统一 ISO 字符串。

---

## 6. 主页面（Dashboard）布局

**这是本次要交付的重点。** 定位是「一天的作战室」，不是导航页。

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 早上好，zlong · 10月15日 周三        ⌘K 搜索   ◐ 主题   ⇅ 数据   ⚙ 设置      │
├──────────┬─────────────────────────────────────────────────────────────────┤
│          │ ┌───────────────┐ ┌──────────────┐ ┌────────────────────────┐  │
│ 总览  ◉  │ │ 今日待办   3/5│ │   番茄钟      │ │ 今日日程                │  │
│ 待办  5  │ │ ☐ 写工作台方案│ │   ╭──────╮    │ │ 09:30 ● 站会           │  │
│ 笔记 12  │ │ ☐ 评审 PR #42 │ │   │ 25:00│    │ │ 14:00 ● 需求评审        │  │
│ 日历     │ │ ✓ 晨会同步    │ │   ╰──────╯    │ │ 19:00 ● 健身            │  │
│ 习惯     │ │ ✓ 回复邮件    │ │  ▶ 开始专注   │ │ + 新建日程              │  │
│ 书签     │ │ + 快速添加…   │ │  🍅 今日 4 个 │ │                        │  │
│ 看板     │ └───────────────┘ └──────────────┘ └────────────────────────┘  │
│          │ ┌─────────────────────────────┐ ┌────────────────────────────┐  │
│ ╭──────╮ │ │ 习惯打卡 · 近 7 天            │ │ 快捷入口                    │  │
│ │今日  │ │ │ 阅读  ● ● ○ ● ● ● ○  4/7    │ │ [GitHub][Figma][Jira]      │  │
│ │ 62%  │ │ │ 运动  ● ○ ● ● ○ ● ●  4/7    │ │ [语雀][掘金][邮箱]         │  │
│ │完成率│ │ │ 早起  ● ● ● ● ● ○ ●  6/7    │ │ + 添加                     │  │
│ ╰──────╯ │ └─────────────────────────────┘ └────────────────────────────┘  │
│          │ ┌─────────────────────────────┐ ┌────────────────────────────┐  │
│ 本周专注 │ │ 速记                        │ │ 本周完成趋势                │  │
│ 6h 20m   │ │ ┌─────────────────────────┐ │ │   ▁▃▅▂▆▇▄                  │  │
│ 连续打卡 │ │ │ 记点什么…           ⏎  │ │ │  待办 18 · 专注 12 · 打卡21 │  │
│ 12 天    │ │ └─────────────────────────┘ │ │                            │  │
│          │ └─────────────────────────────┘ └────────────────────────────┘  │
└──────────┴─────────────────────────────────────────────────────────────────┘
```

**布局机制**

- CSS Grid 12 列 + 行高 88px 的**Bento 网格**，每张卡片声明 `{ id, w, h, minW, minH }`。
- 卡片在 `features/dashboard/layout.ts` 里集中注册，顺序/尺寸存 `app/store/ui.ts`，用户可拖拽重排与增删卡片。
- 每张卡是**自包含**的：自己用 `useLiveQuery` 拉数据、自己有加载态（骨架屏）与空态（Empty 组件）。Dashboard 只负责摆位，不聚合数据。
- 顶栏左侧问候语按当前时段变化（早上好/下午好/晚上好），右侧是全局操作。

**响应式断点**

| 宽度 | 布局 |
| --- | --- |
| ≥ 1280px | 三栏：侧栏 + 主网格 + 可选右栏（放「今日焦点」便签） |
| 768–1280px | 两栏：图标态侧栏 + 自适应网格（卡片跨列收窄） |
| < 768px | 单列卡片流 + 底部 Tab 栏，番茄钟降级为顶部悬浮条 |

---

## 7. 数据流与状态管理

```
组件 ──useLiveQuery(() => todoRepo.listToday())──► Repository ──► Dexie/IndexedDB
   ▲                                                                    │
   └──────────────── 索引变更自动重渲染（无需手动同步） ◄─────────────────┘

组件 ──useUIStore(s => s.theme)──► Zustand + persist ──► localStorage
```

**三档状态，各司其职**

| 档位 | 存哪 | 内容 | 例子 |
| --- | --- | --- | --- |
| 业务数据 | IndexedDB | 实体 CRUD | 待办、笔记、打卡记录 |
| UI 偏好 | localStorage (zustand persist) | 跨会话的界面选择 | 主题、侧栏折叠、看板布局、番茄时长配置 |
| 运行态 | React 内存 | 瞬时状态 | 表单草稿、弹窗开关、选中项 |

**为什么用 `useLiveQuery` 而不是自建 store**：IndexedDB 是唯一数据源，UI 是它的投影。省掉了「本地 state ↔ 持久化」双向同步这一整类 bug（多标签页同时打开也不会数据错乱——Dexie 会广播变更）。

---

## 8. 关键交互设计

| 交互 | 行为 |
| --- | --- |
| `⌘K` / `Ctrl+K` | 命令面板：模糊搜索待办/笔记，或执行「新建待办」「跳到日历」「切换主题」 |
| `N` | 在当前模块新建条目（无焦点时生效） |
| `Esc` | 关闭弹窗 / 面板 |
| 卡片快速添加 | 待办卡输入框回车即入库，不跳页、不弹窗 |
| 拖拽 | 待办在同组内重排；看板卡片可重排与缩放，布局自动持久化 |
| 番茄钟 | 用 `startedAt + duration` 计算剩余，**不靠 setInterval 累加**；刷新/休眠后仍准确；结束时浏览器通知 + 声音 |
| 数据备份 | 「数据」按钮导出 `workbench-YYYYMMDD.json`（带 `version` 字段）；导入时 zod 校验，提供「合并 / 覆盖」两选项，覆盖前自动落地一份快照 |

---

## 9. 分阶段实施计划

| 阶段 | 内容 | 产出（可验证） |
| --- | --- | --- |
| **P0 脚手架** | Vite+React+TS 初始化、Tailwind 4、路径别名、ESLint/Prettier、主题 CSS 变量 | `pnpm dev` 打开是带明暗切换的空壳 |
| **P1 数据层** | Dexie schema + 6 个 repository + 导出/导入 + seed 示例数据 | 控制台可 CRUD；导出 JSON 能再导回 |
| **P2 主页面 ★** | AppShell（侧栏/顶栏）+ Bento 网格 + 8 张卡片（含空态/骨架屏）+ 布局持久化 | **主页面可用**：勾待办、开番茄、打卡、速记、点书签全部生效 |
| **P3 待办模块** | 完整列表页、项目分组、优先级、筛选排序、子任务、拖拽 | ✅ 待办页与主页面数据一致 |
| **P4 笔记 + 书签** | Markdown 编辑预览、标签、分组管理 | ✅ 笔记/书签全页与主页卡片共用 repo |
| **P5 习惯 + 番茄** | 习惯管理、日历热力图、番茄统计与设置 | ✅ `/habits` 热力+CRUD；`/pomodoro` 统计 |
| **P6 日历 + 看板** | 月/周视图、日程 CRUD、Recharts 图表（趋势/分布/热力） | ✅ `/calendar` + `/analytics` |
| **P7 打磨** | 命令面板、全局快捷键、PWA 离线、Vitest 覆盖 `lib/` 与 repositories | |

**本次交付 P0 + P1 + P2**，即「能跑起来、有数据、主页面真正能用」。P3 之后的模块页先落路由占位，主页面卡片已可直接操作，避免做成空壳。

---

## 10. 环境注意事项

1. **依赖安装路径必须改到工作区内**。当前 shell 对 `$HOME` 无写权限，pnpm/npm 默认的全局 store 与 cache（`~/.npm/_cacache` 等）会直接 `EPERM` 失败。项目内 `.npmrc` 固定：
   ```ini
   store-dir=.pnpm-store
   cache=.npm-cache
   registry=https://registry.npmmirror.com/
   ```
   `.pnpm-store/`、`.npm-cache/` 一并写进 `.gitignore`。（已验证该方式可正常拉取依赖。）
2. **版本锁定**：首次安装后提交 `pnpm-lock.yaml`；TS 固定 5.9.x。
3. **浏览器要求**：IndexedDB、`crypto.randomUUID`、CSS Grid，现代浏览器均支持。

---

## 11. 风险与预留扩展点

| 风险 | 应对 |
| --- | --- |
| 数据只在本机，浏览器清缓存即丢 | 导入导出 + 「上次备份超过 7 天」提醒徽标；P7 可加 File System Access API 直写本地文件 |
| IndexedDB 容量与性能 | 笔记全文不参与列表查询；超过 5MB 提示；Repository 层已抽象，可平滑切到 OPFS/SQLite-WASM |
| 卡片多了主页面变慢 | 每张卡独立 `useLiveQuery` 与懒加载，重卡片（图表）用 `React.lazy` + 视口内渲染 |
| 未来要做多端同步 | Repository 层就是接缝：新增 `httpTodoRepo` 实现同一接口即可，UI 零改动 |
| 番茄钟后台计时被浏览器节流 | 一律用时间戳差值计算，不依赖定时器累加 |

---

## 12. 已确认的决策

| # | 决策 |
| --- | --- |
| 1 | **卡片清单**：8 张全部落地（今日待办 / 番茄钟 / 今日日程 / 习惯打卡 / 快捷入口 / 速记 / 本周趋势 + 常驻侧栏的今日进度） |
| 2 | **项目名** `zlong-workbench`，界面标题「个人工作台」 |
| 3 | **主色**：葡萄紫（grape）取代原定的靛蓝，浅色用 `#7c3aed`，深色提亮到 `#8b5cf6` |

---

## 13. 实现记录（P0–P2 已完成）

### 13.1 与原方案的偏差

| 项 | 原方案 | 实现 | 原因 |
| --- | --- | --- | --- |
| 日程时间 | `start` / `end` 为 ISO | `date` + `start`/`end` 为 `HH:mm` | 日时间轴渲染更直接、无时区坑；跨天事件延后支持 |
| 卡片尺寸 | 卡片可自由缩放 | 统一 `rowSpan: 3`，仅列宽分 4/6 两种 | 行高统一后拖拽重排不会留下空洞；自由缩放的收益不抵复杂度 |
| 拖拽手柄 | 未定 | 整卡可拖 + 8px 触发距离 | 卡片头部右侧已被各卡自己的操作按钮占用，独立手柄无处安放；8px 阈值保证点击仍能穿透到卡内元素 |
| ⌘K 命令面板 | P7 | **未实现** | 宁可不做，也不放一个点了没反应的按钮。顶栏相应位置留空 |
| TS 版本 | 5.9.x | 5.9.3（锁定） | 验证到 `typescript-eslint@8` 的 peer 范围是 `typescript >=4.8.4 <6.1.0`，**TS 7 直接不在支持范围内** |
| 图标库 | lucide-react | 同，但注意 v1 改名 | `Trash2`→`Trash`、`MoreHorizontal`→`Ellipsis`、`BarChart3`→`ChartColumn`、`Loader2`→`LoaderCircle` |

### 13.2 实现中发现并修复的缺陷

这四个都是**跑起来才暴露**的问题，静态检查（tsc / eslint）全部无法发现：

1. **布尔字段建索引无效**（P1）
   IndexedDB 的键不支持布尔值，`done` / `pinned` / `archived` 的索引永远是空的。
   已移除这些索引，改为 JS 过滤。

2. **卡片溢出并压住下方卡片**（P2，视觉缺陷）
   栅格轨道是 96px × 3 = 320px，但内层 `<section class="card">` 没被撑满、按内容自适应：
   「今日待办」内容高 442px，**已经溢出压到下面的卡片上**。
   修复：Panel 加 `h-full`，让卡片填满它被给定的盒子。
   实测修复后 7 张卡片高度统一为 320px，溢出量 0。

3. **中途放弃的番茄被按计划时长结算**（P2，数据正确性）
   `abandon()` 在 running 状态下把 elapsed 记为 0 并传 `undefined`，导致记录保留完整的
   1500 秒计划时长；而「今日专注时长」会把这个从未发生的 25 分钟算进去。
   修复：按 `durationSec - 剩余` 结算真实秒数；同时把聚合口径收紧为**只统计已结束（有 endedAt）的会话**，
   进行中的一轮不再提前计入。

4. **通知权限挂起会让番茄钟永远启动不了**（P2，功能阻塞）
   `handleStart` 里 `await requestNotificationPermission()`：浏览器处于 `default` 权限态时，
   权限提示框不返回，`await` 永不 resolve，计时器根本起不来。
   修复：申请照常发起（保留用户手势有效性），但**不 await**，计时立即开始。

### 13.3 实测验证结果

在真实 Chromium 中跑完的验证（非仅静态检查）：

| 项 | 结果 |
| --- | --- |
| 首屏渲染 | 7 张卡片全部就位，示例数据填充，无 JS 报错 |
| 页面级横向溢出 | 0（1440 / 900 / 420 三种宽度） |
| 响应式断点 | 1440 → 12 列 + 侧栏；900 → 2 列 + 底部标签栏；420 → 1 列 |
| 卡片高度一致性 | 7 张全部 320px，溢出 0 |
| 滚动容器 | `main` 内部滚动（1032 > 844），页面本身不滚动 |
| 主题 | 浅色 `#7c3aed` / 深色 `#8b5cf6` 切换正常，循环回「跟随系统」 |
| 待办勾选 | 徽标 `2/8 → 3/8`，完成后自动移出今日列表 |
| 习惯打卡 | `aria-pressed` false → true → false，可补打可撤销 |
| 速记录入 | 回车落库并出现在最近列表 |
| 番茄钟状态机 | 待开始 → 进行中 → 已暂停(继续) → 进行中 → 放弃 |
| 放弃结算 | 专注时长保持 `50m`，**不是**旧逻辑会产生的 `1h 15m` |
| 卡片显隐 | 设置里关掉「今日日程」后该卡消失，重新打开后恢复 |
| 颜色令牌 | `--canvas` 深色 `#100e16`、浅色卡片 `#ffffff` 均正确解析 |

> 说明：`getComputedStyle(document.body).backgroundColor` 读数为 `transparent`，
> 这是 CSS 规范的 canvas 传播行为（body 背景被提升到视口画布），不是缺陷；
> 视觉背景由该传播值加上 AppShell 的 `bg-canvas` 共同提供。

### 13.4 P3 待办模块（已完成）

- `/#/todos` 双栏：智能列表（今天/本周/收件箱/全部/已完成/回收站）+ 项目
- URL `?view=&project=` 驱动视图；行内展开编辑；子任务；拖拽 `reorderWithin`
- 批量改期 / 优先级 / 移项目 / 归档（软删除）；回收站恢复与清空
- 过滤纯函数与 Vitest：`src/lib/todoFilters.ts`

### 13.5 P4 笔记 + 书签（已完成）

- `/#/notes?id=`：左列表 + 右编辑器；编辑 / 预览 Tab（`react-markdown`，无 raw HTML）；标签、置顶、软删
- `/#/bookmarks?group=`：左分组侧栏 + 右列表；分组改名/解散；条目 CRUD；组内拖拽 `reorderInGroup`；点击 `recordClick` + 外开；字母图标
- 纯函数：`src/lib/noteText.ts`、`src/lib/bookmarkUi.ts`

### 13.6 P5 习惯 + 番茄（已完成）

- `/#/habits`：年度热力图（全部/单习惯）+ 列表 CRUD、排序、归档、连续天数
- `/#/pomodoro`：今日/本周汇总、近 14/30 天趋势、最近会话；计时仍在主页卡
- 纯函数：`src/lib/habitStats.ts`、`src/lib/heatmap.ts`

### 13.7 P6 日历 + 看板（已完成）

- `/#/calendar?view=&date=`：月/周视图；日程表单 CRUD（无拖拽/重复/跨天）
- `/#/analytics?days=`：完成量、专注、习惯本周达成、项目未完成分布
- 纯函数：`src/lib/calendarGrid.ts`、`src/lib/analyticsStats.ts`

### 13.8 仍未完成（后续阶段）

- **P7 打磨**：⌘K 命令面板、全局快捷键、PWA 离线、Vitest 覆盖补齐

数据层与各业务全页已就位；P7 侧重命令面板、快捷键与 PWA。

