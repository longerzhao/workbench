import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '@/db/schema';
import { expandEvents, eventRepeatSummary, occurrenceDates, occursOnDate } from './eventOccurrence';

function makeEvent(partial: Partial<CalendarEvent> & { date: string }): CalendarEvent {
  return {
    id: 'e1',
    title: '测试',
    start: '09:00',
    end: '10:00',
    allDay: false,
    color: '#000',
    createdAt: '2026-01-01T00:00:00.000Z',
    repeat: 'none',
    ...partial,
  };
}

describe('occursOnDate 单日事件', () => {
  it('只有当天发生', () => {
    const ev = makeEvent({ date: '2026-03-10' });
    expect(occursOnDate(ev, '2026-03-10')).toBe(true);
    expect(occursOnDate(ev, '2026-03-09')).toBe(false);
    expect(occursOnDate(ev, '2026-03-11')).toBe(false);
  });

  it('缺省 repeat 视作不重复（旧数据兼容）', () => {
    const ev = makeEvent({ date: '2026-03-10', repeat: undefined });
    expect(occursOnDate(ev, '2026-03-10')).toBe(true);
    expect(occursOnDate(ev, '2026-03-11')).toBe(false);
  });
});

describe('跨天事件', () => {
  it('起止日之间每天都发生，两端闭合', () => {
    const ev = makeEvent({ date: '2026-03-10', endDate: '2026-03-13' });
    for (const day of ['2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13']) {
      expect(occursOnDate(ev, day)).toBe(true);
    }
    expect(occursOnDate(ev, '2026-03-09')).toBe(false);
    expect(occursOnDate(ev, '2026-03-14')).toBe(false);
  });

  it('跨 10 天以上也正确（含跨月、跨年）', () => {
    const ev = makeEvent({ date: '2026-12-28', endDate: '2027-01-05' });
    const dates = occurrenceDates(ev, '2026-01-01', '2027-12-31');
    expect(dates).toHaveLength(9); // 28,29,30,31 + 1~5
    expect(dates[0]).toBe('2026-12-28');
    expect(dates.at(-1)).toBe('2027-01-05');
  });

  it('summary 说明跨了几天', () => {
    const ev = makeEvent({ date: '2026-03-10', endDate: '2026-03-13' });
    expect(eventRepeatSummary(ev)).toBe('跨 4 天');
  });
});

describe('重复事件', () => {
  it('daily 每天都发生，直到截止日', () => {
    const ev = makeEvent({ date: '2026-03-10', endDate: '2026-03-13', repeat: 'daily' });
    expect(occurrenceDates(ev, '2026-03-01', '2026-03-31')).toEqual([
      '2026-03-10',
      '2026-03-11',
      '2026-03-12',
      '2026-03-13',
    ]);
  });

  it('weekly 只落在同一 ISO 周几', () => {
    // 2026-03-10 是周二
    const ev = makeEvent({ date: '2026-03-10', endDate: '2026-04-07', repeat: 'weekly' });
    const dates = occurrenceDates(ev, '2026-03-01', '2026-04-30');
    expect(dates).toEqual(['2026-03-10', '2026-03-17', '2026-03-24', '2026-03-31', '2026-04-07']);
  });

  it('monthly 只落在同一个"几号"，没有该号的月份跳过', () => {
    // 每月 31 号：2 月、4 月、6 月、9 月、11 月没有 31 号
    const ev = makeEvent({ date: '2026-01-31', endDate: '2026-12-31', repeat: 'monthly' });
    const dates = occurrenceDates(ev, '2026-01-01', '2026-12-31');
    expect(dates).toEqual([
      '2026-01-31',
      '2026-03-31',
      '2026-05-31',
      '2026-07-31',
      '2026-08-31',
      '2026-10-31',
      '2026-12-31',
    ]);
  });

  it('无截止日时在查询区间内一直重复', () => {
    const ev = makeEvent({ date: '2026-03-02', repeat: 'weekly' });
    // 3/2 是周一，3/2、3/9、3/16
    expect(occurrenceDates(ev, '2026-03-01', '2026-03-20')).toEqual([
      '2026-03-02',
      '2026-03-09',
      '2026-03-16',
    ]);
  });

  it('重复 + 跨天组合：每天发生的每天都占满整段时间', () => {
    const ev = makeEvent({
      date: '2026-03-10',
      endDate: '2026-03-11',
      repeat: 'daily',
    });
    expect(occurrenceDates(ev, '2026-03-01', '2026-03-31')).toEqual([
      '2026-03-10',
      '2026-03-11',
    ]);
  });

  it('summary 带截止日', () => {
    const ev = makeEvent({ date: '2026-03-10', endDate: '2026-12-31', repeat: 'weekly' });
    expect(eventRepeatSummary(ev)).toBe('每周 · 至 2026-12-31');
    expect(eventRepeatSummary(makeEvent({ date: '2026-03-10', repeat: 'daily' }))).toBe('每天');
  });
});

describe('expandEvents', () => {
  it('按日期升序，同日全天排在定时之前', () => {
    const timed = makeEvent({ id: 'timed', date: '2026-03-10', start: '09:00' });
    const allDay = makeEvent({ id: 'all', date: '2026-03-10', allDay: true, start: '00:00' });
    const nextDay = makeEvent({ id: 'next', date: '2026-03-11', start: '08:00' });

    const result = expandEvents([timed, allDay, nextDay], '2026-03-01', '2026-03-31');
    expect(result.map((o) => o.event.id)).toEqual(['all', 'timed', 'next']);
  });

  it('区间外的发生不返回', () => {
    const ev = makeEvent({ date: '2026-03-01', repeat: 'daily' });
    const result = expandEvents([ev], '2026-03-10', '2026-03-12');
    expect(result).toHaveLength(3);
    expect(result[0]?.date).toBe('2026-03-10');
  });

  it('重复规则为 none 的旧事件不受影响', () => {
    const ev = makeEvent({ date: '2026-03-10', repeat: undefined });
    expect(expandEvents([ev], '2026-03-01', '2026-03-31')).toHaveLength(1);
  });
});