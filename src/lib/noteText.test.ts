import { describe, expect, it } from 'vitest';
import { formatTagsInput, parseTagsInput, summarizeNote } from './noteText';

describe('summarizeNote', () => {
  it('uses first non-empty line and strips light markdown', () => {
    expect(summarizeNote('# Hello **world**\n\nmore')).toBe('Hello world');
  });

  it('truncates long lines', () => {
    const long = 'a'.repeat(100);
    expect(summarizeNote(long, 10)).toBe(`${'a'.repeat(9)}…`);
  });

  it('handles empty content', () => {
    expect(summarizeNote('   \n  ')).toBe('空笔记');
  });
});

describe('parseTagsInput / formatTagsInput', () => {
  it('splits on comma and whitespace, dedupes', () => {
    expect(parseTagsInput('a, b  a，c')).toEqual(['a', 'b', 'c']);
  });

  it('round-trips via format', () => {
    expect(formatTagsInput(['x', 'y'])).toBe('x, y');
    expect(parseTagsInput(formatTagsInput(['x', 'y']))).toEqual(['x', 'y']);
  });
});
