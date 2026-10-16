import { addDays, type DateKey } from '@/lib/date';

/** 与 habitRepo.streak 一致：今天未打则从昨天起算 */
export function currentStreak(hit: Set<string>, at: DateKey): number {
  let cursor = at;
  if (!hit.has(cursor)) {
    cursor = addDays(cursor, -1);
    if (!hit.has(cursor)) return 0;
  }

  let count = 0;
  while (hit.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

/** 历史最长连续（按日期升序扫描） */
export function longestStreak(hit: Set<string>): number {
  if (hit.size === 0) return 0;
  const dates = [...hit].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i += 1) {
    const prev = dates[i - 1]!;
    const cur = dates[i]!;
    if (cur === addDays(prev, 1)) {
      run += 1;
      best = Math.max(best, run);
    } else if (cur !== prev) {
      run = 1;
    }
  }
  return best;
}

/** [start, end] 闭区间内打卡天数 */
export function weekHitCount(hit: Set<string>, start: DateKey, end: DateKey): number {
  let count = 0;
  let cursor = start;
  while (cursor <= end) {
    if (hit.has(cursor)) count += 1;
    cursor = addDays(cursor, 1);
  }
  return count;
}
