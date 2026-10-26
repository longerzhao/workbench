import { db, moveToTrash, nowISO, purgeFromTrash, restoreFromTrash } from '..';
import type { Note, TrashRecord } from '../schema';
import { newId } from '@/lib/id';
import { toDateKey, type DateKey } from '@/lib/date';

export interface NewNoteInput {
  title?: string;
  content: string;
  tags?: string[];
  pinned?: boolean;
  folderId?: string | null;
}

/** 置顶优先，其余按最近更新 */
function byRecency(a: Note, b: Note): number {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  return b.updatedAt.localeCompare(a.updatedAt);
}

export const noteRepo = {
  async listAll(): Promise<Note[]> {
    const rows = await db.notes.toArray();
    return rows.sort(byRecency);
  },

  /** 主页面「速记」卡用的最近条目 */
  async listRecent(limit = 5): Promise<Note[]> {
    const rows = await db.notes.toArray();
    return rows.sort(byRecency).slice(0, limit);
  },

  async countAll(): Promise<number> {
    return db.notes.count();
  },

  async countCreatedOn(date: DateKey): Promise<number> {
    const rows = await db.notes.toArray();
    return rows.filter((n) => toDateKey(n.createdAt) === date).length;
  },

  async get(id: string): Promise<Note | undefined> {
    return db.notes.get(id);
  },

  /** 从正文首行推导标题，避免速记时被迫先想标题 */
  deriveTitle(content: string): string {
    const firstLine = content.split('\n').find((line) => line.trim().length > 0) ?? '';
    const clean = firstLine.replace(/^#+\s*/, '').trim();
    if (!clean) return '无标题笔记';
    return clean.length > 40 ? `${clean.slice(0, 40)}…` : clean;
  },

  async create(input: NewNoteInput): Promise<Note> {
    const ts = nowISO();
    const note: Note = {
      id: newId('note'),
      title: (input.title ?? this.deriveTitle(input.content)).trim(),
      content: input.content,
      tags: input.tags ?? [],
      pinned: input.pinned ?? false,
      folderId: input.folderId ?? null,
      createdAt: ts,
      updatedAt: ts,
    };
    await db.notes.add(note);
    return note;
  },

  async update(id: string, patch: Partial<Omit<Note, 'id' | 'createdAt'>>): Promise<void> {
    await db.notes.update(id, { ...patch, updatedAt: nowISO() });
  },

  async moveToFolder(id: string, folderId: string | null): Promise<void> {
    if (folderId) {
      const folder = await db.noteFolders.get(folderId);
      if (!folder) throw new Error('目标目录不存在');
    }
    await db.notes.update(id, { folderId, updatedAt: nowISO() });
  },

  async togglePin(id: string): Promise<void> {
    const note = await db.notes.get(id);
    if (!note) return;
    await db.notes.update(id, { pinned: !note.pinned, updatedAt: nowISO() });
  },

  async remove(id: string): Promise<void> {
    const note = await db.notes.get(id);
    if (!note) return;
    await moveToTrash('notes', id, note.title);
  },

  /** 回收站里的笔记 */
  async listTrashNotes(): Promise<TrashRecord[]> {
    const rows = await db.trash.where('table').equals('notes').toArray();
    return rows.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  },

  async restoreTrash(trashId: string): Promise<void> {
    await restoreFromTrash(trashId);
  },

  async purgeTrash(trashId: string): Promise<void> {
    await purgeFromTrash(trashId);
  },

  async emptyTrashNotes(): Promise<number> {
    const rows = await db.trash.where('table').equals('notes').toArray();
    if (rows.length === 0) return 0;
    await db.trash.bulkDelete(rows.map((r) => r.id));
    return rows.length;
  },
};
