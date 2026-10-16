import { describe, expect, it } from 'vitest';
import {
  buildMonthCells,
  eventBlockStyle,
  isValidTimeRange,
  shiftAnchor,
  timeToMinutes,
  weekDates,
} from './calendarGrid';

describe('buildMonthCells', () => {
  it('returns weeks of 7 and marks inMonth', () => {
    // 2026-10-01 is Thursday
    const weeks = buildMonthCells(2026, 9);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks.flat().some((c) => c.date === '2026-10-01' && c.inMonth)).toBe(true);
    expect(weeks[0]?.[0]?.date).toBe('2026-09-28'); // Monday before
  });
});

describe('weekDates', () => {
  it('returns Mon–Sun for anchor', () => {
    expect(weekDates('2026-10-15')).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
    ]);
  });
});

describe('time helpers', () => {
  it('parses and validates ranges', () => {
    expect(timeToMinutes('09:30')).toBe(570);
    expect(isValidTimeRange('09:00', '10:00', false)).toBe(true);
    expect(isValidTimeRange('10:00', '09:00', false)).toBe(false);
    expect(isValidTimeRange('10:00', '09:00', true)).toBe(true);
  });

  it('computes block style within day band', () => {
    const style = eventBlockStyle('08:00', '10:00');
    expect(style).not.toBeNull();
    expect(style!.top).toBe('12.5%'); // (8-6)/16
    expect(style!.height).toBe('12.5%');
  });
});

describe('shiftAnchor', () => {
  it('shifts year, month and week', () => {
    expect(shiftAnchor('2026-10-15', 'year', 1)).toBe('2027-01-01');
    expect(shiftAnchor('2026-10-15', 'month', 1)).toBe('2026-11-01');
    expect(shiftAnchor('2026-10-15', 'week', -1)).toBe('2026-10-08');
  });
});
