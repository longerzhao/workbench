import { describe, expect, it } from 'vitest';
import { fuzzyMatch, rankByFuzzy, splitHighlight } from './fuzzy';

describe('fuzzyMatch', () => {
  it('空查询命中一切，得分为 0', () => {
    expect(fuzzyMatch('', '任意文本')).toEqual({ score: 0, positions: [] });
    expect(fuzzyMatch('   ', '任意文本')).toEqual({ score: 0, positions: [] });
  });

  it('按顺序命中子序列', () => {
    const hit = fuzzyMatch('td', 'todo');
    expect(hit).not.toBeNull();
    expect(hit!.positions).toEqual([0, 2]);
  });

  it('顺序不对就算不命中', () => {
    expect(fuzzyMatch('dt', 'todo')).toBeNull();
  });

  it('缺少字符就不命中', () => {
    expect(fuzzyMatch('todos', 'todo')).toBeNull();
  });

  it('连续命中比分散命中分高', () => {
    const contiguous = fuzzyMatch('abc', 'abcdef')!;
    const scattered = fuzzyMatch('abc', 'axbxcx')!;
    expect(contiguous.score).toBeGreaterThan(scattered.score);
  });

  it('开头命中比中间命中分高', () => {
    const atStart = fuzzyMatch('note', 'note list')!;
    const inMiddle = fuzzyMatch('note', 'my note list')!;
    expect(atStart.score).toBeGreaterThan(inMiddle.score);
  });

  it('中文按字符顺序匹配', () => {
    const hit = fuzzyMatch('周报', '写周报')!;
    expect(hit.positions).toEqual([1, 2]);
  });

  it('忽略大小写', () => {
    expect(fuzzyMatch('TODO', 'todo list')).not.toBeNull();
  });
});

describe('splitHighlight', () => {
  it('没有命中位置时整段不高亮', () => {
    expect(splitHighlight('abc', [])).toEqual([['abc', false]]);
  });

  it('把命中位置切出来', () => {
    expect(splitHighlight('abcd', [0, 2])).toEqual([
      ['a', true],
      ['b', false],
      ['c', true],
      ['d', false],
    ]);
  });

  it('相邻命中合并成一段', () => {
    expect(splitHighlight('abcd', [1, 2])).toEqual([
      ['a', false],
      ['bc', true],
      ['d', false],
    ]);
  });
});

describe('rankByFuzzy', () => {
  const items = [
    { id: '1', title: '写周报' },
    { id: '2', title: '周报模板整理' },
    { id: '3', title: '买牛奶' },
  ];

  it('只返回命中的条目并按分数排序', () => {
    const ranked = rankByFuzzy('周报', items, (item) => item.title, 5);
    expect(ranked.map((r) => r.item.id)).toEqual(['2', '1']);
  });

  it('遵守 limit', () => {
    const ranked = rankByFuzzy('', items, (item) => item.title, 2);
    expect(ranked).toHaveLength(2);
  });

  it('没有命中时返回空数组', () => {
    expect(rankByFuzzy('xyz', items, (item) => item.title, 5)).toEqual([]);
  });
});
