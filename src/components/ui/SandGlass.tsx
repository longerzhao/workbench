import { useId } from 'react';

export interface SandGlassProps {
  /** 上球剩余比例 0–1（纯装饰刻度，不映射真实天数） */
  fraction: number;
  /** 沙的颜色，取自倒计时自身的颜色 */
  color: string;
  size?: number;
  className?: string;
  /** 无障碍描述，如「发薪 还有 12 天」 */
  label: string;
}

/**
 * 沙漏图形：上球剩余 = 尚未消逝的时间，下球堆积 = 已经流走的。
 * 相比环形进度，它同时说出"还剩多少"和"已过多少"两件事。
 *
 * 玻璃腔用三次贝塞尔曲线画出连续的 S 形收腰，底部圆弧收口，
 * 下球沙堆做成平顶缓坡而非尖锥，玻璃左壁留一道柔光高光。
 */
export function SandGlass({ fraction, color, size = 100, className, label }: SandGlassProps) {
  const uid = useId().replace(/:/g, '');
  const clamped = Math.max(0, Math.min(1, fraction));

  const W = 112;
  const H = 128;
  const cx = 56;
  const topY = 14;
  const neckY = 64;
  const botY = 114;
  const R = 38;
  const neck = 4.2;

  const upPath = [
    `M ${cx - R} ${topY}`,
    `Q ${cx} ${topY - 9} ${cx + R} ${topY}`,
    `C ${cx + R * 0.92} ${topY + 20} ${cx + neck + 13} ${neckY - 16} ${cx + neck} ${neckY}`,
    `C ${cx - neck - 13} ${neckY - 16} ${cx - R * 0.92} ${topY + 20} ${cx - R} ${topY}`,
    'Z',
  ].join(' ');

  const lowPath = [
    `M ${cx - neck} ${neckY}`,
    `C ${cx - neck - 13} ${neckY + 16} ${cx - R * 0.92} ${botY - 20} ${cx - R} ${botY}`,
    `Q ${cx} ${botY + 9} ${cx + R} ${botY}`,
    `C ${cx + R * 0.92} ${botY - 20} ${cx + neck + 13} ${neckY + 16} ${cx + neck} ${neckY}`,
    'Z',
  ].join(' ');

  const outline = [
    `M ${cx - R} ${topY}`,
    `Q ${cx} ${topY - 9} ${cx + R} ${topY}`,
    `C ${cx + R * 0.92} ${topY + 20} ${cx + neck + 13} ${neckY - 16} ${cx + neck} ${neckY}`,
    `C ${cx + neck + 13} ${neckY + 16} ${cx + R * 0.92} ${botY - 20} ${cx + R} ${botY}`,
    `Q ${cx} ${botY + 9} ${cx - R} ${botY}`,
    `C ${cx - R * 0.92} ${botY - 20} ${cx - neck - 13} ${neckY + 16} ${cx - neck} ${neckY}`,
    `C ${cx - neck - 13} ${neckY - 16} ${cx - R * 0.92} ${topY + 20} ${cx - R} ${topY}`,
    'Z',
  ].join(' ');

  // 上球沙面：fraction 越大沙越高
  const sandTopY = topY + 8 + (neckY - 6 - (topY + 8)) * (1 - clamped);

  // 下球沙堆：与已流逝量成正比。下球腔比视觉上更深，堆高给到 1.15 让它更饱满，
  // 宽度随高度增长并留下限，快见底仍可见一层沙。
  const pileH = (botY - 4 - (neckY + 4)) * (1 - clamped) * 1.15;
  const pileBot = botY - 3;
  const pileTop = pileBot - pileH;
  const pileHalfW = Math.max(7, Math.min(32, 5 + pileH * 0.78));

  const height = Math.round((size * H) / W);

  return (
    <svg
      width={size}
      height={height}
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      role="img"
      aria-label={label}
    >
      <defs>
        <clipPath id={`hg-up-${uid}`}>
          <path d={upPath} />
        </clipPath>
        <clipPath id={`hg-low-${uid}`}>
          <path d={lowPath} />
        </clipPath>
        <linearGradient id={`hg-sand-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.78" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* 玻璃内腔 */}
      <path d={upPath} fill="var(--surface-2)" opacity="0.45" />
      <path d={lowPath} fill="var(--surface-2)" opacity="0.45" />

      {/* 上球剩余沙：铺满腔体后用矩形从上沿切掉 */}
      <g clipPath={`url(#hg-up-${uid})`}>
        <rect x="0" y={sandTopY} width={W} height={H} fill={`url(#hg-sand-${uid})`} />
        <ellipse cx={cx} cy={sandTopY} rx="34" ry="3" fill={color} />
      </g>

      {/* 下球沙堆：平顶缓坡 */}
      {clamped < 0.99 ? (
        <g clipPath={`url(#hg-low-${uid})`}>
          <path
            d={[
              `M ${cx - pileHalfW} ${pileBot}`,
              `C ${cx - pileHalfW * 0.72} ${pileBot - pileH * 0.55} ${cx - pileHalfW * 0.42} ${pileTop + 1.5} ${cx - pileHalfW * 0.2} ${pileTop}`,
              `L ${cx + pileHalfW * 0.2} ${pileTop}`,
              `C ${cx + pileHalfW * 0.42} ${pileTop + 1.5} ${cx + pileHalfW * 0.72} ${pileBot - pileH * 0.55} ${cx + pileHalfW} ${pileBot}`,
              'Z',
            ].join(' ')}
            fill={color}
            opacity="0.95"
          />
          <ellipse
            cx={cx}
            cy={pileTop + 0.6}
            rx={pileHalfW * 0.22}
            ry="1.1"
            fill="#ffffff"
            opacity="0.16"
          />
        </g>
      ) : null}

      {/* 沙流 */}
      {clamped > 0.015 && clamped < 0.985 ? (
        <path
          d={`M ${cx} ${neckY - 1} Q ${cx} ${neckY + 14} ${cx} ${neckY + 30}`}
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
        />
      ) : null}

      {/* 玻璃壁柔光 */}
      <path
        d={`M ${cx - R * 0.66} ${topY + 10} C ${cx - R * 0.6} ${topY + 26} ${cx - neck - 6} ${neckY - 18} ${cx - neck - 1.5} ${neckY - 5}`}
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.3"
      />
      <path
        d={`M ${cx - neck - 1.5} ${neckY + 6} C ${cx - neck - 7} ${neckY + 20} ${cx - R * 0.6} ${botY - 26} ${cx - R * 0.66} ${botY - 12}`}
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.2"
      />

      {/* 玻璃轮廓 */}
      <path
        d={outline}
        fill="none"
        strokeWidth="2.6"
        strokeLinejoin="round"
        stroke="var(--ink-subtle)"
        opacity="0.72"
      />

      {/* 上下木盖 */}
      <rect
        x={cx - R - 9}
        y={topY - 8}
        width={(R + 9) * 2}
        height="5"
        rx="2.5"
        fill="var(--ink-subtle)"
        opacity="0.62"
      />
      <rect
        x={cx - R - 9}
        y={botY + 5}
        width={(R + 9) * 2}
        height="5"
        rx="2.5"
        fill="var(--ink-subtle)"
        opacity="0.62"
      />
    </svg>
  );
}