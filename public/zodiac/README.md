# 十二生肖 · 传统剪纸 SVG

由参考剪纸图按 3×4 网格裁切后矢量化（potrace），镂空为 `fill-rule="evenodd"` 透明孔。

| 文件 | 生肖 |
| --- | --- |
| `shu.svg` | 鼠 |
| `niu.svg` | 牛 |
| `hu.svg` | 虎 |
| `tu.svg` | 兔 |
| `long.svg` | 龙 |
| `she.svg` | 蛇 |
| `ma.svg` | 马 |
| `yang.svg` | 羊 |
| `hou.svg` | 猴 |
| `ji.svg` | 鸡 |
| `gou.svg` | 狗 |
| `zhu.svg` | 猪 |

- 源色：`#c41e3a`
- 年视图水印：`/zodiac/{key}.svg`
- 渲染方式：年视图把这批 SVG 当 **CSS mask** 使用，用 `bg-primary` 填充，
  所以水印颜色跟随主题（浅色 `#7c3aed` / 深色 `#8b5cf6`）。
  SVG 自身保留红色，仅作源文件；不要直接 `<img>` 引用，否则颜色写死。
