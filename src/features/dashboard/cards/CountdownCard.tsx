import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Hourglass } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { countdownRepo } from '@/db/repositories';
import { Panel } from '@/components/ui/Panel';
import { SandGlass } from '@/components/ui/SandGlass';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { useNow } from '@/hooks/useNow';
import {
  HOLIDAYS,
  counterDuration,
  nextHolidayDate,
  nextRepeatDate,
  repeatSummary,
} from '@/lib/countdown';
import { todayKey, type DateKey } from '@/lib/date';

/**
 * 沙量刻度（纯装饰）：剩余天数达到此值即上球满沙。
 * 取 180 天是为了盖住最长的常见倒计时——法定假期最远也就春节那一个，
 * 超出的部分一律显示"沙还没怎么动"，读起来才符合直觉。
 */
const SAND_FULL_SCALE_DAYS = 180;

interface Candidate {
  title: string;
  date: DateKey;
  /** 周期说明，无周期则空 */
  repeat: string;
  color: string;
}

export function CountdownCard() {
  const now = useNow();
  const custom = useLiveQuery(() => countdownRepo.listAll(), []);
  const hidden = useLiveQuery(() => countdownRepo.hiddenHolidayIds(), []);
  const today = todayKey();

  // 最近的两个未过期倒计时：主位 + 次位，用来填满卡片
  const upcoming = useMemo(() => {
    if (!custom || !hidden) return undefined;
    const hiddenSet = new Set(hidden);

    const holidays: Candidate[] = HOLIDAYS.filter((item) => !hiddenSet.has(item.id)).map((item) => ({
      title: item.title,
      date: nextHolidayDate(item.id, today),
      repeat: '',
      color: item.color,
    }));

    const customs: Candidate[] = custom.map((row) => {
      const repeat = row.repeat ?? 'none';
      return {
        title: row.title,
        // 周期倒计时要滚到下一次发生日，否则锚点日期早已过期，会被下面的 past 过滤掉
        date:
          row.mode === 'down' && repeat !== 'none'
            ? nextRepeatDate(repeat, row.date, today)
            : row.date,
        repeat: row.mode === 'down' && repeat !== 'none' ? repeatSummary(repeat, row.date) : '',
        color: row.color,
      };
    });

    return [...holidays, ...customs]
      .map((row) => ({ ...row, parts: counterDuration('down', row.date, now) }))
      .filter((row) => !row.parts.past)
      .sort((a, b) => a.parts.days - b.parts.days || a.parts.hours - b.parts.hours)
      .slice(0, 2);
  }, [custom, hidden, now, today]);

  const primary = upcoming?.[0];
  const secondary = upcoming?.[1];

  // 上球剩余沙：越临近空得越快
  const sand = primary
    ? Math.max(0, Math.min(1, 1 - primary.parts.days / SAND_FULL_SCALE_DAYS))
    : 0;

  return (
    <Panel
      title="计时"
      icon={<Hourglass />}
      badge={primary?.repeat || undefined}
      action={
        <Link to="/countdown" className="text-ink-subtle hover:text-ink" aria-label="打开计时">
          <ArrowRight className="size-4" />
        </Link>
      }
      bodyClassName="flex flex-col items-center justify-center gap-3 overflow-hidden"
    >
      {upcoming === undefined ? (
        <SkeletonLines lines={3} />
      ) : !primary ? (
        <div className="flex flex-col items-center gap-1.5 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-surface-2">
            <Hourglass className="size-6 text-ink-subtle" />
          </span>
          <p className="text-[0.8125rem] text-ink-muted">没有即将到来的倒计时</p>
          <p className="text-[0.6875rem] text-ink-subtle">到计时页新建一个吧</p>
        </div>
      ) : (
        <>
          <SandGlass
            fraction={sand}
            color={primary.color}
            label={`沙漏：${primary.title} 还有 ${primary.parts.days} 天`}
          />

          <div className="min-w-0 text-center">
            <p className="truncate text-[0.8125rem] font-medium text-ink">{primary.title}</p>
            <p className="mt-0.5 tabular-nums text-[0.6875rem] text-ink-subtle">
              还有 {primary.parts.days} 天 · {primary.parts.hours} 时 {primary.parts.minutes} 分
            </p>
          </div>

          {secondary ? (
            <div className="flex w-full shrink-0 items-center gap-2 border-t border-line px-3.5 pt-2.5">
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: secondary.color }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-left text-[0.6875rem] text-ink-muted">
                {secondary.title}
              </span>
              <span className="shrink-0 text-[0.6875rem] tabular-nums text-ink-subtle">
                {secondary.parts.days} 天
              </span>
            </div>
          ) : null}
        </>
      )}
    </Panel>
  );
}