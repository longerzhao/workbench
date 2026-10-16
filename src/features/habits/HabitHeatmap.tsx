import { useMemo } from 'react';
import dayjs from 'dayjs';
import type { Habit, HabitLog } from '@/db/schema';
import { habitRepo } from '@/db/repositories';
import { toast } from '@/app/store/toast';
import {
  buildYearCells,
  countByDate,
  isFutureDate,
  type HeatCell,
  type HeatLevel,
} from '@/lib/heatmap';
import { todayKey } from '@/lib/date';
import { cn } from '@/lib/cn';

const LEVEL_CLASS: Record<HeatLevel, string> = {
  0: 'bg-surface-2',
  1: 'bg-primary/25',
  2: 'bg-primary/45',
  3: 'bg-primary/70',
  4: 'bg-primary',
};

/** 与格子行对齐：周一→周日，只标奇数行，避免挤 */
const WEEKDAY_LABELS = ['一', '', '三', '', '五', '', '日'] as const;

const CELL = 'size-2.5';
const GAP = 'gap-[3px]';

function monthLabelsForWeeks(weeks: HeatCell[][]): (string | null)[] {
  return weeks.map((week, index) => {
    const first = week.find((c) => c.date);
    if (!first?.date) return null;
    const month = dayjs(first.date).month();
    if (index > 0) {
      const prev = weeks[index - 1]?.find((c) => c.date);
      if (prev?.date && dayjs(prev.date).month() === month) return null;
    }
    return `${month + 1}月`;
  });
}

export interface HabitHeatmapProps {
  year: number;
  logs: HabitLog[] | undefined;
  habits: Habit[];
  filterHabitId: string | 'all';
  onFilterChange: (id: string | 'all') => void;
}

export function HabitHeatmap({
  year,
  logs,
  habits,
  filterHabitId,
  onFilterChange,
}: HabitHeatmapProps) {
  const today = todayKey();
  const interactive = filterHabitId !== 'all';

  const { weeks, activeDays, max } = useMemo(() => {
    if (!logs) return { weeks: [], activeDays: 0, max: 0 };
    const counts = countByDate(logs, filterHabitId === 'all' ? undefined : filterHabitId);
    return buildYearCells(year, counts);
  }, [logs, filterHabitId, year]);

  const monthLabels = useMemo(() => monthLabelsForWeeks(weeks), [weeks]);

  const onCellClick = async (date: string) => {
    if (!interactive || isFutureDate(date, today)) return;
    try {
      await habitRepo.toggleLog(filterHabitId, date);
    } catch (error) {
      toast(error instanceof Error ? error.message : '打卡失败', 'danger');
    }
  };

  return (
    <section className="border-b border-line px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-ink">{year} 年热力图</h2>
        <select
          className="input h-8 w-auto min-w-[8rem] text-xs"
          value={filterHabitId}
          onChange={(e) => onFilterChange(e.target.value === 'all' ? 'all' : e.target.value)}
        >
          <option value="all">全部习惯</option>
          {habits.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <span className="text-[0.75rem] text-ink-subtle">
          {logs === undefined ? '加载中…' : `${activeDays} 天有打卡`}
          {interactive ? ' · 点击格子可补打/撤销' : ' · 切换到单个习惯后可点格打卡'}
        </span>
        <div className="ml-auto flex items-center gap-1 text-[0.625rem] text-ink-subtle">
          <span>少</span>
          {([0, 1, 2, 3, 4] as HeatLevel[]).map((level) => (
            <span key={level} className={cn(CELL, 'rounded-sm', LEVEL_CLASS[level])} />
          ))}
          <span>多</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-block">
          {/* 月份轴 */}
          <div className={cn('mb-1 flex', GAP)}>
            <span className="w-4 shrink-0" aria-hidden />
            {monthLabels.map((label, wi) => (
              <span
                key={wi}
                className={cn(
                  CELL,
                  'relative shrink-0 text-left text-[0.625rem] leading-none text-ink-subtle',
                )}
              >
                {label ? (
                  <span className="absolute left-0 top-0 whitespace-nowrap">{label}</span>
                ) : null}
              </span>
            ))}
          </div>

          <div className={cn('flex', GAP)}>
            {/* 星期轴 */}
            <div className={cn('flex w-4 shrink-0 flex-col', GAP)}>
              {WEEKDAY_LABELS.map((label, di) => (
                <span
                  key={di}
                  className={cn(
                    CELL,
                    'flex items-center justify-end text-[0.5625rem] leading-none text-ink-subtle',
                  )}
                >
                  {label}
                </span>
              ))}
            </div>

            {weeks.map((week, wi) => (
              <div key={wi} className={cn('flex flex-col', GAP)}>
                {week.map((cell, di) => {
                  if (!cell.date) {
                    return (
                      <span key={`${wi}-${di}`} className={cn(CELL, 'rounded-sm bg-transparent')} />
                    );
                  }
                  const future = isFutureDate(cell.date, today);
                  const title = `${cell.date} · ${cell.count}${filterHabitId === 'all' ? ' 个习惯' : ' 次'}`;
                  return (
                    <button
                      key={cell.date}
                      type="button"
                      title={title}
                      disabled={!interactive || future}
                      onClick={() => void onCellClick(cell.date!)}
                      className={cn(
                        CELL,
                        'rounded-sm transition-opacity',
                        LEVEL_CLASS[cell.level],
                        interactive && !future && 'cursor-pointer hover:opacity-80',
                        (!interactive || future) && 'cursor-default',
                        future && 'opacity-30',
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      {max === 0 && logs !== undefined ? (
        <p className="mt-2 text-[0.75rem] text-ink-subtle">今年还没有打卡记录。</p>
      ) : null}
    </section>
  );
}
