import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Hourglass } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { countdownRepo } from '@/db/repositories';
import { Panel } from '@/components/ui/Panel';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { useNow } from '@/hooks/useNow';
import { HOLIDAYS, counterDuration, nextHolidayDate } from '@/lib/countdown';
import { todayKey } from '@/lib/date';

export function CountdownCard() {
  const now = useNow();
  const custom = useLiveQuery(() => countdownRepo.listAll(), []);
  const hidden = useLiveQuery(() => countdownRepo.hiddenHolidayIds(), []);
  const today = todayKey();

  const nearest = useMemo(() => {
    if (!custom || !hidden) return undefined;
    const hiddenSet = new Set(hidden);
    const holidays = HOLIDAYS.filter((item) => !hiddenSet.has(item.id)).map((item) => ({
      title: item.title,
      mode: 'down' as const,
      date: nextHolidayDate(item.id, today),
    }));
    const rows = [
      ...holidays,
      ...custom.map((row) => ({ title: row.title, mode: row.mode, date: row.date })),
    ];
    const upcoming = rows
      .map((row) => ({ ...row, parts: counterDuration(row.mode, row.date, now) }))
      .filter((row) => row.mode === 'down' && !row.parts.past)
      .sort((a, b) => a.parts.days - b.parts.days || a.parts.hours - b.parts.hours);
    return upcoming[0] ?? null;
  }, [custom, hidden, now, today]);

  return (
    <Panel
      title="计时"
      icon={<Hourglass />}
      action={
        <Link to="/countdown" className="text-ink-subtle hover:text-ink" aria-label="打开计时">
          <ArrowRight className="size-4" />
        </Link>
      }
    >
      {nearest === undefined ? (
        <SkeletonLines lines={3} />
      ) : nearest === null ? (
        <p className="px-1 text-[0.8125rem] text-ink-muted">没有即将到来的倒计时</p>
      ) : (
        <div className="flex h-full flex-col justify-center px-1">
          <p className="truncate text-[0.8125rem] text-ink-muted">{nearest.title}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-ink">
            {nearest.parts.days}
            <span className="ml-1 text-sm font-medium text-ink-subtle">天</span>
          </p>
          <p className="mt-1 text-[0.75rem] tabular-nums text-ink-subtle">
            {nearest.parts.hours} 时 {nearest.parts.minutes} 分 {nearest.parts.seconds} 秒
          </p>
        </div>
      )}
    </Panel>
  );
}
