import { Flame } from 'lucide-react';
import type { CompletionHeatmap } from '@/lib/analyticsStats';
import { Empty } from '@/components/ui/Empty';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { ChartShell } from './ChartShell';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'] as const;

export interface CompletionHeatChartProps {
  heat: CompletionHeatmap | undefined;
  days: number;
}

/** 时段标签：0 点、6 点、12 点、18 点 */
const HOUR_TICKS = [0, 6, 12, 18];

export function CompletionHeatChart({ heat, days }: CompletionHeatChartProps) {
  const hasData = heat !== undefined && heat.max > 0;

  return (
    <ChartShell title={`完成时段 · 近 ${days} 天`} chip="周一在首">
      {heat === undefined ? (
        <SkeletonLines lines={5} />
      ) : !hasData ? (
        <Empty icon={<Flame />} title="暂无完成记录" hint="勾完几项待办后再看你的高效时段。" className="h-full" />
      ) : (
        <div className="flex h-full min-h-0 flex-col gap-1">
          <div className="flex min-h-0 flex-1 gap-1">
            {/* 星期标签列 */}
            <div className="flex shrink-0 flex-col gap-px">
              {WEEKDAYS.map((d) => (
                <span
                  key={d}
                  className="flex flex-1 items-center justify-end text-[0.5625rem] text-ink-subtle"
                >
                  {d}
                </span>
              ))}
            </div>

            {/* 7 × 24 格 */}
            <div className="grid min-h-0 flex-1 grid-rows-7 gap-px">
              {heat.grid.map((row, i) => (
                <div key={i} className="grid gap-px" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                  {row.map((count, hour) => {
                    // 有量的格子用主色按强度着色，0 保持中性底
                    const intensity = count / heat.max;
                    return (
                      <div
                        key={hour}
                        title={`${WEEKDAYS[i]} ${String(hour).padStart(2, '0')}:00–${String(hour + 1).padStart(2, '0')}:00 · 完成 ${count} 项`}
                        className="rounded-[2px] transition-colors"
                        style={{
                          backgroundColor:
                            count > 0
                              ? `color-mix(in srgb, var(--primary) ${Math.max(18, Math.round(intensity * 100))}%, var(--surface-3))`
                              : 'var(--surface-3)',
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* 小时刻度 */}
          <div className="flex gap-1 pl-4">
            <div className="relative flex-1">
              {HOUR_TICKS.map((h) => (
                <span
                  key={h}
                  className="absolute -translate-x-1/2 text-[0.5625rem] text-ink-subtle"
                  style={{ left: `${(h / 24) * 100}%` }}
                >
                  {h}时
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </ChartShell>
  );
}
