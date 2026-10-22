# 个人工作台 · zlong-workbench

本地优先的个人工作台：把**待办 / 笔记 / 日历 / 习惯 / 番茄钟 / 倒计时 / 书签 / 数据看板**收进同一个应用。
纯前端、零后端、无网络请求，数据全部留在你自己的浏览器里。

在线版本：<https://longerzhao.github.io/workbench/>

## 快速开始

```bash
pnpm install
pnpm dev
```

打开 **<http://127.0.0.1:5273/workbench/>**（注意路径前缀：`vite.config.ts` 里 `base: '/workbench/'`
是为 GitHub Pages 项目站点设的，访问根路径会被重定向过去）。

首次打开会灌一批示例数据，让主页面立刻是「活的」。想从零开始，用顶栏的
**数据 → 清空本地数据**，之后不会再自动播种。

## 命令

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 启动开发服务器（HMR），127.0.0.1:5273 |
| `pnpm build` | 类型检查 + 生产构建到 `dist/` |
| `pnpm preview` | 预览构建产物 |
| `pnpm typecheck` | 只跑 `tsc --noEmit` |
| `pnpm lint` | ESLint（含 react-hooks v7 的编译期规则） |
| `pnpm format` | Prettier 格式化 `src/` |
| `pnpm test` | Vitest 单跑一轮（`src/**/*.test.ts`，node 环境） |
| `pnpm test:watch` | Vitest watch 模式 |

单测现状：18 个测试文件、153 个用例，全部通过。覆盖 `lib/` 下的纯函数
（过滤、统计、热力图、日历网格、笔记树、农历换算、模糊匹配）以及
`db/repositories/` 的读写行为（用 `fake-indexeddb` 在 node 里跑真实的 Dexie）。

## 主页面

三栏结构：左侧模块导航 + 今日进度环，中间 **12 列 Bento 卡片网格**，窄屏自动降级为
两列/单列 + 底部标签栏（`<768` 单列、`768–1279` 两列、`≥1280` 十二列）。
行高 96px，卡片统一 `rowSpan: 3`，列宽只有 4 列和 6 列两种。

**8 张卡片**：

| 卡片 | 能直接做的事 |
| --- | --- |
| 今日待办 | 勾选完成、回车快速添加（默认排今天） |
| 番茄钟 | 开始/暂停/继续/放弃，切换专注与休息，关联今日任务 |
| 今日日程 | 看当天时间轴，按时段新增日程 |
| 习惯打卡 | 近 7 天矩阵，点格子即可补打或取消 |
| 快捷入口 | 按分组展示常用网址，点击跳转并累计频次 |
| 速记 | 一行输入回车存为笔记，Shift+Enter 换行 |
| 计时 | 最近一个法定假期倒计时，或自定义倒计时/正计时 |
| 本周趋势 | 近 7 天完成量柱状图 + 专注/打卡汇总（带 Recharts，`React.lazy` 按需加载） |

外加**常驻侧栏的「今日进度」**：完成率环 + 今日完成数 + 专注时长 + 连续打卡天数。
它不参与卡片的显隐与排序。

**交互**：卡片头部最左侧有拖拽手柄（hover 时出现），PointerSensor 设了 8px 触发距离，
所以卡片内的点击不会被误判成拖动。设置里可逐张显示/隐藏、一键重置布局；顺序与显隐存在
`workbench:ui`，`index.html` 有一段内联脚本在首屏前读取它，避免深色模式白屏闪烁。

主题三态循环：浅色 → 深色 → 跟随系统。

## 消息中心

侧栏品牌区（窄屏时在顶栏）有一个铃铛，点开是「消息中心」面板，红点表示未读条数。

消息是**派生**出来的，不是存下来的——`lib/messageCenter.ts` 里的纯函数 `buildMessages()`
读当前数据，算出「现在需要关注什么」。所以待办完成了消息自动消失、新增逾期待办消息自动出现，
没有陈旧数据要对账，也不需要 schema 迁移。

六类消息：逾期待办、今天到期、提醒已过仍未处理、日程即将开始（2 小时内）、
习惯今日待打卡、超过 7 天没备份。点任意一条直接跳到对应模块并标记已读。

只有「读过没有」需要记住，它属于界面偏好而非业务数据，存 localStorage
（`workbench:messages`），30 天前的记录在读取时顺手清掉。

## 命令面板与快捷键

侧栏「总览」上方的「搜索 ⌘K」按钮或直接按快捷键，打开一个全局命令面板：

- 模糊搜索待办与笔记（子序列匹配，连续/开头命中权重更高，命中字符高亮）
- 跳转到任意模块
- 输入任意文字后回车，可直接**新建**一条同名待办或笔记——输入「买牛奶」回车，待办就建好了
- 空输入时提供「切换主题」等快捷操作

