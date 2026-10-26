import { describe, expect, it } from 'vitest';
import type { Bookmark } from '@/db/schema';
import {
  TILE_PALETTE,
  bookmarkTileColor,
  buildBookmarkTopology,
  filterBookmarks,
  letterGlyph,
  sortBookmarks,
} from './bookmarkUi';

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

describe('bookmarkTileColor', () => {
  it('同一域名永远同色', () => {
    const a = bookmarkTileColor('https://github.com/a');
    const b = bookmarkTileColor('https://github.com/b');
    expect(a).toBe(b);
  });

  it('颜色来自色板且不同域名尽量散开', () => {
    const urls = ['https://github.com', 'https://developer.mozilla.org', 'https://npmjs.com', 'https://caniuse.com', 'https://vercel.com', 'https://regex101.com'];
    const colors = new Set(urls.map(bookmarkTileColor));
    for (const c of colors) {
      expect(TILE_PALETTE).toContain(c);
    }
    // 6 个知名域名至少落到 4 种颜色，散列够开
    expect(colors.size).toBeGreaterThanOrEqual(4);
  });
});

describe('sortBookmarks', () => {
  const items = [
    { id: 'a', title: 'A', clicks: 2, order: 1 },
    { id: 'b', title: 'B', clicks: 5, order: 2 },
    { id: 'c', title: 'C', clicks: 0, order: 3 },
  ] as Bookmark[];

  it('manual 保持原顺序', () => {
    expect(sortBookmarks(items, 'manual').map((b) => b.id)).toEqual(['a', 'b', 'c']);
  });

  it('clicks 按次数降序且不改动原数组', () => {
    const sorted = sortBookmarks(items, 'clicks');
    expect(sorted.map((b) => b.id)).toEqual(['b', 'a', 'c']);
    expect(items.map((b) => b.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('filterBookmarks', () => {
  const items = [
    { id: 'a', title: 'GitHub', url: 'https://github.com' },
    { id: 'b', title: 'MDN', url: 'https://developer.mozilla.org' },
    { id: 'c', title: 'npm', url: 'https://npmjs.com' },
  ] as Bookmark[];

  it('按标题匹配（大小写不敏感）', () => {
    expect(filterBookmarks(items, 'git').map((b) => b.id)).toEqual(['a']);
    expect(filterBookmarks(items, 'GIT').map((b) => b.id)).toEqual(['a']);
  });

  it('按域名匹配', () => {
    expect(filterBookmarks(items, 'mozilla').map((b) => b.id)).toEqual(['b']);
  });

  it('空查询原样返回', () => {
    expect(filterBookmarks(items, '  ')).toBe(items);
  });

  it('无匹配返回空数组', () => {
    expect(filterBookmarks(items, 'zzz')).toEqual([]);
  });
});

describe('buildBookmarkTopology', () => {
  const items = [
    { id: '1', group: '开发', title: 'GitHub', order: 1 },
    { id: '2', group: '开发', title: 'MDN', order: 2 },
    { id: '3', group: '设计', title: 'Figma', order: 1 },
  ] as Bookmark[];

  it('按 groupOrder 输出，空分组保留', () => {
    const cols = buildBookmarkTopology(items, ['设计', '开发', '常用']);
    expect(cols.map((c) => c.group)).toEqual(['设计', '开发', '常用']);
    expect(cols[2]?.items).toEqual([]);
    expect(cols[1]?.items.map((b) => b.title)).toEqual(['GitHub', 'MDN']);
  });

  it('书签里出现但顺序里没有的分组按名称接尾', () => {
    const cols = buildBookmarkTopology(items, ['设计']);
    expect(cols.map((c) => c.group)).toEqual(['设计', '开发']);
  });

  it('顺序与书签都为空时输出空数组', () => {
    expect(buildBookmarkTopology([], [])).toEqual([]);
  });
});
