import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { bookmarkRepo, DEFAULT_BOOKMARK_GROUP } from './bookmarkRepo';

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

async function seed(...groups: string[]) {
  for (const group of groups) {
    await bookmarkRepo.create({
      title: `${group}-条目`,
      url: `https://example.com/${encodeURIComponent(group)}`,
      group,
    });
  }
}

describe('bookmarkRepo.listGroupNames', () => {
  it('无数据时给出默认分组', async () => {
    expect(await bookmarkRepo.listGroupNames()).toEqual([DEFAULT_BOOKMARK_GROUP]);
  });

  it('按名称排序作为兜底（尚未排定过顺序时）', async () => {
    await seed('开发', '效率', '设计');
    // localeCompare 按拼音：开发 < 设计 < 效率
    expect(await bookmarkRepo.listGroupNames()).toEqual(['开发', '设计', '效率']);
  });

  it('重排后按拖定的顺序返回', async () => {
    await seed('开发', '效率', '设计');
    await bookmarkRepo.reorderGroups(['设计', '开发', '效率']);
    expect(await bookmarkRepo.listGroupNames()).toEqual(['设计', '开发', '效率']);
  });

  it('排定时未出现的分组接在末尾，不会丢', async () => {
    await seed('开发', '效率', '设计');
    await bookmarkRepo.reorderGroups(['设计']);
    // 「开发」「效率」没被排定，补在后面
    expect(await bookmarkRepo.listGroupNames()).toEqual(['设计', '开发', '效率']);
  });

  it('排序对新出现的分组同样生效', async () => {
    await seed('开发', '效率');
    await bookmarkRepo.reorderGroups(['效率', '开发']);

    await bookmarkRepo.create({ title: '新组', url: 'https://new.example.com', group: '归档' });
    // 新分组还没被排定，落在已排定项之后
    expect(await bookmarkRepo.listGroupNames()).toEqual(['效率', '开发', '归档']);
  });

  it('排序只记一次，新建分组不影响已有顺序', async () => {
    await seed('开发', '效率');
    await bookmarkRepo.reorderGroups(['效率', '开发']);

    await bookmarkRepo.create({ title: 'x', url: 'https://x.example.com', group: '临时' });
    await bookmarkRepo.reorderGroups(['效率', '开发']);
    expect(await bookmarkRepo.listGroupNames()).toEqual(['效率', '开发', '临时']);
  });

  it('空数组不写入，保留原顺序', async () => {
    await seed('开发', '效率');
    await bookmarkRepo.reorderGroups(['效率', '开发']);
    await bookmarkRepo.reorderGroups([]);
    expect(await bookmarkRepo.listGroupNames()).toEqual(['效率', '开发']);
  });
});