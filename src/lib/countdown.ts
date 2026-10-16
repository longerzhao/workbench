import { Lunar } from 'lunar-javascript';
import type { DateKey } from '@/lib/date';

export const HOLIDAYS = [
  { id: 'yuandan', title: '元旦', color: '#dc2626', icon: 'PartyPopper' },
  { id: 'chunjie', title: '春节', color: '#db2777', icon: 'Flame' },
  { id: 'qingming', title: '清明', color: '#16a34a', icon: 'Leaf' },
  { id: 'laodong', title: '劳动节', color: '#d97706', icon: 'Briefcase' },
  { id: 'duanwu', title: '端午节', color: '#0d9488', icon: 'Sailboat' },
  { id: 'zhongqiu', title: '中秋节', color: '#eab308', icon: 'Moon' },
  { id: 'guoqing', title: '国庆节', color: '#dc2626', icon: 'Flag' },
] as const;

export type HolidayId = (typeof HOLIDAYS)[number]['id'];

export interface DurationParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** 倒计时已过目标时刻 */
  past: boolean;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function solarKey(year: number, month: number, day: number): DateKey {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function lunarSolarKey(lunarYear: number, month: number, day: number): DateKey {
  return Lunar.fromYmd(lunarYear, month, day).getSolar().toYmd();
}

function qingmingKey(year: number): DateKey {
  return Lunar.fromYmd(year, 1, 1).getJieQiTable()['清明']!.toYmd();
}

export function holidayDate(id: HolidayId, year: number): DateKey {
  switch (id) {
    case 'yuandan':
      return solarKey(year, 1, 1);
    case 'laodong':
      return solarKey(year, 5, 1);
    case 'guoqing':
      return solarKey(year, 10, 1);
    case 'chunjie':
      return lunarSolarKey(year, 1, 1);
    case 'duanwu':
      return lunarSolarKey(year, 5, 5);
    case 'zhongqiu':
      return lunarSolarKey(year, 8, 15);
    case 'qingming':
      return qingmingKey(year);
  }
}

/** 不早于 from 的下一次假期日期（含当天） */
export function nextHolidayDate(id: HolidayId, from: DateKey): DateKey {
  const year = Number(from.slice(0, 4));
  const thisYear = holidayDate(id, year);
  if (thisYear >= from) return thisYear;
  return holidayDate(id, year + 1);
}

export function startOfDate(key: DateKey): number {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year!, (month ?? 1) - 1, day ?? 1).getTime();
}

export function durationBetween(fromMs: number, toMs: number): DurationParts {
  const delta = toMs - fromMs;
  const past = delta < 0;
  let rest = Math.floor(Math.abs(delta) / 1000);
  const days = Math.floor(rest / 86_400);
  rest -= days * 86_400;
  const hours = Math.floor(rest / 3600);
  rest -= hours * 3600;
  const minutes = Math.floor(rest / 60);
  const seconds = rest - minutes * 60;
  return { days, hours, minutes, seconds, past };
}

/** 倒计时：现在到目标日 0 点；正计时：起始日 0 点到现在 */
export function counterDuration(
  mode: 'down' | 'up',
  date: DateKey,
  now: Date,
): DurationParts {
  const anchor = startOfDate(date);
  if (mode === 'down') return durationBetween(now.getTime(), anchor);
  return durationBetween(anchor, now.getTime());
}
