import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { addDays, toDateKey, type DateKey } from '@/lib/date';

dayjs.extend(isoWeek);

export type CalendarView = 'year' | 'month' | 'week';

export function parseCalendarView(raw: string | null | undefined): CalendarView {
  if (raw === 'week' || raw === 'year' || raw === 'month') return raw;
  return 'month';
}

export interface MonthCell {
  date: DateKey;
  /** 是否属于当前展示月 */
  inMonth: boolean;
}

/** 月视图：完整周行（周一开头），含上/下月补位 */
export function buildMonthCells(year: number, monthIndex: number): MonthCell[][] {
  // monthIndex: 0–11
  const first = dayjs(new Date(year, monthIndex, 1));
  const start = first.startOf('isoWeek');
  const last = first.endOf('month').endOf('isoWeek');

  const weeks: MonthCell[][] = [];
  let week: MonthCell[] = [];
  let cursor = start;

  while (cursor.isBefore(last) || cursor.isSame(last, 'day')) {
    const date = toDateKey(cursor);
    week.push({
      date,
      inMonth: cursor.month() === monthIndex,
    });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    cursor = cursor.add(1, 'day');
  }

  return weeks;
}

/** 锚定日所在 ISO 周的 7 天 */
export function weekDates(anchor: DateKey): DateKey[] {
  const start = dayjs(anchor).startOf('isoWeek');
  return Array.from({ length: 7 }, (_, i) => toDateKey(start.add(i, 'day')));
}

export function yearTitle(anchor: DateKey): string {
  return dayjs(anchor).format('YYYY年');
}

export function monthTitle(anchor: DateKey): string {
  return dayjs(anchor).format('YYYY年M月');
}

export function weekTitle(anchor: DateKey): string {
  const dates = weekDates(anchor);
  const a = dayjs(dates[0]);
  const b = dayjs(dates[6]);
  if (a.month() === b.month()) {
    return `${a.format('YYYY年M月')} · ${a.date()}–${b.date()}日`;
  }
  return `${a.format('M月D日')} – ${b.format('M月D日')}`;
}

export function viewTitle(view: CalendarView, anchor: DateKey): string {
  if (view === 'year') return yearTitle(anchor);
  if (view === 'week') return weekTitle(anchor);
  return monthTitle(anchor);
}

export function shiftAnchor(anchor: DateKey, view: CalendarView, delta: number): DateKey {
  if (view === 'year') {
    return toDateKey(dayjs(anchor).add(delta, 'year').startOf('year'));
  }
  if (view === 'month') {
    return toDateKey(dayjs(anchor).add(delta, 'month').startOf('month'));
  }
  return addDays(anchor, delta * 7);
}

/** HH:mm → 从 00:00 起的分钟数 */
export function timeToMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return NaN;
  return h * 60 + min;
}

export function isValidTimeRange(start: string, end: string, allDay: boolean): boolean {
  if (allDay) return true;
  const a = timeToMinutes(start);
  const b = timeToMinutes(end);
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return b > a;
}

/** 周时间轴：默认 06:00–22:00 */
export const WEEK_HOUR_START = 6;
export const WEEK_HOUR_END = 22;
export const WEEK_HOURS = Array.from(
  { length: WEEK_HOUR_END - WEEK_HOUR_START },
  (_, i) => WEEK_HOUR_START + i,
);

/** 事件在时间轴上的 top%/height%（相对 06–22） */
export function eventBlockStyle(
  start: string,
  end: string,
): { top: string; height: string } | null {
  const span = (WEEK_HOUR_END - WEEK_HOUR_START) * 60;
  let a = timeToMinutes(start);
  let b = timeToMinutes(end);
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return null;
  const dayStart = WEEK_HOUR_START * 60;
  const dayEnd = WEEK_HOUR_END * 60;
  a = Math.max(a, dayStart);
  b = Math.min(b, dayEnd);
  if (b <= a) return null;
  return {
    top: `${((a - dayStart) / span) * 100}%`,
    height: `${((b - a) / span) * 100}%`,
  };
}

export function parseDateParam(raw: string | null | undefined, fallback: DateKey): DateKey {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return fallback;
  const d = dayjs(raw);
  return d.isValid() ? toDateKey(d) : fallback;
}
