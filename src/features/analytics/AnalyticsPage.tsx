import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChartColumn } from 'lucide-react';
import { habitRepo, pomodoroRepo, projectRepo, todoRepo } from '@/db/repositories';
import {
  completionHeatmap,
  habitHitTotals,
  habitRangeBars,
  projectProgressBars,
  rangeSummary,
} from '@/lib/analyticsStats';
import { todayKey } from '@/lib/date';
import { cn } from '@/lib/cn';
import { CompletedTrendChart } from './CompletedTrendChart';
import { CompletionHeatChart } from './CompletionHeatChart';
import { FocusTrendChart } from './FocusTrendChart';
import { HabitRangeChart } from './HabitRangeChart';
import { ProjectOpenChart } from './ProjectOpenChart';
import { RangeSummaryCards } from './RangeSummaryCards';

export function AnalyticsPage() {
  const [search, setSearch] = useSearchParams();
  const daysParam = search.get('days');
  const days = daysParam === '30' ? 30 : 14;
  const setDays = (n: 14 | 30) => {
    const next = new URLSearchParams(search);
    next.set('days', String(n));
    setSearch(next, { replace: true });
  };

  // 环比需要上一周期：查 2×days 天，统计函数负责切半
  const completed = useLiveQuery(() => todoRepo.dailyCompletedSeries(days * 2), [days]);
  const focus = useLiveQuery(() => pomodoroRepo.dailySeries(days * 2), [days]);

  const habitData = useLiveQuery(async () => {
    const [habits, logs] = await Promise.all([
      habitRepo.listActive(),
      habitRepo.listAllLogs(),
    ]);
    return { habits, logs };
  }, []);

  const projectQuery = useLiveQuery(async () => {
    const [todos, projects] = await Promise.all([
      todoRepo.listAll(),
      projectRepo.listAll(),
    ]);
    return { todos, projects };
  }, []);

  const today = todayKey();
  const summary = useMemo(
    () =>
      completed && focus
        ? rangeSummary(completed, focus, days)
        : undefined,
    [completed, focus, days],
  );
  const habitTotals = useMemo(
    () => (habitData ? habitHitTotals(habitData.logs, days, today) : undefined),
    [habitData, days, today],
  );
  const habitBars = useMemo(
    () =>
      habitData ? habitRangeBars(habitData.habits, habitData.logs, days, today) : undefined,
    [habitData, days, today],
  );
  const projectBars = useMemo(
    () => (projectQuery ? projectProgressBars(projectQuery.todos, projectQuery.projects) : undefined),
    [projectQuery],
  );
  const heat = useMemo(
    () => (projectQuery ? completionHeatmap(projectQuery.todos, days, today) : undefined),
    [projectQuery, days, today],
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <ChartColumn className="size-5 text-primary" />
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold text-ink">数据看板</h1>
          <p className="text-[0.75rem] text-ink-subtle">完成量、专注、习惯与时段分布 · 近 {days} 天</p>
        </div>
        <div className="flex gap-1">
          {([14, 30] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setDays(n)}
              className={cn(
                'chip',
                days === n ? 'bg-primary-soft text-primary-text' : 'hover:bg-surface-2',
              )}
            >
              近 {n} 天
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {summary && habitTotals ? <RangeSummaryCards summary={summary} habitTotals={habitTotals} days={days} /> : null}

        <div className="grid gap-3 md:grid-cols-2">
          <CompletedTrendChart series={completed?.slice(days)} days={days} />
          <FocusTrendChart series={focus?.slice(days)} days={days} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <HabitRangeChart bars={habitBars} days={days} />
          <ProjectOpenChart bars={projectBars} />
        </div>
        <CompletionHeatChart heat={heat} days={days} />
      </div>
    </div>
  );
}
