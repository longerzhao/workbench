import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import { ListChecks } from 'lucide-react';
import { Empty } from '@/components/ui/Empty';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { ChartShell } from './ChartShell';
import { chartTooltipStyle } from './chartTheme';

export interface CompletedTrendChartProps {
  series: { date: string; count: number }[] | undefined;
  days: number;
}

export function CompletedTrendChart({ series, days }: CompletedTrendChartProps) {
  const data = series?.map((p) => ({
    ...p,
    label: p.date.slice(5), // MM-DD
  }));
  const hasData = data?.some((p) => p.count > 0);

  return (
    <ChartShell title="待办完成量">
      {series === undefined ? (
        <SkeletonLines lines={5} />
      ) : !hasData ? (
        <Empty icon={<ListChecks />} title="暂无完成记录" hint="勾完几项待办后再看趋势。" className="h-full" />
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
              formatter={(value) => [`${value} 项`, '完成']}
              labelFormatter={(_, payload) => (payload?.[0]?.payload as { date?: string })?.date ?? ''}
            />
            <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartShell>
  );
}
