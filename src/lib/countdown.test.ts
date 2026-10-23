import { describe, expect, it } from 'vitest';
import {
  counterDuration,
  holidayDate,
  nextHolidayDate,
  nextRepeatDate,
  repeatSummary,
} from './countdown';

describe('holidayDate', () => {
  it('resolves known 2026 dates', () => {
    expect(holidayDate('yuandan', 2026)).toBe('2026-01-01');
    expect(holidayDate('chunjie', 2026)).toBe('2026-02-17');
    expect(holidayDate('qingming', 2026)).toBe('2026-04-05');
    expect(holidayDate('duanwu', 2026)).toBe('2026-06-19');
    expect(holidayDate('zhongqiu', 2026)).toBe('2026-09-25');
    expect(holidayDate('guoqing', 2026)).toBe('2026-10-01');
  });
});

describe('nextHolidayDate', () => {
  it('rolls to next year after the holiday has passed', () => {
    expect(nextHolidayDate('guoqing', '2026-10-16')).toBe('2027-10-01');
    expect(nextHolidayDate('chunjie', '2026-02-01')).toBe('2026-02-17');
    expect(nextHolidayDate('yuandan', '2026-01-01')).toBe('2026-01-01');
  });
});

describe('counterDuration', () => {
  it('counts down to local midnight of the target date', () => {
    const now = new Date(2026, 9, 15, 23, 0, 0);
    const parts = counterDuration('down', '2026-10-16', now);
    expect(parts.past).toBe(false);
    expect(parts.days).toBe(0);
    expect(parts.hours).toBe(1);
  });

  it('counts up from the start date', () => {
    const now = new Date(2026, 9, 16, 3, 0, 0);
    const parts = counterDuration('up', '2026-10-14', now);
    expect(parts.past).toBe(false);
    expect(parts.days).toBe(2);
    expect(parts.hours).toBe(3);
  });
});


describe('nextRepeatDate', () => {
  const FROM = '2026-10-22'; // 周四

  it('none 直接返回锚点', () => {
    expect(nextRepeatDate('none', '2020-01-01', FROM)).toBe('2020-01-01');
  });

  it('yearly 取锚点的月日，今年未到用今年', () => {
    expect(nextRepeatDate('yearly', '1990-12-25', FROM)).toBe('2026-12-25');
  });

  it('yearly 已过滚到下一年', () => {
    expect(nextRepeatDate('yearly', '1990-01-01', FROM)).toBe('2027-01-01');
  });

  it('yearly 锚点是 2 月 29 时平年跳过', () => {
    expect(nextRepeatDate('yearly', '2024-02-29', '2026-01-01')).toBe('2028-02-29');
  });

  it('monthly 取同一几号，本月的过了滚下月', () => {
    expect(nextRepeatDate('monthly', '2020-01-15', '2026-10-22')).toBe('2026-11-15');
    expect(nextRepeatDate('monthly', '2020-01-22', FROM)).toBe('2026-10-22');
  });

  it('该月没有这天时钳到月末（2 月没有 31 号 → 2 月 28）', () => {
    expect(nextRepeatDate('monthly', '2020-01-31', '2026-02-20')).toBe('2026-02-28');
    expect(nextRepeatDate('monthly', '2020-01-31', '2026-03-01')).toBe('2026-03-31');
    expect(nextRepeatDate('monthly', '2020-01-30', '2026-02-01')).toBe('2026-02-28');
  });

  it('weekly 取同一 ISO 周几，含 from 当天', () => {
    expect(nextRepeatDate('weekly', '2020-01-02', FROM)).toBe('2026-10-22');
    expect(nextRepeatDate('weekly', '2020-01-03', FROM)).toBe('2026-10-23');
  });
});


describe('repeatSummary', () => {
  it('每周带上锚点的周几', () => {
    expect(repeatSummary('weekly', '2026-10-22')).toBe('每周四'); // 2026-10-22 是周四
    expect(repeatSummary('weekly', '2026-10-23')).toBe('每周五');
    expect(repeatSummary('weekly', '2026-10-19')).toBe('每周一');
    expect(repeatSummary('weekly', '2026-10-25')).toBe('每周日');
  });

  it('其他周期用标签原文，不带周几', () => {
    expect(repeatSummary('yearly', '2026-10-22')).toBe('每年');
    expect(repeatSummary('monthly', '2026-10-22')).toBe('每月');
    expect(repeatSummary('none', '2026-10-22')).toBe('不重复');
  });
});
