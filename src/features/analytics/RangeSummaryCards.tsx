import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { formatDuration } from '@/lib/date';
import { cn } from '@/lib/cn';

export interface RangeSummaryCardsProps {
  summary: {
    completedCur: number;
    completedPrev: number;
    focusCurSec: number;
    focusPrevSec: number;
  };
  habitTotals: { cur: number; prev: number };
  days: number;
}

interface Delta {
  cur: number;
  prev: number;
  /** 展示用数值 */
  value: string;
  /** 上涨算好还是算坏：完成量多算好，专注降了算坏 */
  higherIsBetter: boolean;
}

/** 环比百分比；上一周期为 0 时不给百分比只给「上期 0」 */
function deltaInfo({ cur, prev }: Pick<Delta, 'cur' | 'prev'>): {
  pct: number | null;
  tone: 'up' | 'down' | 'flat';
} {
  if (cur === prev) return { pct: null, tone: 'flat' };
  const pct = prev === 0 ? null : Math.round(((cur - prev) / prev) * 100);
  return { pct, tone: cur > prev ? 'up' : 'down' };
}

function SummaryCard({
  label,
  delta,
}: {
  label: string;
  delta: Delta;
}) {
  const { pct, tone } = deltaInfo(delta);
  const good = tone === 'flat' ? null : (tone === 'up') === delta.higherIsBetter;
  const Icon = tone === 'flat' ? Minus : tone === 'up' ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="rounded-[12px] border border-line bg-surface px-3.5 py-2.5">
      <p className="text-[0.6875rem] text-ink-subtle">{label}</p>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="text-lg font-semibold tabular-nums text-ink">{delta.value}</span>
        {pct !== null ? (
          <span
            className={cn(
              'flex items-center gap-0.5 text-[0.6875rem] font-medium tabular-nums',
              good === null ? 'text-ink-subtle' : good ? 'text-success' : 'text-danger',
            )}
          >
            <Icon className="size-3" />
            {Math.abs(pct)}%
          </span>
        ) : tone !== 'flat' ? (
          <span className="text-[0.6875rem] text-ink-subtle">上期 0</span>
        ) : (
          <span className="text-[0.6875rem] text-ink-subtle">持平</span>
        )}
      </div>
    </div>
  );
}

/** 顶部环比摘要：本周期 vs 上一个等长周期 */
export function RangeSummaryCards({ summary, habitTotals, days }: RangeSummaryCardsProps) {
  const label = `近 ${days} 天`;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <SummaryCard
        label={`完成待办 · ${label}`}
        delta={{
          cur: summary.completedCur,
          prev: summary.completedPrev,
          value: `${summary.completedCur} 项`,
          higherIsBetter: true,
        }}
      />
      <SummaryCard
        label={`专注时长 · ${label}`}
        delta={{
          cur: summary.focusCurSec,
          prev: summary.focusPrevSec,
          value: formatDuration(summary.focusCurSec),
          higherIsBetter: true,
        }}
      />
      <SummaryCard
        label={`习惯打卡 · ${label}`}
        delta={{
          cur: habitTotals.cur,
          prev: habitTotals.prev,
          value: `${habitTotals.cur} 次`,
          higherIsBetter: true,
        }}
      />
    </div>
  );
}
