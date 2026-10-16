import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Timer } from 'lucide-react';
import { pomodoroRepo } from '@/db/repositories';
import { PomodoroChart } from './PomodoroChart';
import { PomodoroSessionList } from './PomodoroSessionList';
import { PomodoroStats } from './PomodoroStats';

export function PomodoroPage() {
  const [days, setDays] = useState(14);

  const todayCompleted = useLiveQuery(() => pomodoroRepo.todayCompletedCount(), []);
  const todayFocusSec = useLiveQuery(() => pomodoroRepo.todayFocusSeconds(), []);
  const weekCompleted = useLiveQuery(() => pomodoroRepo.weekCompletedCount(), []);
  const weekFocusSec = useLiveQuery(() => pomodoroRepo.weekFocusSeconds(), []);
  const series = useLiveQuery(() => pomodoroRepo.dailySeries(days), [days]);
  const sessions = useLiveQuery(() => pomodoroRepo.listRecent(40), []);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Timer className="size-5 text-primary" />
          <div>
            <h1 className="text-base font-semibold text-ink">番茄统计</h1>
            <p className="text-[0.75rem] text-ink-subtle">
              计时请用主页番茄卡 · 时长与提示音在顶栏设置里调整
            </p>
          </div>
        </div>
        <Link to="/" className="btn btn-outline h-8 px-3 text-xs">
          回总览开始专注
        </Link>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <PomodoroStats
          todayCompleted={todayCompleted}
          todayFocusSec={todayFocusSec}
          weekCompleted={weekCompleted}
          weekFocusSec={weekFocusSec}
        />
        <PomodoroChart series={series} days={days} onDaysChange={setDays} />
        <div className="min-h-[16rem]">
          <PomodoroSessionList sessions={sessions} />
        </div>
      </div>
    </div>
  );
}
