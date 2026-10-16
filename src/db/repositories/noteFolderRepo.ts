import { db, nowISO } from '..';
import type { NoteFolder } from '../schema';
import { newId } from '@/lib/id';
import { liftTargetParentId, wouldCreateCycle } from '@/lib/noteTree';

export interface NewNoteFolderInput {
  name: string;
  parentId?: string | null;
}

export const noteFolderRepo = {
  async listAll(): Promise<NoteFolder[]> {
    const rows = await db.noteFolders.toArray();
    return rows.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  },

  async get(id: string): Promise<NoteFolder | undefined> {
    return db.noteFolders.get(id);
  },

  async create(input: NewNoteFolderInput): Promise<NoteFolder> {
    const parentId = input.parentId ?? null;
    const all = await db.noteFolders.toArray();
    const sameParent = all.filter((f) => f.parentId === parentId);
    const maxOrder = sameParent.reduce((m, f) => Math.max(m, f.order), -1);

    const ts = nowISO();
    const folder: NoteFolder = {
      id: newId('nfolder'),
      name: input.name.trim() || '未命名目录',
      parentId,
      order: maxOrder + 1,
      createdAt: ts,
      updatedAt: ts,
    };
    await db.noteFolders.add(folder);
    return folder;
  },

  async rename(id: string, name: string): Promise<void> {
    const clean = name.trim();
    if (!clean) throw new Error('目录名不能为空');
    await db.noteFolders.update(id, { name: clean, updatedAt: nowISO() });
  },

  async move(id: string, newParentId: string | null): Promise<void> {
    const folders = await db.noteFolders.toArray();
    if (!folders.some((f) => f.id === id)) throw new Error('目录不存在');
    if (newParentId && !folders.some((f) => f.id === newParentId)) {
      throw new Error('目标目录不存在');
    }
    if (wouldCreateCycle(folders, id, newParentId)) {
      throw new Error('不能把目录移到自己的子目录下');
    }
    const siblings = folders.filter((f) => f.parentId === newParentId && f.id !== id);
    const maxOrder = siblings.reduce((m, f) => Math.max(m, f.order), -1);
    await db.noteFolders.update(id, {
      parentId: newParentId,
      order: maxOrder + 1,
      updatedAt: nowISO(),
    });
  },

  /** 删除目录：子目录与笔记提升到父级 */
  async remove(id: string): Promise<void> {
    const folders = await db.noteFolders.toArray();
    const target = folders.find((f) => f.id === id);
    if (!target) return;
    const liftTo = liftTargetParentId(folders, id);

    await db.transaction('rw', db.noteFolders, db.notes, async () => {
      const allFolders = await db.noteFolders.toArray();
      for (const child of allFolders.filter((f) => f.parentId === id)) {
        await db.noteFolders.update(child.id, { parentId: liftTo, updatedAt: nowISO() });
      }
      const notes = await db.notes.toArray();
      for (const note of notes.filter((n) => n.folderId === id)) {
        await db.notes.update(note.id, { folderId: liftTo, updatedAt: nowISO() });
      }
      await db.noteFolders.delete(id);
    });
  },
};
