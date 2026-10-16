import { Flame } from 'lucide-react';
import type { HabitWeekBar } from '@/lib/analyticsStats';
import { Empty } from '@/components/ui/Empty';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { ChartShell } from './ChartShell';

export interface HabitWeekChartProps {
  bars: HabitWeekBar[] | undefined;
}

export function HabitWeekChart({ bars }: HabitWeekChartProps) {
  return (
    <ChartShell title="习惯本周达成">
      {bars === undefined ? (
        <SkeletonLines lines={5} />
      ) : bars.length === 0 ? (
        <Empty icon={<Flame />} title="还没有习惯" hint="到习惯页添加想坚持的事。" className="h-full" />
      ) : (
        <ul className="flex h-full flex-col justify-center gap-3 overflow-y-auto pr-1">
          {bars.map((row) => {
            const pct = Math.round(row.ratio * 100);
            const done = row.hit >= row.target;
            return (
              <li key={row.id} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-[0.8125rem] text-ink">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="truncate">{row.name}</span>
                  </span>
                  <span
                    className={cn(
                      'shrink-0 text-[0.75rem] tabular-nums',
                      done ? 'font-medium text-primary-text' : 'text-ink-subtle',
                    )}
                  >
                    {row.hit}/{row.target}
                    <span className="ml-1 text-ink-subtle">· {pct}%</span>
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-surface-3"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${row.name} 本周进度 ${row.hit}/${row.target}`}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: row.color,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ChartShell>
  );
}
