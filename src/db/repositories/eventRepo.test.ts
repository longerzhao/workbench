import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { addDays, todayKey } from '@/lib/date';
import { eventRepo } from './eventRepo';

const TODAY = todayKey();
const TOMORROW = addDays(TODAY, 1);
const NEXT_WEEK = addDays(TODAY, 7);

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('eventRepo.create', () => {
  it('补齐默认值，单日事件不写 endDate', async () => {
    const ev = await eventRepo.create({ title: '  站会  ', date: TODAY, start: '09:30', end: '09:50' });
    expect(ev.title).toBe('站会');
    expect(ev.repeat).toBe('none');
    expect(ev.allDay).toBe(false);
    expect(ev.endDate).toBeUndefined();
  });

  it('endDate 不晚于 date 时按单日处理', async () => {
    const same = await eventRepo.create({
      title: '同日',
      date: TODAY,
      endDate: TODAY,
      start: '09:00',
      end: '10:00',
    });
    const past = await eventRepo.create({
      title: '更早',
      date: TODAY,
      endDate: addDays(TODAY, -1),
      start: '09:00',
      end: '10:00',
    });
    expect(same.endDate).toBeUndefined();
    expect(past.endDate).toBeUndefined();
  });
});

describe('eventRepo.update', () => {
  it('清除 endDate 会真正删掉字段（Dexie update 会忽略 undefined）', async () => {
    const ev = await eventRepo.create({
      title: '出差',
      date: TODAY,
      endDate: addDays(TODAY, 3),
      start: '09:00',
      end: '18:00',
    });
    expect((await db.events.get(ev.id))?.endDate).toBe(addDays(TODAY, 3));

    await eventRepo.update(ev.id, { endDate: undefined });
    const after = await db.events.get(ev.id);
    expect(after?.endDate).toBeUndefined();
    expect('endDate' in (after as object)).toBe(false);
  });
});

describe('eventRepo 跨天与重复', () => {
  it('跨天事件在区间内的每天都返回一次', async () => {
    await eventRepo.create({
      title: '休假',
      date: TODAY,
      endDate: addDays(TODAY, 2),
      allDay: true,
      start: '00:00',
      end: '23:59',
    });

    const today = await eventRepo.listByDate(TODAY);
    const tomorrow = await eventRepo.listByDate(TOMORROW);
    const nextWeek = await eventRepo.listByDate(NEXT_WEEK);

    expect(today).toHaveLength(1);
    expect(tomorrow).toHaveLength(1);
    expect(nextWeek).toHaveLength(0);
  });

  it('重复事件在区间内按规则展开，无截止日时持续重复', async () => {
    await eventRepo.create({
      title: '晨会',
      date: TODAY,
      repeat: 'daily',
      start: '09:00',
      end: '09:15',
    });

    const range = await eventRepo.listBetween(TODAY, addDays(TODAY, 3));
    expect(range.map((o) => o.date)).toEqual([
      TODAY,
      addDays(TODAY, 1),
      addDays(TODAY, 2),
      addDays(TODAY, 3),
    ]);
    // 同一条事件复用同一个 id
    expect(new Set(range.map((o) => o.event.id)).size).toBe(1);
  });

  it('listToday 等价于 listByDate(今天)', async () => {
    await eventRepo.create({ title: 'A', date: TODAY, start: '09:00', end: '10:00' });
    await eventRepo.create({ title: 'B', date: TOMORROW, start: '09:00', end: '10:00' });

    expect(await eventRepo.listToday()).toHaveLength(1);
    expect(await eventRepo.listByDate(TODAY)).toHaveLength(1);
  });

  it('删除后（移入回收站）不再出现在查询里', async () => {
    const ev = await eventRepo.create({ title: '待删', date: TODAY, start: '09:00', end: '10:00' });
    await eventRepo.remove(ev.id);
    expect(await eventRepo.listByDate(TODAY)).toHaveLength(0);
    expect(await db.trash.get(`events:${ev.id}`)).toBeDefined();
  });
});