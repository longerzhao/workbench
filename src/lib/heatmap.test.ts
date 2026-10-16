import { describe, expect, it } from 'vitest';
import { buildYearCells, countByDate, intensityLevel, yearBounds } from './heatmap';

describe('intensityLevel', () => {
  it('maps zero and ratios', () => {
    expect(intensityLevel(0, 8)).toBe(0);
    expect(intensityLevel(1, 8)).toBe(1);
    expect(intensityLevel(3, 8)).toBe(2);
    expect(intensityLevel(5, 8)).toBe(3);
    expect(intensityLevel(8, 8)).toBe(4);
  });
});

describe('countByDate', () => {
  it('dedupes habits in all mode', () => {
    const map = countByDate([
      { date: '2026-01-01', habitId: 'a' },
      { date: '2026-01-01', habitId: 'b' },
      { date: '2026-01-01', habitId: 'a' },
      { date: '2026-01-02', habitId: 'a' },
    ]);
    expect(map.get('2026-01-01')).toBe(2);
    expect(map.get('2026-01-02')).toBe(1);
  });

  it('filters single habit', () => {
    const map = countByDate(
      [
        { date: '2026-01-01', habitId: 'a' },
        { date: '2026-01-01', habitId: 'b' },
      ],
      'a',
    );
    expect(map.get('2026-01-01')).toBe(1);
  });
});

describe('buildYearCells', () => {
  it('covers the year and counts active days', () => {
    const counts = new Map([['2026-06-15', 2]]);
    const { weeks, activeDays, max } = buildYearCells(2026, counts);
    expect(max).toBe(2);
    expect(activeDays).toBe(1);
    expect(weeks.length).toBeGreaterThan(50);
    expect(weeks[0]?.length).toBe(7);
    const flat = weeks.flat().filter((c) => c.date);
    expect(flat[0]?.date).toBe(yearBounds(2026).from);
  });
});
