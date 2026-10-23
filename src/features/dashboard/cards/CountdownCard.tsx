import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Hourglass } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { countdownRepo } from '@/db/repositories';
import type { Countdown } from '@/db/schema';
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
  /** 实际锚点：倒计时的目标日（周期已滚到下一次）、正计时的起始日 */
  date: DateKey;
  /** down = 还有 N 天；up = 已 N 天 */
  mode: Countdown['mode'];
  /** 周期说明，无周期则空 */
  repeat: string;
  color: string;
}

export function CountdownCard() {
  const now = useNow();
  const custom = useLiveQuery(() => countdownRepo.listAll(), []);
  const hidden = useLiveQuery(() => countdownRepo.hiddenHolidayIds(), []);
  const today = todayKey();

  // 最近的两个计时条目：主位 + 次位，用来填满卡片
  const upcoming = useMemo(() => {
    if (!custom || !hidden) return undefined;
    const hiddenSet = new Set(hidden);

    const holidays: Candidate[] = HOLIDAYS.filter((item) => !hiddenSet.has(item.id)).map((item) => ({
      title: item.title,
      date: nextHolidayDate(item.id, today),
      mode: 'down' as const,
      repeat: '',
      color: item.color,
    }));

    const customs: Candidate[] = custom.map((row) => {
      const repeat = row.repeat ?? 'none';
      return {
        title: row.title,
        // 周期倒计时要滚到下一次发生日，否则锚点日期早已过期，会被 past 过滤掉
        date:
          row.mode === 'down' && repeat !== 'none'
            ? nextRepeatDate(repeat, row.date, today)
            : row.date,
        mode: row.mode,
        repeat: row.mode === 'down' && repeat !== 'none' ? repeatSummary(repeat, row.date) : '',
        color: row.color,
      };
    });

    const rows = [...holidays, ...customs]
      .map((row) => ({ ...row, parts: counterDuration(row.mode, row.date, now) }))
      // down 的 past = 目标已过；up 的 past = 起始日在未来（"已 N 天"还没开始）。
      // 两种都不展示。
      .filter((row) => !row.parts.past);

    // 倒计时按紧迫度排（剩余越小越靠前）；正计时按已过时长排（愈久远愈靠前）。
    // 两者不混排——"紧迫"对正计时没有意义，硬折算成同一量纲会让刚创建的正计时
    // 霸占主位，把今晚就到期的倒计时挤走。倒计时优先，正计时只在它缺席时补位。
    const sorted = [
      ...rows
        .filter((row) => row.mode === 'down')
        .sort((a, b) => a.parts.days - b.parts.days || a.parts.hours - b.parts.hours),
      ...rows
        .filter((row) => row.mode === 'up')
        .sort((a, b) => b.parts.days - a.parts.days || b.parts.hours - a.parts.hours),
    ];

    return sorted.slice(0, 2);
  }, [custom, hidden, now, today]);

  const primary = upcoming?.[0];
  const secondary = upcoming?.[1];

  // 上球剩余沙。倒计时用"还剩多少"：越临近越空。
  // 正计时取补值，语义随之翻转成"已过多久"：刚开始时满沙，愈久远愈空——
  // 与计时页一致（正计时页面同样按"已 N 天"表述）。
  const sand =
    primary?.mode === 'up'
      ? 1 - sandFraction(primary.parts.days, primary.parts.hours)
      : primary
        ? sandFraction(primary.parts.days, primary.parts.hours)
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
            label={
              primary.mode === 'up'
                ? `沙漏：${primary.title} 已 ${primary.parts.days} 天`
                : `沙漏：${primary.title} 还有 ${primary.parts.days} 天`
            }
          />

          <div className="min-w-0 text-center">
            <p className="truncate text-[0.8125rem] font-medium text-ink">{primary.title}</p>
            <p className="mt-0.5 tabular-nums text-[0.6875rem] text-ink-subtle">
              {primary.mode === 'up' ? '已' : '还有'} {primary.parts.days} 天 ·{' '}
              {primary.parts.hours} 时 {primary.parts.minutes} 分
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
                {secondary.mode === 'up' ? '已' : ''} {secondary.parts.days} 天
              </span>
            </div>
          ) : null}
        </>
      )}
    </Panel>
  );
}