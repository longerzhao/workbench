import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, restoreFromTrash } from '@/db';
import { addDays, todayKey } from '@/lib/date';
import { todoRepo } from './todoRepo';

const TODAY = todayKey();
const YESTERDAY = addDays(TODAY, -1);
const TOMORROW = addDays(TODAY, 1);

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('todoRepo.create', () => {
  it('补齐默认值', async () => {
    const todo = await todoRepo.create({ title: '  写周报  ' });
    expect(todo.title).toBe('写周报');
    expect(todo.done).toBe(false);
    expect(todo.priority).toBe(0);
    expect(todo.tags).toEqual([]);
    expect(todo.subtasks).toEqual([]);
    expect(todo.createdAt).toBe(todo.updatedAt);
  });

  it('order 递增，不与已有条目撞号', async () => {
    const first = await todoRepo.create({ title: 'A' });
    const second = await todoRepo.create({ title: 'B' });
    expect(second.order).toBeGreaterThan(first.order);
  });

  it('落库后能查到', async () => {
    const created = await todoRepo.create({ title: '买牛奶', dueDate: TODAY });
    const rows = await todoRepo.listAll();
    expect(rows.map((row) => row.id)).toContain(created.id);
  });
});

describe('todoRepo.listToday 口径', () => {
  it('今天到期、已逾期、未排期都算今天', async () => {
    const today = await todoRepo.create({ title: '今天', dueDate: TODAY });
    const overdue = await todoRepo.create({ title: '逾期', dueDate: YESTERDAY });
    const undated = await todoRepo.create({ title: '收件箱' });

    const ids = (await todoRepo.listToday()).map((row) => row.id);
    expect(ids).toContain(today.id);
    expect(ids).toContain(overdue.id);
    expect(ids).toContain(undated.id);
  });

  it('明天到期的不算今天', async () => {
    const future = await todoRepo.create({ title: '明天', dueDate: TOMORROW });
    expect((await todoRepo.listToday()).map((row) => row.id)).not.toContain(future.id);
  });

  it('已完成的排除在外', async () => {
    const done = await todoRepo.create({ title: '已完成', dueDate: TODAY });
    await todoRepo.toggle(done.id);
    expect((await todoRepo.listToday()).map((row) => row.id)).not.toContain(done.id);
  });

  it('逾期的排在今天到期之前', async () => {
    const today = await todoRepo.create({ title: '今天', dueDate: TODAY });
    const overdue = await todoRepo.create({ title: '逾期', dueDate: YESTERDAY });
    const ids = (await todoRepo.listToday()).map((row) => row.id);
    expect(ids.indexOf(overdue.id)).toBeLessThan(ids.indexOf(today.id));
  });
});

describe('todoRepo.toggle', () => {
  it('勾选时写入 completedAt，取消时清掉', async () => {
    const todo = await todoRepo.create({ title: 'A' });

    await todoRepo.toggle(todo.id);
    const done = await db.todos.get(todo.id);
    expect(done?.done).toBe(true);
    expect(done?.completedAt).toBeTruthy();

    await todoRepo.toggle(todo.id);
    const undone = await db.todos.get(todo.id);
    expect(undone?.done).toBe(false);
    expect(undone?.completedAt).toBeUndefined();
  });

  it('对不存在的 id 不抛错', async () => {
    await expect(todoRepo.toggle('todo-missing')).resolves.toBeUndefined();
  });
});

describe('todoRepo.update', () => {
  it('传 undefined 会真正删掉可选字段，而不是留下空值', async () => {
    const todo = await todoRepo.create({ title: 'A', dueDate: TODAY, note: '备注' });
    await todoRepo.update(todo.id, { dueDate: undefined, note: undefined });

    const row = await db.todos.get(todo.id);
    expect(row?.dueDate).toBeUndefined();
    expect(row?.note).toBeUndefined();
    expect(row && 'dueDate' in row).toBe(false);
  });

  it('只改传入的字段', async () => {
    const todo = await todoRepo.create({ title: 'A', dueDate: TODAY });
    await todoRepo.update(todo.id, { priority: 3 });
    const row = await db.todos.get(todo.id);
    expect(row?.priority).toBe(3);
    expect(row?.dueDate).toBe(TODAY);
    expect(row?.title).toBe('A');
  });
});

