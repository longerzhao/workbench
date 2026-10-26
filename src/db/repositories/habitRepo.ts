import { db, nowISO } from '..';
import type { Habit, HabitLog, TrashRecord } from '../schema';
import { newId } from '@/lib/id';
import { addDays, recentDays, todayKey, type DateKey } from '@/lib/date';

export interface NewHabitInput {
  name: string;
  icon?: string;
  color?: string;
  targetPerWeek?: number;
}

/** 打卡记录 ID 固定为 `habitId:date`，让打卡天然幂等 */
export function habitLogId(habitId: string, date: DateKey): string {
  return `${habitId}:${date}`;
}

function byOrder(a: Habit, b: Habit): number {
  return a.order - b.order;
}

export const habitRepo = {
  async listActive(): Promise<Habit[]> {
    const rows = await db.habits.toArray();
    return rows.filter((h) => !h.archived).sort(byOrder);
  },

  async listAll(): Promise<Habit[]> {
    const rows = await db.habits.toArray();
    return rows.sort(byOrder);
  },

  async countActive(): Promise<number> {
    const rows = await db.habits.toArray();
    return rows.filter((h) => !h.archived).length;
  },

  async create(input: NewHabitInput): Promise<Habit> {
    const last = await db.habits.orderBy('order').last();
    const habit: Habit = {
      id: newId('habit'),
      name: input.name.trim(),
      icon: input.icon ?? 'Circle',
      color: input.color ?? '#7c3aed',
      targetPerWeek: input.targetPerWeek ?? 7,
      archived: false,
      order: (last?.order ?? 0) + 1,
      createdAt: nowISO(),
    };
    await db.habits.add(habit);
    return habit;
  },

  async update(id: string, patch: Partial<Omit<Habit, 'id' | 'createdAt'>>): Promise<void> {
    await db.habits.update(id, patch);
  },

  async remove(id: string): Promise<void> {
    const habit = await db.habits.get(id);
    if (!habit) return;
    const logs = await db.habitLogs.where('habitId').equals(id).toArray();
    // 日志随习惯一起进回收站（存进同一个 payload），恢复时才能完整还原
    await db.transaction('rw', db.habits, db.habitLogs, db.trash, async () => {
      await db.habitLogs.where('habitId').equals(id).delete();
      await db.habits.delete(id);
      await db.trash.put({
        id: `habits:${id}`,
        table: 'habits',
        entityId: id,
        payload: { habit, logs },
        label: habit.name,
        deletedAt: nowISO(),
      });
    });
  },

  /** 回收站里的习惯（含打卡日志） */
  async listTrashHabits(): Promise<TrashRecord[]> {
    const rows = await db.trash.where('table').equals('habits').toArray();
    return rows.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  },

  /** 恢复习惯与其全部打卡日志 */
  async restoreTrash(trashId: string): Promise<void> {
    const record = await db.trash.get(trashId);
    if (!record) return;
    const payload = record.payload as { habit?: Habit; logs?: HabitLog[] } | undefined;
    if (!payload?.habit) return;
    await db.transaction('rw', db.habits, db.habitLogs, db.trash, async () => {
      await db.habits.put(payload.habit!);
      if (payload.logs?.length) await db.habitLogs.bulkPut(payload.logs);
      await db.trash.delete(trashId);
    });
  },

  async purgeTrash(trashId: string): Promise<void> {
    await db.trash.delete(trashId);
  },

  async emptyTrashHabits(): Promise<number> {
    const rows = await db.trash.where('table').equals('habits').toArray();
    if (rows.length === 0) return 0;
    await db.trash.bulkDelete(rows.map((r) => r.id));
    return rows.length;
  },

  /** 打卡 / 取消打卡（幂等） */
  async toggleLog(habitId: string, date: DateKey = todayKey()): Promise<boolean> {
    const id = habitLogId(habitId, date);
    const existing = await db.habitLogs.get(id);
    if (existing) {
      await db.habitLogs.delete(id);
      return false;
    }
    const log: HabitLog = { id, habitId, date, count: 1, createdAt: nowISO() };
    await db.habitLogs.add(log);
    return true;
  },

  async logsBetween(from: DateKey, to: DateKey): Promise<HabitLog[]> {
    return db.habitLogs.where('date').between(from, to, true, true).toArray();
  },

  async listAllLogs(): Promise<HabitLog[]> {
    return db.habitLogs.toArray();
  },

  async todayLogCount(): Promise<number> {
    const today = todayKey();
    const rows = await db.habitLogs.where('date').equals(today).toArray();
    return rows.length;
  },

  /** 最近 n 天的打卡矩阵：habitId → 已打卡日期集合 */
  async recentMatrix(days = 7): Promise<{ dates: DateKey[]; hit: Map<string, Set<DateKey>> }> {
    const dates = recentDays(days);
    const from = dates[0] ?? todayKey();
    const to = dates[dates.length - 1] ?? todayKey();
    const logs = await habitRepo.logsBetween(from, to);

    const hit = new Map<string, Set<DateKey>>();
    for (const log of logs) {
      const set = hit.get(log.habitId) ?? new Set<DateKey>();
      set.add(log.date);
      hit.set(log.habitId, set);
    }
    return { dates, hit };
  },

  /** 最近 n 天每天打卡了几个习惯，供趋势图使用 */
  async dailyLogSeries(days = 7): Promise<{ date: DateKey; count: number }[]> {
    const dates = recentDays(days);
    const from = dates[0] ?? todayKey();
    const to = dates[dates.length - 1] ?? todayKey();
    const logs = await habitRepo.logsBetween(from, to);

    const byDate = new Map<DateKey, number>();
    for (const log of logs) {
      byDate.set(log.date, (byDate.get(log.date) ?? 0) + 1);
    }

    return dates.map((date) => ({ date, count: byDate.get(date) ?? 0 }));
  },

  /**
   * 连续打卡天数。今天还没打卡不算断——从今天往回数，
   * 首个未打卡日若是今天则从昨天继续，这样白天看数字不会突然归零。
   */
  async streak(habitId: string, at: DateKey = todayKey()): Promise<number> {
    const logs = await db.habitLogs.where('habitId').equals(habitId).toArray();
    const hit = new Set(logs.map((l) => l.date));

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
  },

  /** 组内重排：复用原 order 槽位 */
  async reorder(orderedIds: string[]): Promise<void> {
    if (orderedIds.length === 0) return;
    await db.transaction('rw', db.habits, async () => {
      const rows = await db.habits.bulkGet(orderedIds);
      const valid = rows.filter((r): r is Habit => r != null);
      if (valid.length !== orderedIds.length) return;
      const orders = valid.map((r) => r.order).sort((a, b) => a - b);
      await Promise.all(
        orderedIds.map((id, index) => db.habits.update(id, { order: orders[index]! })),
      );
    });
  },

  async setArchived(id: string, archived: boolean): Promise<void> {
    await db.habits.update(id, { archived });
  },
};
