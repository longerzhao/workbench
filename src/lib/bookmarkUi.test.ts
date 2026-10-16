import { describe, expect, it } from 'vitest';
import { letterGlyph } from './bookmarkUi';

describe('letterGlyph', () => {
  it('uses title first character', () => {
    expect(letterGlyph('GitHub', 'https://github.com')).toBe('G');
  });

  it('falls back to hostname', () => {
    expect(letterGlyph('  ', 'https://www.example.com/path')).toBe('E');
  });

  it('uses ? when both empty', () => {
    expect(letterGlyph('', '')).toBe('?');
  });
});
