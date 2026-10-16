import { describe, expect, it } from 'vitest';
import { zodiacKeyForYear, zodiacLabelForYear, zodiacSrcForYear } from './zodiac';

describe('zodiacKeyForYear', () => {
  it('maps known years', () => {
    expect(zodiacKeyForYear(2020)).toBe('shu');
    expect(zodiacKeyForYear(2025)).toBe('she');
    expect(zodiacKeyForYear(2026)).toBe('ma');
    expect(zodiacKeyForYear(2032)).toBe('shu');
  });

  it('handles negative modulo safely', () => {
    expect(zodiacKeyForYear(4)).toBe('shu');
    expect(zodiacKeyForYear(3)).toBe('zhu');
  });
});

describe('zodiac helpers', () => {
  it('builds src and label', () => {
    expect(zodiacSrcForYear(2026)).toBe('/zodiac/ma.svg');
    expect(zodiacLabelForYear(2026)).toBe('马');
  });
});
