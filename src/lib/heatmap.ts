import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { toDateKey, type DateKey } from '@/lib/date';

dayjs.extend(isoWeek);

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export interface HeatCell {
  /** 年内有效日；周首尾补位时为 null */
  date: DateKey | null;
  count: number;
  level: HeatLevel;
}

export function intensityLevel(count: number, max: number): HeatLevel {
  if (count <= 0) return 0;
  if (max <= 1) return 4;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

/** 将 logs 聚合成 date → count（全部模式：当日有打卡的习惯数） */
export function countByDate(
  logs: { date: string; habitId?: string }[],
  habitId?: string,
): Map<DateKey, number> {
  const map = new Map<DateKey, number>();
  if (habitId) {
    for (const log of logs) {
      if (log.habitId !== habitId) continue;
      map.set(log.date, (map.get(log.date) ?? 0) + 1);
    }
    return map;
  }

  // 全部：按日去重习惯数
  const dayHabits = new Map<DateKey, Set<string>>();
  for (const log of logs) {
    const set = dayHabits.get(log.date) ?? new Set();
    if (log.habitId) set.add(log.habitId);
    else set.add('_');
    dayHabits.set(log.date, set);
  }
  for (const [date, set] of dayHabits) {
    map.set(date, set.size);
  }
  return map;
}

/**
 * 自然年热力：列=周，行=周一→周日。
 * 年初/年末不满一周的位置用 date=null 占位。
 */
export function buildYearCells(
  year: number,
  countsByDate: Map<DateKey, number>,
): { weeks: HeatCell[][]; max: number; activeDays: number } {
  const start = dayjs(`${year}-01-01`);
  const end = dayjs(`${year}-12-31`);
  // isoWeekday: 1=Mon … 7=Sun
  const padBefore = start.isoWeekday() - 1;
  let cursor = start.subtract(padBefore, 'day');
  const last = end.add(7 - end.isoWeekday(), 'day');

  let max = 0;
  for (const n of countsByDate.values()) max = Math.max(max, n);

  const weeks: HeatCell[][] = [];
  let week: HeatCell[] = [];
  let activeDays = 0;

  while (cursor.isBefore(last) || cursor.isSame(last, 'day')) {
    const key = toDateKey(cursor);
    const inYear = cursor.year() === year;
    const count = inYear ? (countsByDate.get(key) ?? 0) : 0;
    if (inYear && count > 0) activeDays += 1;
    week.push({
      date: inYear ? key : null,
      count: inYear ? count : 0,
      level: inYear ? intensityLevel(count, max) : 0,
    });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    cursor = cursor.add(1, 'day');
  }

  return { weeks, max, activeDays };
}

export function yearBounds(year: number): { from: DateKey; to: DateKey } {
  return {
    from: `${year}-01-01`,
    to: `${year}-12-31`,
  };
}

/** 避免点选未来日 */
export function isFutureDate(date: DateKey, today: DateKey = toDateKey()): boolean {
  return date > today;
}
