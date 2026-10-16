import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import { Timer } from 'lucide-react';
import type { DayPoint } from '@/db/repositories';
import { Empty } from '@/components/ui/Empty';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { formatDuration } from '@/lib/date';
import { ChartShell } from './ChartShell';
import { chartTooltipStyle } from './chartTheme';

export interface FocusTrendChartProps {
  series: DayPoint[] | undefined;
  days: number;
}

export function FocusTrendChart({ series, days }: FocusTrendChartProps) {
  const data = series?.map((p) => ({
    ...p,
    label: p.date.slice(5), // MM-DD
    focusMinutes: Math.round(p.focusSeconds / 60),
  }));
  const hasData = data?.some((p) => p.focusSeconds > 0);

  return (
    <ChartShell title="专注时长">
      {series === undefined ? (
        <SkeletonLines lines={5} />
      ) : !hasData ? (
        <Empty icon={<Timer />} title="暂无专注记录" hint="完成几轮番茄后再看。" className="h-full" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--ink-subtle)', fontSize: 10 }}
              interval={days > 14 ? 2 : 0}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value) => [formatDuration(Number(value) * 60), '专注']}
              labelFormatter={(_, payload) => (payload?.[0]?.payload as { date?: string })?.date ?? ''}
            />
            <Bar dataKey="focusMinutes" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartShell>
  );
}
