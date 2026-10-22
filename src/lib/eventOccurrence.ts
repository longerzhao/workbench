import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import type { CalendarEvent, EventRepeat } from '@/db/schema';
import { toDateKey, type DateKey } from '@/lib/date';

dayjs.extend(isoWeek);

export type { EventRepeat };

/** 日历上"某天的一次发生"：重复/跨天事件会在多天各出现一条 */
export interface EventOccurrence {
  date: DateKey;
  event: CalendarEvent;
}

export const REPEAT_LABELS: Record<EventRepeat, string> = {
  none: '不重复',
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
};

export const REPEAT_OPTIONS = (Object.keys(REPEAT_LABELS) as EventRepeat[]).map((value) => ({
  value,
  label: REPEAT_LABELS[value],
}));

/** 事件的最后发生日：无截止日的重复事件没有上限，用极大值表示"一直重复" */
const NEVER = '9999-12-31';

/** 事件在 dateKey 这天是否发生（不裁剪范围，调用方自行限制区间） */
export function occursOnDate(event: CalendarEvent, dateKey: DateKey): boolean {
  const repeat: EventRepeat = event.repeat ?? 'none';
  if (dateKey < event.date) return false;

  // 不重复：endDate 是跨天结束日；重复：endDate 是重复截止日，缺省则一直重复
  if (dateKey > (event.endDate ?? (repeat === 'none' ? event.date : NEVER))) return false;

  if (repeat === 'none') return true;

  const a = dayjs(dateKey);
  const b = dayjs(event.date);
  if (repeat === 'daily') return true;
  if (repeat === 'weekly') return a.isoWeekday() === b.isoWeekday();
  // monthly：同"几号"，2 月没有 31 号这类日期自然跳过
  return a.date() === b.date();
}

/** 单事件在 [from, to] 内的发生日（升序） */
export function occurrenceDates(event: CalendarEvent, from: DateKey, to: DateKey): DateKey[] {
  const dates: DateKey[] = [];
  const repeat: EventRepeat = event.repeat ?? 'none';
  let cursor = from > event.date ? from : event.date;
  const lastKey = event.endDate ?? (repeat === 'none' ? event.date : NEVER);
  const end = to < lastKey ? to : lastKey;
  // 跨天区间可能很长，逐日推进；重复事件也天然被 end（重复截止）截住
  while (cursor <= end) {
    if (occursOnDate(event, cursor)) dates.push(cursor);
    cursor = toDateKey(dayjs(cursor).add(1, 'day'));
  }
  return dates;
}

function occurrenceSortKey(o: EventOccurrence): string {
  return `${o.event.allDay ? 0 : 1}:${o.event.start}`;
}

/** 日期升序，同天内全天优先、再按开始时间 */
export function compareOccurrences(a: EventOccurrence, b: EventOccurrence): number {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  return occurrenceSortKey(a).localeCompare(occurrenceSortKey(b));
}

/**
 * 把一批事件展开成 [from, to] 内的发生列表，按 compareOccurrences 排序。
 */
export function expandEvents(
  events: CalendarEvent[],
  from: DateKey,
  to: DateKey,
): EventOccurrence[] {
  const occurrences: EventOccurrence[] = [];
  for (const event of events) {
    for (const date of occurrenceDates(event, from, to)) {
      occurrences.push({ date, event });
    }
  }
  return occurrences.sort(compareOccurrences);
}

/** 供 UI 展示的重复/跨天摘要，如「每周 · 至 2026-12-31」「跨 3 天」 */
export function eventRepeatSummary(event: CalendarEvent): string | null {
  const repeat: EventRepeat = event.repeat ?? 'none';
  if (repeat === 'none') {
    if (event.endDate && event.endDate > event.date) {
      const days = dayjs(event.endDate).diff(dayjs(event.date), 'day') + 1;
      return `跨 ${days} 天`;
    }
    return null;
  }
  const base = REPEAT_LABELS[repeat];
  return event.endDate ? `${base} · 至 ${event.endDate}` : base;
}
