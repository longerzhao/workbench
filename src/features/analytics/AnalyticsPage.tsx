import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChartColumn } from 'lucide-react';
import {
  habitRepo,
  pomodoroRepo,
  projectRepo,
  todoRepo,
} from '@/db/repositories';
import { habitWeekBars, projectProgressBars } from '@/lib/analyticsStats';
import { weekRange } from '@/lib/date';
import { cn } from '@/lib/cn';
import { CompletedTrendChart } from './CompletedTrendChart';
import { FocusTrendChart } from './FocusTrendChart';
import { HabitWeekChart } from './HabitWeekChart';
import { ProjectOpenChart } from './ProjectOpenChart';

export function AnalyticsPage() {
  const [search, setSearch] = useSearchParams();
  const daysParam = search.get('days');
  const days = daysParam === '30' ? 30 : 14;
  const setDays = (n: 14 | 30) => {
    const next = new URLSearchParams(search);
    next.set('days', String(n));
    setSearch(next, { replace: true });
  };

  const completed = useLiveQuery(() => todoRepo.dailyCompletedSeries(days), [days]);
  const focus = useLiveQuery(() => pomodoroRepo.dailySeries(days), [days]);

  const habitData = useLiveQuery(async () => {
    const { start, end } = weekRange();
    const [habits, logs] = await Promise.all([
      habitRepo.listActive(),
      habitRepo.logsBetween(start, end),
    ]);
    return habitWeekBars(habits, logs, start, end);
  }, []);

  const projectData = useLiveQuery(async () => {
    const [todos, projects] = await Promise.all([
      todoRepo.listAll(),
      projectRepo.listAll(),
    ]);
    return projectProgressBars(todos, projects);
  }, []);

  const rangeLabel = useMemo(() => `近 ${days} 天`, [days]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <ChartColumn className="size-5 text-primary" />
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold text-ink">数据看板</h1>
          <p className="text-[0.75rem] text-ink-subtle">完成量、专注、习惯与项目积压 · {rangeLabel}</p>
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
        <div className="grid gap-3 md:grid-cols-2">
          <CompletedTrendChart series={completed} days={days} />
          <FocusTrendChart series={focus} days={days} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <HabitWeekChart bars={habitData} />
          <ProjectOpenChart bars={projectData} />
        </div>
      </div>
    </div>
  );
}
