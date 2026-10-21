import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { todayKey } from '@/lib/date';
import { countdownRepo } from './countdownRepo';

const TODAY = todayKey();

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('countdownRepo.create', () => {
  it('补齐默认颜色、图标和序号', async () => {
    const row = await countdownRepo.create({ title: '春节', mode: 'down', date: TODAY });
    expect(row.color).toBe('#7c3aed');
    expect(row.icon).toBe('Hourglass');
    expect(row.order).toBe(0);
  });

  it('标题为空时按模式兜底', async () => {
    const down = await countdownRepo.create({ title: '   ', mode: 'down', date: TODAY });
    const up = await countdownRepo.create({ title: '', mode: 'up', date: TODAY });
    expect(down.title).toBe('未命名倒计时');
    expect(up.title).toBe('未命名正计时');
  });

  it('order 递增，listAll 按 order 排', async () => {
    await countdownRepo.create({ title: 'A', mode: 'down', date: TODAY });
    await countdownRepo.create({ title: 'B', mode: 'down', date: TODAY });
    const rows = await countdownRepo.listAll();
    expect(rows.map((row) => row.title)).toEqual(['A', 'B']);
  });
});

describe('countdownRepo.update', () => {
  it('改标题时顺手去空格', async () => {
    const row = await countdownRepo.create({ title: 'A', mode: 'down', date: TODAY });
    await countdownRepo.update(row.id, { title: '  生日  ' });
    expect((await db.countdowns.get(row.id))?.title).toBe('生日');
  });
});

describe('countdownRepo.remove', () => {
  it('自定义计时是物理删除，不进回收站', async () => {
    const row = await countdownRepo.create({ title: '临时', mode: 'down', date: TODAY });
    await countdownRepo.remove(row.id);
    expect(await db.countdowns.get(row.id)).toBeUndefined();
    expect(await db.trash.count()).toBe(0);
  });
});

describe('节假日隐藏', () => {
  it('默认没有隐藏项', async () => {
    expect(await countdownRepo.hiddenHolidayIds()).toEqual([]);
  });

  it('隐藏后能读回，取消后消失', async () => {
    await countdownRepo.setHolidayHidden('chunjie', true);
    await countdownRepo.setHolidayHidden('duanwu', true);
    expect((await countdownRepo.hiddenHolidayIds()).sort()).toEqual(['chunjie', 'duanwu']);

    await countdownRepo.setHolidayHidden('chunjie', false);
    expect(await countdownRepo.hiddenHolidayIds()).toEqual(['duanwu']);
  });

  it('重复隐藏不会产生重复项', async () => {
    await countdownRepo.setHolidayHidden('zhongqiu', true);
    await countdownRepo.setHolidayHidden('zhongqiu', true);
    expect(await countdownRepo.hiddenHolidayIds()).toEqual(['zhongqiu']);
  });

  it('meta 里存的是坏 JSON 时按空处理，不抛错', async () => {
    await db.meta.put({ key: 'countdown.hiddenHolidays', value: '{不是数组' });
    expect(await countdownRepo.hiddenHolidayIds()).toEqual([]);
  });
});
