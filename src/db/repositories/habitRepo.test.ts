import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { habitRepo } from './habitRepo';

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('habitRepo 回收站', () => {
  it('删除习惯时打卡日志一起进回收站，恢复时完整还原', async () => {
    const habit = await habitRepo.create({ name: '阅读', targetPerWeek: 5 });
    await habitRepo.toggleLog(habit.id, '2026-10-22');
    await habitRepo.toggleLog(habit.id, '2026-10-23');

    await habitRepo.remove(habit.id);

    // 习惯和日志都不在业务表里
    expect(await db.habits.get(habit.id)).toBeUndefined();
    expect(await db.habitLogs.where('habitId').equals(habit.id).count()).toBe(0);

    // 回收站里能找到
    const trashed = await habitRepo.listTrashHabits();
    expect(trashed).toHaveLength(1);
    expect(trashed[0]?.label).toBe('阅读');

    // 恢复后习惯与两条日志都回来
    await habitRepo.restoreTrash(trashed[0]!.id);
    const restored = await db.habits.get(habit.id);
    expect(restored?.name).toBe('阅读');
    const logs = await db.habitLogs.where('habitId').equals(habit.id).toArray();
    expect(logs).toHaveLength(2);

    // 恢复后回收站清掉这条
    expect(await habitRepo.listTrashHabits()).toHaveLength(0);
  });

  it('永久删除后不可恢复', async () => {
    const habit = await habitRepo.create({ name: '跑步' });
    await habitRepo.remove(habit.id);
    const trashed = await habitRepo.listTrashHabits();

    await habitRepo.purgeTrash(trashed[0]!.id);
    expect(await habitRepo.listTrashHabits()).toHaveLength(0);
    expect(await db.habits.get(habit.id)).toBeUndefined();
  });

  it('清空本类只清习惯，不动其他表的回收站', async () => {
    const habit = await habitRepo.create({ name: '冥想' });
    await habitRepo.remove(habit.id);

    // 造一条待办回收站记录
    const todoRepo = (await import('./todoRepo')).todoRepo;
    const todo = await todoRepo.create({ title: '待办' });
    await todoRepo.remove(todo.id);

    expect(await habitRepo.emptyTrashHabits()).toBe(1);
    expect(await habitRepo.listTrashHabits()).toHaveLength(0);
    expect(await todoRepo.listTrashTodos()).toHaveLength(1);
  });
});
