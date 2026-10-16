import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import duration from 'dayjs/plugin/duration';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import isTomorrow from 'dayjs/plugin/isTomorrow';
import isoWeek from 'dayjs/plugin/isoWeek';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Solar } from 'lunar-javascript';

dayjs.extend(duration);
dayjs.extend(isToday);
dayjs.extend(isYesterday);
dayjs.extend(isTomorrow);
dayjs.extend(isoWeek);
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export { dayjs };
/** dayjs 类型别名：dayjs 的 d.ts 用 `export =`，具名导入不可靠，故从默认导入上取 */
export type Dayjs = dayjs.Dayjs;

/** 日期型字段统一用 YYYY-MM-DD 字符串：可索引、可排序、无时区坑 */
export type DateKey = string;

export function toDateKey(value?: Date | string | dayjs.Dayjs | null): DateKey {
  return dayjs(value ?? undefined).format('YYYY-MM-DD');
}

export function todayKey(): DateKey {
  return toDateKey();
}

export function addDays(key: DateKey, amount: number): DateKey {
  return dayjs(key).add(amount, 'day').format('YYYY-MM-DD');
}

/** 最近 n 天的日期键，从早到晚（含今天） */
export function recentDays(n: number, endKey: DateKey = todayKey()): DateKey[] {
  return Array.from({ length: n }, (_, i) => addDays(endKey, i - (n - 1)));
}

export function weekdayShort(key: DateKey): string {
  return ['日', '一', '二', '三', '四', '五', '六'][dayjs(key).day()] ?? '';
}

export function formatFullDate(key: DateKey = todayKey()): string {
  return dayjs(key).format('M月D日 dddd');
}

/** 农历月日，如「九月初六」；闰月时月名为「闰九」等形式 */
export function formatLunarDate(key: DateKey | Date = todayKey()): string {
  const d = dayjs(key);
  const lunar = Solar.fromYmd(d.year(), d.month() + 1, d.date()).getLunar();
  return `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
}

/** 顶栏用：公历 + 农历，如「10月15日 星期四 · 农历九月初六」 */
export function formatFullDateWithLunar(key: DateKey = todayKey()): string {
  return `${formatFullDate(key)} · 农历${formatLunarDate(key)}`;
}

/** 人类可读的日期：今天 / 明天 / 昨天 / 3天后 / 10月8日 */
export function humanDate(key?: DateKey): string {
  if (!key) return '未设日期';
  const d = dayjs(key);
  const diff = d.startOf('day').diff(dayjs().startOf('day'), 'day');
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  if (diff === -1) return '昨天';
  if (diff > 1 && diff <= 6) return `${diff} 天后`;
  if (diff < -1 && diff >= -6) return `${Math.abs(diff)} 天前`;
  return d.format('M月D日');
}

export function isOverdue(key?: DateKey): boolean {
  if (!key) return false;
  return dayjs(key).isBefore(dayjs().startOf('day'), 'day');
}

export function greeting(at: Date = new Date()): string {
  const h = at.getHours();
  if (h < 6) return '夜深了';
  if (h < 11) return '早上好';
  if (h < 13) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

/** 秒数 → 6h 20m / 25m */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return `${m}m`;
  return `${total}s`;
}

/** 秒数 → 25:00 */
export function formatClockDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** 相对时间：3 分钟前 */
export function fromNow(value: string): string {
  return dayjs(value).fromNow();
}

/** 含 key 所在 ISO 周的周一～周日（YYYY-MM-DD） */
export function weekRange(key: DateKey = todayKey()): { start: DateKey; end: DateKey } {
  const d = dayjs(key);
  return {
    start: d.startOf('isoWeek').format('YYYY-MM-DD'),
    end: d.endOf('isoWeek').format('YYYY-MM-DD'),
  };
}

/** 本周日；若今天仍在本周内则返回今天（用于 week 视图新建默认到期） */
export function defaultWeekDue(key: DateKey = todayKey()): DateKey {
  const { end } = weekRange(key);
  return key <= end ? key : end;
}
