import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db';
import { noteRepo } from './noteRepo';

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('noteRepo.deriveTitle', () => {
  it('取第一行非空内容', () => {
    expect(noteRepo.deriveTitle('\n\n真正的标题\n正文')).toBe('真正的标题');
  });

  it('去掉开头的 Markdown 井号', () => {
    expect(noteRepo.deriveTitle('## 二级标题\n内容')).toBe('二级标题');
  });

  it('超长标题截断到 40 字并加省略号', () => {
    const long = '很'.repeat(50);
    const title = noteRepo.deriveTitle(long);
    expect(title).toHaveLength(41);
    expect(title.endsWith('…')).toBe(true);
  });

  it('空内容给兜底标题', () => {
    expect(noteRepo.deriveTitle('   \n\n')).toBe('无标题笔记');
  });
});

describe('noteRepo.create', () => {
  it('未指定标题时从正文推导', async () => {
    const note = await noteRepo.create({ content: '会议纪要\n讨论了排期' });
    expect(note.title).toBe('会议纪要');
    expect(note.pinned).toBe(false);
    expect(note.folderId).toBeNull();
  });

  it('显式标题优先于正文首行', async () => {
    const note = await noteRepo.create({ title: '自定义标题', content: '正文' });
    expect(note.title).toBe('自定义标题');
  });
});

describe('noteRepo.listRecent', () => {
  it('置顶的排在最前，其余按更新时间倒序', async () => {
    const older = await noteRepo.create({ title: '旧笔记', content: 'x' });
    const newer = await noteRepo.create({ title: '新笔记', content: 'y' });
    // 拉开时间差，避免同一毫秒导致排序不确定
    await db.notes.update(older.id, { updatedAt: '2020-01-01T00:00:00.000Z' });
    await db.notes.update(newer.id, { updatedAt: '2026-01-01T00:00:00.000Z' });

    const pinned = await noteRepo.create({ title: '置顶笔记', content: 'z' });
    await db.notes.update(pinned.id, { pinned: true, updatedAt: '2019-01-01T00:00:00.000Z' });

    const titles = (await noteRepo.listRecent(10)).map((note) => note.title);
    expect(titles[0]).toBe('置顶笔记');
    expect(titles.indexOf('新笔记')).toBeLessThan(titles.indexOf('旧笔记'));
  });

  it('遵守条数上限', async () => {
    for (let i = 0; i < 5; i += 1) {
      await noteRepo.create({ title: `笔记${i}`, content: 'x' });
    }
    expect(await noteRepo.listRecent(2)).toHaveLength(2);
  });
});

describe('noteRepo.remove', () => {
  it('移进回收站而不是物理删除', async () => {
    const note = await noteRepo.create({ title: '待删笔记', content: 'x' });
    await noteRepo.remove(note.id);

    expect(await db.notes.get(note.id)).toBeUndefined();
    const trash = await db.trash.toArray();
    expect(trash).toHaveLength(1);
    expect(trash[0]?.table).toBe('notes');
    expect(trash[0]?.label).toBe('待删笔记');
  });
});

describe('noteRepo.togglePin', () => {
  it('来回切换置顶状态', async () => {
    const note = await noteRepo.create({ title: 'A', content: 'x' });
    await noteRepo.togglePin(note.id);
    expect((await db.notes.get(note.id))?.pinned).toBe(true);
    await noteRepo.togglePin(note.id);
    expect((await db.notes.get(note.id))?.pinned).toBe(false);
  });
});