| 快捷键 | 作用 |
| --- | --- |
| `⌘K` / `Ctrl+K` | 开合命令面板 |
| `/` | 打开搜索 |
| `N` | 直接进入新建（输入标题回车即建） |
| `↑` `↓` | 在结果间移动 |
| `↵` | 执行选中项 |
| `Esc` | 关闭面板 / 弹窗 |

单键快捷键在输入框、文本域和 contenteditable 里会自动让路，不会抢走你正在打的字；
中文输入法组合期间也不触发。

「新建」刻意排在结果列表最后：输入「日历」时，回车应该跳到日历页，而不是建一条叫日历的待办。

## 模块页

| 路由 | 内容 |
| --- | --- |
| `/#/` | 总览（上面的 Bento 网格） |
| `/#/todos` | 双栏：智能列表（今天/本周/收件箱/全部/已完成/回收站）+ 项目；子任务、优先级、标签、拖拽排序、批量改期/归档、回收站恢复 |
| `/#/notes` | 左文件夹树 + 右编辑器；编辑/预览 Tab（`react-markdown`，不解析 raw HTML）、标签、置顶 |
| `/#/calendar` | 月/周/年三视图 + 日程 CRUD；支持跨天事件与重复（每天/每周/每月） |
| `/#/habits` | 年度热力图（全部/单习惯）+ 列表 CRUD、排序、归档、连续天数 |
| `/#/pomodoro` | 今日/本周汇总、趋势、最近会话；计时器仍在主页卡 |
| `/#/countdown` | 法定假期（元旦/春节/清明/劳动节/端午/中秋/国庆，农历与节气由 `lunar-javascript` 算）+ 自定义计时；可改可删，单个节日可隐藏 |
| `/#/bookmarks` | 分组侧栏 + 列表；分组改名/解散、条目 CRUD、组内拖拽、点击计数 |
| `/#/analytics` | 四图：完成量趋势、专注趋势、习惯本周达成、项目未完成分布 |

路由用 `createHashRouter`：静态托管和直接双击 `index.html` 打开都不会 404。

## 数据与隐私

- 业务数据存在 **IndexedDB**（Dexie，库名 `zlong-workbench`），界面偏好存在 **localStorage**
- 全程不发任何网络请求，无账号、无埋点
- **12 张表**：`todos` `projects` `notes` `noteFolders` `habits` `habitLogs`
  `pomodoros` `events` `bookmarks` `countdowns` `meta` `trash`，schema 已迁移到 `version(4)`
- **日历支持跨天与重复**：`events` 用 `endDate` 表达跨天/重复截止，`repeat` 支持每天/每周/每月；
  重复与跨天都在查询时展开成「发生列表」（`lib/eventOccurrence.ts`），不预生成数据行
- **待办支持到期提醒**：展开待办可设提醒时刻，到点弹系统通知 + 提示音
  （`lib/reminders.ts` 全局排程，`hooks/useTodoReminders.ts` 订阅数据）。需在浏览器里授予通知权限；
  提醒是页面级调度，关闭页面后不再补发已错过的提醒
- 删除是**软删除**：实体先落进 `trash` 表，7 天内可撤销，超过保留期在启动时清理
- **离线可用**：注册了 Service Worker，断网后刷新仍能打开页面，数据本来就在本地
- 顶栏 **数据** 菜单支持：
  - **导出备份 JSON** —— 文件名 `workbench-YYYYMMDD-HHmm.json`，含 11 张表（回收站刻意不导出）
  - **从备份导入** —— zod 校验结构，可选「合并」或「覆盖」；覆盖前会自动先下载一份当前数据的快照；
    跨表引用（任务→项目、打卡→习惯、笔记→文件夹）失效的会在入库前自动修复，并提示修复条数
  - **清空本地数据** —— 需二次确认，含回收站；清完会补写 `seededAt` 标记，示例数据不会长回来

## 架构

完整设计见 **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**（含技术选型理由、数据模型、分阶段计划，
以及实现期发现并修复的 4 个缺陷记录）。

```
features/*  ──useLiveQuery──►  db/repositories/*  ──►  Dexie / IndexedDB
     └──useUIStore──►  Zustand persist  ──►  localStorage
```

一条硬约束：**组件不允许直接 `import { db }`**，所有读写必须走 `db/repositories/`。
这样统计口径统一、可单测，将来要接后端只需新增一套 `httpXxxRepo` 实现同一接口，UI 零改动。

9 个仓储：`todoRepo` `projectRepo` `noteRepo` `noteFolderRepo` `habitRepo`
`pomodoroRepo` `eventRepo` `bookmarkRepo` `countdownRepo`。

