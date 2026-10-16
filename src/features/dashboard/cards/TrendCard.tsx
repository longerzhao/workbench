import { useLiveQuery } from 'dexie-react-hooks';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { habitRepo, pomodoroRepo, todoRepo } from '@/db/repositories';
import { Panel } from '@/components/ui/Panel';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { formatDuration, weekdayShort } from '@/lib/date';
import { sum } from '@/lib/stats';

const DAYS = 7;

interface TrendPoint {
  date: string;
  label: string;
  done: number;
  focusMinutes: number;
  habitCount: number;
}

export function TrendCard() {
  const data = useLiveQuery(async () => {
    const [todos, pomodoros, habits] = await Promise.all([
      todoRepo.dailyCompletedSeries(DAYS),
      pomodoroRepo.dailySeries(DAYS),
      habitRepo.dailyLogSeries(DAYS),
    ]);

    return todos.map((point, index) => ({
      date: point.date,
      label: weekdayShort(point.date),
      done: point.count,
      focusMinutes: Math.round((pomodoros[index]?.focusSeconds ?? 0) / 60),
      habitCount: habits[index]?.count ?? 0,
    })) satisfies TrendPoint[];
  }, []);

  const totalDone = data ? sum(data.map((point) => point.done)) : 0;
  const totalFocusSeconds = data ? sum(data.map((point) => point.focusMinutes)) * 60 : 0;
  const totalHabits = data ? sum(data.map((point) => point.habitCount)) : 0;

  return (
    <Panel
      title="本周趋势"
      icon={<TrendingUp />}
      badge={data === undefined ? undefined : `近 ${DAYS} 天`}
      bodyClassName="flex flex-col gap-3 p-3.5"
      footer={<span>柱高为当日完成的待办数，悬停可看专注时长与打卡数</span>}
    >
      <div className="grid shrink-0 grid-cols-3 gap-2">
        <StatTile label="完成待办" value={`${totalDone}`} unit="项" />
        <StatTile label="专注时长" value={formatDuration(totalFocusSeconds)} />
        <StatTile label="习惯打卡" value={`${totalHabits}`} unit="次" />
      </div>

      <div className="min-h-0 flex-1">
        {data === undefined ? (
          <SkeletonLines lines={4} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }} barCategoryGap="26%">
              <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--ink-subtle)', fontSize: 11 }}
              />
              <Tooltip
                cursor={{ fill: 'var(--surface-2)', radius: 6 }}
                contentStyle={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  fontSize: 12,
                  color: 'var(--ink)',
                  boxShadow: 'var(--shadow-pop)',
                }}
                labelStyle={{ color: 'var(--ink-muted)', fontSize: 11, marginBottom: 2 }}
                formatter={(value, name) => {
                  if (name === 'done') return [`${value} 项`, '完成待办'];
                  if (name === 'focusMinutes') return [`${value} 分钟`, '专注'];
                  return [`${value} 次`, '打卡'];
                }}
              />
              <Bar
                dataKey="done"
                fill="var(--primary)"
                radius={[5, 5, 0, 0]}
                maxBarSize={28}
                animationDuration={450}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  );
}

function StatTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-[10px] bg-surface-2 px-2.5 py-2">
      <p className="text-[0.625rem] text-ink-subtle">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums leading-tight text-ink">
        {value}
        {unit ? <span className="ml-0.5 text-[0.625rem] font-normal text-ink-subtle">{unit}</span> : null}
      </p>
    </div>
  );
}
