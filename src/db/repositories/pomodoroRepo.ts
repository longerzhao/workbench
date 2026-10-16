import { db, nowISO } from '..';
import type { Pomodoro, PomodoroType } from '../schema';
import { newId } from '@/lib/id';
import { recentDays, toDateKey, todayKey, weekRange, type DateKey } from '@/lib/date';

export interface StartPomodoroInput {
  type: PomodoroType;
  durationSec: number;
  todoId?: string;
}

export interface DayPoint {
  date: DateKey;
  focusSeconds: number;
  sessions: number;
}

export const pomodoroRepo = {
  /**
   * 建一条进行中的记录。计时本身不写库，只在开始时落一条，
   * 结束时回填 endedAt / completed，避免每秒写一次 IndexedDB。
   */
  async start(input: StartPomodoroInput): Promise<Pomodoro> {
    const startedAt = nowISO();
    const session: Pomodoro = {
      id: newId('pomo'),
      type: input.type,
      durationSec: input.durationSec,
      startedAt,
      date: toDateKey(startedAt),
      todoId: input.todoId,
      completed: false,
    };
    await db.pomodoros.add(session);
    return session;
  },

  async finish(id: string, completed: boolean, elapsedSec?: number): Promise<void> {
    const patch: Partial<Pomodoro> = { endedAt: nowISO(), completed };
    if (elapsedSec !== undefined) patch.durationSec = elapsedSec;
    await db.pomodoros.update(id, patch);
  },

  async listBetween(from: DateKey, to: DateKey): Promise<Pomodoro[]> {
    return db.pomodoros.where('date').between(from, to, true, true).toArray();
  },

  async listToday(): Promise<Pomodoro[]> {
    return db.pomodoros.where('date').equals(todayKey()).toArray();
  },

  /**
   * 今日专注时长（秒）。
   * 只统计已结束的会话：进行中的一轮还没"挣到"，且 record 里此刻存的仍是
   * 计划时长；只有 finish() 之后 durationSec 才等于真实专注秒数。
   */
  async todayFocusSeconds(): Promise<number> {
    const rows = await pomodoroRepo.listToday();
    return rows
      .filter((p) => p.type === 'focus' && p.endedAt)
      .reduce((sum, p) => sum + p.durationSec, 0);
  },

  async todayCompletedCount(): Promise<number> {
    const rows = await pomodoroRepo.listToday();
    return rows.filter((p) => p.type === 'focus' && p.completed).length;
  },

  /** 最近 n 天的专注趋势，缺失的日期补 0，图表不会断点 */
  async dailySeries(days = 7): Promise<DayPoint[]> {
    const dates = recentDays(days);
    const from = dates[0] ?? todayKey();
    const to = dates[dates.length - 1] ?? todayKey();
    const rows = await pomodoroRepo.listBetween(from, to);

    return dates.map((date) => {
      // 与 todayFocusSeconds 保持一致：只算已结束的专注
      const focus = rows.filter((p) => p.date === date && p.type === 'focus' && p.endedAt);
      return {
        date,
        focusSeconds: focus.reduce((sum, p) => sum + p.durationSec, 0),
        sessions: focus.filter((p) => p.completed).length,
      };
    });
  },

  /** 最近会话（已结束，按 startedAt 倒序） */
  async listRecent(limit = 30): Promise<Pomodoro[]> {
    const rows = await db.pomodoros.toArray();
    return rows
      .filter((p) => Boolean(p.endedAt))
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
  },

  async weekFocusSeconds(at: DateKey = todayKey()): Promise<number> {
    const { start, end } = weekRange(at);
    const rows = await pomodoroRepo.listBetween(start, end);
    return rows
      .filter((p) => p.type === 'focus' && p.endedAt)
      .reduce((sum, p) => sum + p.durationSec, 0);
  },

  async weekCompletedCount(at: DateKey = todayKey()): Promise<number> {
    const { start, end } = weekRange(at);
    const rows = await pomodoroRepo.listBetween(start, end);
    return rows.filter((p) => p.type === 'focus' && p.completed).length;
  },
};
