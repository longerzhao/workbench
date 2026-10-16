# 日历年视图 · 生肖水印背景

> 日期：2026-10-15 · 状态：已实现

## 1. 目标

在日历 **年视图** 为当前浏览年份叠加对应生肖的半透明剪影水印；切换年份时换图。月/周视图不加。

## 2. 决策

| 项 | 选择 |
| --- | --- |
| 范围 | 仅年视图 |
| 风格 | 半透明单色 SVG 剪影（不抢月历可读性） |
| 资源 | `public/zodiac/*.svg`，剪纸红 `#c41e3a`，由参考剪纸图裁切矢量化 |
| 年份规则 | 公历年 `(year - 4) % 12`，与标题「YYYY年」一致；不按农历春节切年 |
| 主题 | `text-ink` / `currentColor`，明暗通用 |

生肖顺序（index 0–11）：鼠、牛、虎、兔、龙、蛇、马、羊、猴、鸡、狗、猪。  
例：2026 → 马。

## 3. 展示

- `YearView` 内容区相对定位；底层绝对定位 `<img>` 或带 `background-image` 的层
- 居中偏下，约容器宽度 55–65%，`opacity ≈ 0.08`，`pointer-events-none`
- 月历卡片 `relative z-10`，交互不变

## 4. 范围外

- 月/周背景
- 农历春节切生肖
- 位图 / 写实大图
- 用户自定义背景

## 5. 文件

- `src/lib/zodiac.ts` — 映射 + 资源路径
- `src/lib/zodiac.test.ts` — 映射单测
- `public/zodiac/{shu,niu,hu,tu,long,she,ma,yang,hou,ji,gou,zhu}.svg`
- `src/features/calendar/YearView.tsx` — 挂载水印
