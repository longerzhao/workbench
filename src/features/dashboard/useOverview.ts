import { useLiveQuery } from 'dexie-react-hooks';
import { habitRepo, pomodoroRepo, todoRepo } from '@/db/repositories';
import { todayKey } from '@/lib/date';
import { percent } from '@/lib/stats';

export interface Overview {
  todayDone: number;
  todayTotal: number;
  todayRatio: number;
  /** 0..100，直接给界面显示 */
  todayPercent: number;
  focusSecondsToday: number;
  pomodoroCount: number;
  habitToday: number;
  habitTotal: number;
  bestStreak: number;
}

/**
 * 侧栏「今日进度」与主页面汇总数字的唯一来源。
 * 刻意只取"今天"这一个切片，跨天时随着 date 变化自然刷新。
 */
export function useOverview(): Overview | undefined {
  const date = todayKey();

  return useLiveQuery(async () => {
    const [todayList, completedToday, focusSecondsToday, pomodoroCount, habits] = await Promise.all([
      todoRepo.listToday(),
      todoRepo.listCompletedOn(date),
      // 专注口径统一由 repository 决定，避免这里再写一遍"只算已结束会话"的规则
      pomodoroRepo.todayFocusSeconds(),
      pomodoroRepo.todayCompletedCount(),
      habitRepo.listActive(),
    ]);

    const habitLogs = await habitRepo.recentMatrix(1);

    let habitToday = 0;
    for (const habit of habits) {
      if (habitLogs.hit.get(habit.id)?.has(date)) habitToday += 1;
    }

    const streaks = await Promise.all(habits.map((habit) => habitRepo.streak(habit.id, date)));

    const todayDone = completedToday.length;
    const todayTotal = todayDone + todayList.length;

    return {
      todayDone,
      todayTotal,
      todayRatio: todayTotal === 0 ? 0 : todayDone / todayTotal,
      todayPercent: percent(todayDone, todayTotal),
      focusSecondsToday,
      pomodoroCount,
      habitToday,
      habitTotal: habits.length,
      bestStreak: streaks.length === 0 ? 0 : Math.max(...streaks),
    } satisfies Overview;
  }, [date]);
}