describe('todoRepo.updateMany', () => {
  it('批量改优先级并返回成功条数', async () => {
    const a = await todoRepo.create({ title: 'A' });
    const b = await todoRepo.create({ title: 'B' });
    const count = await todoRepo.updateMany([a.id, b.id], { priority: 2 });

    expect(count).toBe(2);
    expect((await db.todos.get(a.id))?.priority).toBe(2);
    expect((await db.todos.get(b.id))?.priority).toBe(2);
  });

  it('空数组直接返回 0', async () => {
    expect(await todoRepo.updateMany([], { priority: 1 })).toBe(0);
  });
});

describe('软删除与恢复', () => {
  it('remove 只移进回收站，主表查不到', async () => {
    const todo = await todoRepo.create({ title: '要删的' });
    await todoRepo.remove(todo.id);

    expect(await db.todos.get(todo.id)).toBeUndefined();
    const trash = await db.trash.toArray();
    expect(trash).toHaveLength(1);
    expect(trash[0]?.table).toBe('todos');
    expect(trash[0]?.label).toBe('要删的');
  });

  it('restoreFromTrash 能还原内容和字段', async () => {
    const todo = await todoRepo.create({ title: '还原我', dueDate: TODAY, priority: 3 });
    await todoRepo.remove(todo.id);

    const trashId = (await db.trash.toArray())[0]?.id;
    expect(trashId).toBeTruthy();
    await restoreFromTrash(trashId!);

    const restored = await db.todos.get(todo.id);
    expect(restored?.title).toBe('还原我');
    expect(restored?.dueDate).toBe(TODAY);
    expect(restored?.priority).toBe(3);
    expect(await db.trash.count()).toBe(0);
  });
});

describe('子任务', () => {
  it('新增空标题的子任务会被拒绝', async () => {
    const todo = await todoRepo.create({ title: 'A' });
    expect(await todoRepo.addSubtask(todo.id, '   ')).toBeUndefined();
  });

  it('新增后可以切换完成态', async () => {
    const todo = await todoRepo.create({ title: 'A' });
    const sub = await todoRepo.addSubtask(todo.id, '第一步');
    expect(sub?.title).toBe('第一步');

    await todoRepo.toggleSubtask(todo.id, sub!.id);
    const row = await db.todos.get(todo.id);
    expect(row?.subtasks[0]?.done).toBe(true);
  });
});

describe('todoRepo.listWithReminder', () => {
  it('只返回设了提醒且未完成的待办', async () => {
    const withRemind = await todoRepo.create({ title: '要提醒' });
    await todoRepo.update(withRemind.id, {
      remindAt: new Date(Date.now() + 3_600_000).toISOString(),
    });
    const plain = await todoRepo.create({ title: '不提醒' });
    const done = await todoRepo.create({ title: '已完成' });
    await todoRepo.update(done.id, { remindAt: new Date(Date.now() + 3_600_000).toISOString() });
    await todoRepo.toggle(done.id);

    const ids = (await todoRepo.listWithReminder()).map((t) => t.id);
    expect(ids).toContain(withRemind.id);
    expect(ids).not.toContain(plain.id);
    expect(ids).not.toContain(done.id);
  });

  it('clearTodaysReminders 之外的清除：remindAt 置 undefined 后不再返回', async () => {
    const todo = await todoRepo.create({ title: '临时提醒' });
    await todoRepo.update(todo.id, { remindAt: new Date(Date.now() + 1000).toISOString() });
    expect((await todoRepo.listWithReminder()).map((t) => t.id)).toContain(todo.id);

    await todoRepo.update(todo.id, { remindAt: undefined });
    expect((await todoRepo.listWithReminder()).map((t) => t.id)).not.toContain(todo.id);
  });
});
