import { describe, expect, it } from 'vitest';
import { counterDuration, holidayDate, nextHolidayDate } from './countdown';

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
