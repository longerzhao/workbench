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
 * 沙量刻度（纯装饰）。
 *
 * 倒计时的跨度太大——"还剩 3 小时"到"还有 105 天"差 280 倍，任何单一刻度都会
 * 让其中一端失去区分度。所以用分段插值：
 *   0–24 小时   → 0%–35%   （今天之内，沙明显见底）
 *   1–7 天      → 35%–65%  （本周之内）
 *   7–30 天     → 65%–85%  （本月之内）
 *   30–180 天   → 85%–100% （更远的基本满沙，超过 180 天一律满）
 */
const SAND_SCALE: readonly { hours: number; ratio: number }[] = [
  { hours: 0, ratio: 0 },
  { hours: 24, ratio: 0.35 },
  { hours: 24 * 7, ratio: 0.65 },
  { hours: 24 * 30, ratio: 0.85 },
  { hours: 24 * 180, ratio: 1 },
];

function sandFraction(days: number, hours: number): number {
  const totalHours = Math.max(0, days * 24 + hours);
  const last = SAND_SCALE[SAND_SCALE.length - 1]!;
  if (totalHours >= last.hours) return 1;

  for (let i = 1; i < SAND_SCALE.length; i += 1) {
    const upper = SAND_SCALE[i]!;
    if (totalHours > upper.hours) continue;
    const lower = SAND_SCALE[i - 1]!;
    const t = (totalHours - lower.hours) / (upper.hours - lower.hours);
    return lower.ratio + (upper.ratio - lower.ratio) * t;
  }
  return 1;
}

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

  // 上球剩余沙：越临近空得越快，粒度到小时
  const sand = primary ? sandFraction(primary.parts.days, primary.parts.hours) : 0;

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