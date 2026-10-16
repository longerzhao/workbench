import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DayPoint } from '@/db/repositories';
import { Empty } from '@/components/ui/Empty';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { formatDuration } from '@/lib/date';
import { Timer } from 'lucide-react';

export interface PomodoroChartProps {
  series: DayPoint[] | undefined;
  days: number;
  onDaysChange: (days: number) => void;
}

export function PomodoroChart({ series, days, onDaysChange }: PomodoroChartProps) {
  const data = series?.map((p) => ({
    ...p,
    label: p.date.slice(5), // MM-DD
    focusMinutes: Math.round(p.focusSeconds / 60),
  }));

  const hasData = data?.some((p) => p.focusSeconds > 0);

  return (
    <section className="rounded-[12px] border border-line p-4">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-ink">专注趋势</h2>
        <div className="ml-auto flex gap-1">
          {[14, 30].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onDaysChange(n)}
              className={
                days === n
                  ? 'chip bg-primary-soft text-primary-text'
                  : 'chip hover:bg-surface-2'
              }
            >
              近 {n} 天
            </button>
          ))}
        </div>
      </div>

      <div className="h-52">
        {series === undefined ? (
          <SkeletonLines lines={6} />
        ) : !hasData ? (
          <Empty
            icon={<Timer />}
            title="还没有专注记录"
            hint="在主页番茄钟完成几轮后再来看趋势。"
            className="h-full"
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--ink-subtle)', fontSize: 10 }}
                interval={days > 14 ? 2 : 0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--ink-subtle)', fontSize: 11 }}
                width={32}
                unit="m"
              />
              <Tooltip
                cursor={{ fill: 'var(--surface-2)', radius: 6 }}
                contentStyle={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  fontSize: 12,
                  color: 'var(--ink)',
                }}
                formatter={(value) => [
                  formatDuration(Number(value) * 60),
                  '专注',
                ]}
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as { date?: string } | undefined;
                  return row?.date ?? '';
                }}
              />
              <Bar dataKey="focusMinutes" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
