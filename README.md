# 个人工作台 · zlong-workbench

本地优先的个人工作台：把**待办 / 笔记 / 日历 / 习惯 / 番茄钟 / 书签 / 数据看板**收进同一个主页面。
纯前端、零后端、无网络请求，数据全部留在你自己的浏览器里。

## 快速开始

```bash
pnpm install
pnpm dev          # http://127.0.0.1:5273
```

首次打开会灌一批示例数据，让主页面立刻是「活的」。想从零开始，用顶栏的
**数据 → 清空本地数据**，之后不会再自动播种。

## 命令

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 启动开发服务器（HMR） |
| `pnpm build` | 类型检查 + 生产构建到 `dist/` |
| `pnpm preview` | 预览构建产物 |
| `pnpm typecheck` | 只跑 `tsc --noEmit` |
| `pnpm lint` | ESLint（含 react-hooks v7 的编译期规则） |
| `pnpm format` | Prettier 格式化 `src/` |
| `pnpm test` | Vitest（当前 `lib/` 下用例待补） |

## 主页面

三栏结构：左侧模块导航 + 今日完成率环，中间 **12 列 Bento 卡片网格**，窄屏自动降级为
两列/单列 + 底部标签栏。

8 张卡片：

| 卡片 | 能直接做的事 |
| --- | --- |
| 今日待办 | 勾选完成、回车快速添加（默认排今天） |
| 番茄钟 | 开始/暂停/继续/放弃，切换专注与休息，关联今日任务 |
| 今日日程 | 看当天时间轴，按时段新增日程 |
| 习惯打卡 | 近 7 天矩阵，点格子即可补打或取消 |
| 快捷入口 | 点击跳转并累计频次，卡片内即可新增 |
| 速记 | 一行输入回车存为笔记，Shift+Enter 换行 |
| 本周趋势 | 近 7 天完成量柱状图 + 专注/打卡汇总 |
| 今日进度 | 常驻侧栏的完成率环、专注时长、连续打卡 |

卡片可以**整卡拖拽重排**（按住拖 8px 以上才触发，所以点击照常穿透到卡内元素），
也可以在**设置**里逐张显示/隐藏、一键重置布局。布局存在浏览器本地。

## 数据与隐私

- 业务数据存在 **IndexedDB**（Dexie），界面偏好存在 **localStorage**
- 全程不发任何网络请求，无账号、无埋点
- 删除是**软删除**，进回收站保留 7 天，超过保留期才清理
- 顶栏 **数据** 菜单支持：
  - **导出备份 JSON** —— 文件名带时间戳
  - **从备份导入** —— zod 校验结构，可选「合并」或「覆盖」；覆盖前会自动先下载一份当前数据的快照
  - **清空本地数据** —— 需二次确认

## 架构

完整设计见 **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**（含技术选型理由、数据模型、分阶段计划，
以及实现期发现并修复的 4 个缺陷记录）。

```
features/*  ──useLiveQuery──►  db/repositories/*  ──►  Dexie / IndexedDB
     └──useUIStore──►  Zustand persist  ──►  localStorage
```

一条硬约束：**组件不允许直接 `import { db }`**，所有读写必须走 `db/repositories/`。
这样统计口径统一、可单测，将来要接后端只需新增一套 `httpXxxRepo` 实现同一接口，UI 零改动。

```
src/
├── app/          # 路由、zustand store（ui / pomodoro / toast）、导航表
├── db/           # Dexie schema、10 张表、7 个 repository、示例数据
├── features/     # dashboard（Bento 网格 + 7 张卡片）、各模块页
├── components/   # ui 原语（Panel/Button/Modal/Dropdown/进度环…）、layout 外壳
├── hooks/        # useLiveQuery 之外的通用 hooks
├── lib/          # date / stats / backup / notify 等纯函数
└── styles/       # Tailwind 4 入口 + 葡萄紫主题令牌
```

## 技术栈

Vite 8 · React 19 · TypeScript 5.9 · Tailwind CSS 4 · Dexie 4 · Zustand 5 ·
react-router 7（hash 路由）· Recharts 3（按需加载）· @dnd-kit · zod 4 · lucide-react

> TypeScript 刻意锁在 5.9：`typescript-eslint@8` 的 peer 范围是 `>=4.8.4 <6.1.0`，TS 7 不在支持范围内。

## 环境注意

本仓库的 `.npmrc` 把 pnpm store 与 npm cache 都指向**工作区内**（`.pnpm-store/`、`.npm-cache/`）：

```ini
store-dir=.pnpm-store
cache=.npm-cache
registry=https://registry.npmmirror.com/
```

如果直接改回全局 store/cache 后 `pnpm install` 报 `EPERM`，多半是 `~/.npm` 下有 root 所有的
残留文件（`sudo chown -R $(id -u):$(id -g) ~/.npm`），而不是项目本身的问题。这两个目录已加进 `.gitignore`。

## 路线图

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| P0 | 脚手架、主题基座 | ✅ |
| P1 | 数据层、仓储、导入导出、示例数据 | ✅ |
| P2 | 主页面：外壳 + Bento 网格 + 8 张卡片 | ✅ |
| P3 | 待办完整列表页（分组/筛选/子任务/回收站） | ✅ |
| P4 | 笔记 Markdown 编辑预览、书签分组管理 | ✅ |
| P5 | 习惯年度热力图、番茄统计 | ✅ |
| P6 | 日历月/周视图、看板多维图表 | ✅ |
| P7 | ⌘K 命令面板、全局快捷键、PWA 离线、单测 | 计划中 |

P3 待办完整页已落地（`/#/todos`：双栏、智能列表、项目、子任务、拖拽、批量、回收站）。
P4 笔记 / 书签页已落地（`/#/notes?id=` 编辑预览 Tab；`/#/bookmarks?group=` 分组 CRUD 与拖拽排序）。
P5 习惯 / 番茄已落地（`/#/habits` 年热力 + 列表；`/#/pomodoro` 统计与会话）。
P6 日历 / 看板已落地（`/#/calendar` 月周视图 + 日程 CRUD；`/#/analytics` 四图）。
其余打磨项见 P7；**核心操作已能在主页面与各模块页完成**，共用同一份数据。
