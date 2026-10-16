import type { Note, NoteFolder } from '@/db/schema';

export type NoteTreeNoteNode = {
  type: 'note';
  note: Note;
};

export type NoteTreeFolderNode = {
  type: 'folder';
  folder: NoteFolder;
  children: NoteTreeNode[];
};

export type NoteTreeNode = NoteTreeFolderNode | NoteTreeNoteNode;

function byNoteRecency(a: Note, b: Note): number {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  return b.updatedAt.localeCompare(a.updatedAt);
}

function byFolderOrder(a: NoteFolder, b: NoteFolder): number {
  return a.order - b.order || a.name.localeCompare(b.name);
}

/** 将扁平 folders + notes 建成根级树（目录下：子目录在前，笔记在后） */
export function buildNoteTree(folders: NoteFolder[], notes: Note[]): NoteTreeNode[] {
  const foldersByParent = new Map<string | null, NoteFolder[]>();
  for (const folder of folders) {
    const key = folder.parentId;
    const list = foldersByParent.get(key) ?? [];
    list.push(folder);
    foldersByParent.set(key, list);
  }
  for (const list of foldersByParent.values()) list.sort(byFolderOrder);

  const notesByFolder = new Map<string | null, Note[]>();
  for (const note of notes) {
    const key = note.folderId ?? null;
    const list = notesByFolder.get(key) ?? [];
    list.push(note);
    notesByFolder.set(key, list);
  }
  for (const list of notesByFolder.values()) list.sort(byNoteRecency);

  const walk = (parentId: string | null): NoteTreeNode[] => {
    const childFolders = foldersByParent.get(parentId) ?? [];
    const childNotes = notesByFolder.get(parentId) ?? [];
    return [
      ...childFolders.map(
        (folder): NoteTreeFolderNode => ({
          type: 'folder',
          folder,
          children: walk(folder.id),
        }),
      ),
      ...childNotes.map((note): NoteTreeNoteNode => ({ type: 'note', note })),
    ];
  };

  return walk(null);
}

/** 若把 folderId 移到 newParentId 下会不会成环 */
export function wouldCreateCycle(
  folders: NoteFolder[],
  folderId: string,
  newParentId: string | null,
): boolean {
  if (newParentId === null) return false;
  if (newParentId === folderId) return true;
  const byId = new Map(folders.map((f) => [f.id, f]));
  let cur: string | null = newParentId;
  const guard = new Set<string>();
  while (cur) {
    if (cur === folderId) return true;
    if (guard.has(cur)) return true;
    guard.add(cur);
    cur = byId.get(cur)?.parentId ?? null;
  }
  return false;
}

/** 删除目录后，直接子项应提升到的 parentId */
export function liftTargetParentId(
  folders: NoteFolder[],
  deletedFolderId: string,
): string | null {
  return folders.find((f) => f.id === deletedFolderId)?.parentId ?? null;
}

/** 从某目录向上收集祖先 id（含自身），用于自动展开 */
export function ancestorFolderIds(
  folders: NoteFolder[],
  folderId: string | null | undefined,
): string[] {
  if (!folderId) return [];
  const byId = new Map(folders.map((f) => [f.id, f]));
  const ids: string[] = [];
  let cur: string | null = folderId;
  const guard = new Set<string>();
  while (cur && !guard.has(cur)) {
    guard.add(cur);
    ids.push(cur);
    cur = byId.get(cur)?.parentId ?? null;
  }
  return ids;
}
