import { describe, expect, it } from 'vitest';
import { currentStreak, longestStreak, weekHitCount } from './habitStats';

describe('currentStreak', () => {
  it('counts back from today when today is hit', () => {
    const hit = new Set(['2026-10-13', '2026-10-14', '2026-10-15']);
    expect(currentStreak(hit, '2026-10-15')).toBe(3);
  });

  it('ignores missing today and continues from yesterday', () => {
    const hit = new Set(['2026-10-13', '2026-10-14']);
    expect(currentStreak(hit, '2026-10-15')).toBe(2);
  });

  it('returns 0 when today and yesterday miss', () => {
    const hit = new Set(['2026-10-12']);
    expect(currentStreak(hit, '2026-10-15')).toBe(0);
  });
});

describe('longestStreak', () => {
  it('finds max consecutive run', () => {
    const hit = new Set(['2026-01-01', '2026-01-02', '2026-01-04', '2026-01-05', '2026-01-06']);
    expect(longestStreak(hit)).toBe(3);
  });

  it('returns 0 for empty', () => {
    expect(longestStreak(new Set())).toBe(0);
  });
});

describe('weekHitCount', () => {
  it('counts inclusive range', () => {
    const hit = new Set(['2026-10-13', '2026-10-15']);
    expect(weekHitCount(hit, '2026-10-13', '2026-10-19')).toBe(2);
  });
});