```
src/
├── app/          # router、lazyPages 路由懒加载表、navigation、store（ui / pomodoro / toast / command）
├── db/           # schema（12 张表 + 4 个版本迁移）、seed 示例数据、9 个 repository（带单测）
├── features/     # dashboard（Bento 网格 + 8 张卡）、todos、notes、calendar、
│                 # habits、pomodoro、countdown、bookmarks、analytics、shell
├── components/   # ui 原语（Panel/Button/Modal/Dropdown/DatePicker/进度环…）、layout 外壳、command 面板
├── hooks/        # useNow / useTheme / useCounts / useClickOutside / useHotkeys
├── lib/          # date / stats / backup / countdown / heatmap / calendarGrid / fuzzy 等纯函数
├── styles/       # Tailwind 4 入口 + 葡萄紫主题令牌
└── types/        # lunar-javascript 的类型声明

public/
├── zodiac/       # 十二生肖剪纸 SVG（年视图水印，作 mask 用）
├── icons/        # PWA 图标 192 / 512
├── manifest.webmanifest
└── sw.js         # Service Worker（手写，无第三方依赖）
```

规模：138 个 `.ts`/`.tsx`（其中 70 个 `.tsx`），约 14,318 行；另有 14 个测试文件。

## 技术栈

Vite 8 · React 19 · TypeScript 5.9 · Tailwind CSS 4 · Dexie 4 · Zustand 5 ·
react-router 7（hash 路由）· Recharts 3（按需加载）· @dnd-kit · zod 4 ·
lunar-javascript（农历/节气）· react-markdown · dayjs · lucide-react ·
Vitest 5 + fake-indexeddb（测试）

> TypeScript 刻意锁在 5.9：`typescript-eslint@8` 的 peer 范围是 `>=4.8.4 <6.1.0`，TS 7 不在支持范围内。

不引入组件库：只有十来个基础组件，自己写更轻、视觉更统一。

## 环境注意

本仓库的 `.npmrc` 把 pnpm store 与 npm cache 都指向**工作区内**（`.pnpm-store/`、`.npm-cache/`）：

```ini
store-dir=.pnpm-store
cache=.npm-cache
registry=https://registry.npmmirror.com/
strict-peer-dependencies=false
```

如果直接改回全局 store/cache 后 `pnpm install` 报 `EPERM`，多半是 `~/.npm` 下有 root 所有的
残留文件（`sudo chown -R $(id -u):$(id -g) ~/.npm`），而不是项目本身的问题。这两个目录已加进 `.gitignore`。

**构建产物**：各页面已按路由拆成独立 chunk，不再有 chunk 体积警告。
首屏只加载两个块——`index-*.js 449 kB（gzip 142 kB）` 与共享依赖块
`471 kB（gzip 155 kB）`，合计 gzip 约 297 kB；recharts（352 kB）跟着看板页、
react-markdown（135 kB）跟着笔记页按需加载。

## 部署

`.github/workflows/pages.yml`：push 到 `main` → Node 22 + pnpm 10 → `pnpm install --frozen-lockfile`
→ `pnpm build` → 上传 `dist` 发布到 GitHub Pages。`vite.config.ts` 的 `base` 必须与仓库名一致。

## 安装与离线

- 桌面 Chrome / Edge：地址栏右侧「安装」；Android Chrome：「添加到主屏幕」；iOS Safari：共享 →「添加到主屏幕」
- Service Worker **只在生产构建注册**，开发环境不注册（否则会把 HMR 的请求也缓存住）
- 策略：导航请求 network-first 回退缓存的 `index.html`，带 hash 的静态资源 cache-first
- 数据全在 IndexedDB，不经过网络，所以离线的关键只是「页面能打开」
- 发版若改了页面结构，升一下 `public/sw.js` 里的 `VERSION`，`activate` 会清掉旧缓存

## 进度

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| P0 | 脚手架、主题基座 | ✅ |
| P1 | 数据层、仓储、导入导出、示例数据 | ✅ |
| P2 | 主页面：外壳 + Bento 网格 + 卡片 | ✅ |
| P3 | 待办完整列表页（分组/筛选/子任务/回收站） | ✅ |
| P4 | 笔记 Markdown 编辑预览、书签分组管理 | ✅ |
| P5 | 习惯年度热力图、番茄统计 | ✅ |
| P6 | 日历月/周/年视图、看板多维图表 | ✅ |
| P6.5 | 倒计时/正计时 + 法定节假日、生肖年视图 | ✅ |
| P7 | ⌘K 命令面板、全局快捷键、仓储层测试、PWA 离线、主包分包 | ✅ |
| P8 | 日历跨天/重复事件、待办到期提醒（通知） | ✅ |
| P9 | 消息中心（铃铛 + 派生消息面板） | ✅ |

P7 已完成：命令面板（含模糊搜索、跳转、输入即新建）、全局快捷键、36 个仓储层用例、
manifest + 手写 Service Worker、按路由拆分 chunk。**核心操作都能在主页面与各模块页完成**，
共用同一份数据。
