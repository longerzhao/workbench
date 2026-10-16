import { describe, expect, it } from 'vitest';
import type { Note, NoteFolder } from '@/db/schema';
import { buildNoteTree, liftTargetParentId, wouldCreateCycle } from './noteTree';

const ts = '2026-10-16T00:00:00.000Z';

function folder(partial: Partial<NoteFolder> & Pick<NoteFolder, 'id' | 'name'>): NoteFolder {
  return {
    parentId: null,
    order: 0,
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}

function note(partial: Partial<Note> & Pick<Note, 'id' | 'title'>): Note {
  return {
    content: '',
    tags: [],
    pinned: false,
    folderId: null,
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}

describe('buildNoteTree', () => {
  it('nests folders and notes', () => {
    const folders = [
      folder({ id: 'f1', name: '工作', order: 0 }),
      folder({ id: 'f2', name: '项目', parentId: 'f1', order: 0 }),
    ];
    const notes = [
      note({ id: 'n1', title: '根笔记', folderId: null, updatedAt: '2026-10-16T02:00:00.000Z' }),
      note({ id: 'n2', title: '工作笔记', folderId: 'f1', updatedAt: '2026-10-16T01:00:00.000Z' }),
      note({ id: 'n3', title: '项目笔记', folderId: 'f2' }),
    ];
    const tree = buildNoteTree(folders, notes);
    expect(tree).toHaveLength(2);
    expect(tree[0]).toMatchObject({ type: 'folder', folder: { id: 'f1' } });
    if (tree[0]?.type !== 'folder') throw new Error('expected folder');
    expect(tree[0].children.map((c) => (c.type === 'folder' ? c.folder.id : c.note.id))).toEqual([
      'f2',
      'n2',
    ]);
    expect(tree[1]).toMatchObject({ type: 'note', note: { id: 'n1' } });
  });

  it('puts pinned notes first within a folder', () => {
    const notes = [
      note({ id: 'a', title: 'a', folderId: null, pinned: false, updatedAt: '2026-10-16T03:00:00.000Z' }),
      note({ id: 'b', title: 'b', folderId: null, pinned: true, updatedAt: '2026-10-16T01:00:00.000Z' }),
    ];
    const tree = buildNoteTree([], notes);
    expect(tree.map((n) => (n.type === 'note' ? n.note.id : ''))).toEqual(['b', 'a']);
  });
});

describe('wouldCreateCycle', () => {
  const folders = [
    folder({ id: 'a', name: 'A' }),
    folder({ id: 'b', name: 'B', parentId: 'a' }),
    folder({ id: 'c', name: 'C', parentId: 'b' }),
  ];

  it('detects self and descendant parents', () => {
    expect(wouldCreateCycle(folders, 'a', 'a')).toBe(true);
    expect(wouldCreateCycle(folders, 'a', 'c')).toBe(true);
    expect(wouldCreateCycle(folders, 'b', 'a')).toBe(false);
    expect(wouldCreateCycle(folders, 'c', null)).toBe(false);
  });
});

describe('liftTargetParentId', () => {
  it('returns deleted folder parent', () => {
    const folders = [folder({ id: 'a', name: 'A' }), folder({ id: 'b', name: 'B', parentId: 'a' })];
    expect(liftTargetParentId(folders, 'b')).toBe('a');
    expect(liftTargetParentId(folders, 'a')).toBe(null);
  });
});
