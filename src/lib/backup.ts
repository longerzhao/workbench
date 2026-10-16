import { z } from 'zod';
import { db, nowISO } from '@/db';
import type { EntityTableName, HabitLog } from '@/db/schema';

const BACKUP_APP = 'zlong-workbench';
const BACKUP_VERSION = 1;

/* -------------------------------------------------------------------------- */
/* 校验 schema                                                                */
/* 用 looseObject 而非 object：导入新版本导出的备份时，未知字段会被保留而不是被丢弃 */
/* -------------------------------------------------------------------------- */

const subTaskSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  done: z.boolean(),
});

const todoSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  done: z.boolean(),
  priority: z.number().int().min(0).max(3),
  tags: z.array(z.string()),
  subtasks: z.array(subTaskSchema),
  order: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  note: z.string().optional(),
  dueDate: z.string().optional(),
  projectId: z.string().optional(),
  completedAt: z.string().optional(),
});

const projectSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  order: z.number(),
  createdAt: z.string(),
});

const noteSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  pinned: z.boolean(),
  folderId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const noteFolderSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
  order: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const habitSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  targetPerWeek: z.number(),
  archived: z.boolean(),
  order: z.number(),
  createdAt: z.string(),
});

const habitLogSchema = z.looseObject({
  id: z.string(),
  habitId: z.string(),
  date: z.string(),
  count: z.number(),
  createdAt: z.string(),
});

const pomodoroSchema = z.looseObject({
  id: z.string(),
  type: z.enum(['focus', 'break']),
  durationSec: z.number(),
  startedAt: z.string(),
  date: z.string(),
  completed: z.boolean(),
  endedAt: z.string().optional(),
  todoId: z.string().optional(),
});

const eventSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  start: z.string(),
  end: z.string(),
  allDay: z.boolean(),
  color: z.string(),
  createdAt: z.string(),
  note: z.string().optional(),
});

const bookmarkSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  group: z.string(),
  order: z.number(),
  clicks: z.number(),
  createdAt: z.string(),
});

const metaSchema = z.looseObject({ key: z.string(), value: z.string() });

/** 每个表都允许缺席（兼容只导出了部分的备份） */
export const backupSchema = z.looseObject({
  app: z.literal(BACKUP_APP),
  version: z.number().int().positive(),
  exportedAt: z.string(),
  data: z.looseObject({
    todos: z.array(todoSchema).default([]),
    projects: z.array(projectSchema).default([]),
    notes: z.array(noteSchema).default([]),
    noteFolders: z.array(noteFolderSchema).default([]),
    habits: z.array(habitSchema).default([]),
    habitLogs: z.array(habitLogSchema).default([]),
    pomodoros: z.array(pomodoroSchema).default([]),
    events: z.array(eventSchema).default([]),
    bookmarks: z.array(bookmarkSchema).default([]),
    meta: z.array(metaSchema).default([]),
  }),
});

export type BackupFile = z.infer<typeof backupSchema>;

/** 备份里包含的表 = 实体表 + noteFolders + meta（回收站刻意不导出） */
export const BACKUP_TABLES = [
  'todos',
  'projects',
  'notes',
  'noteFolders',
  'habits',
  'habitLogs',
  'pomodoros',
  'events',
  'bookmarks',
  'meta',
] as const satisfies readonly (EntityTableName | 'meta' | 'noteFolders')[];

export type BackupTable = (typeof BACKUP_TABLES)[number];

/* -------------------------------------------------------------------------- */
/* 导出                                                                        */
/* -------------------------------------------------------------------------- */

export async function buildSnapshot(): Promise<BackupFile> {
  const [todos, projects, notes, noteFolders, habits, habitLogs, pomodoros, events, bookmarks, meta] =
    await Promise.all([
      db.todos.toArray(),
      db.projects.toArray(),
      db.notes.toArray(),
      db.noteFolders.toArray(),
      db.habits.toArray(),
      db.habitLogs.toArray(),
      db.pomodoros.toArray(),
      db.events.toArray(),
      db.bookmarks.toArray(),
      db.meta.toArray(),
    ]);

  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: nowISO(),
    data: {
      todos,
      projects,
      notes,
      noteFolders,
      habits,
      habitLogs,
      pomodoros,
      events,
      bookmarks,
      meta,
    },
  } as unknown as BackupFile;
}

export function countByTable(snapshot: BackupFile): Record<BackupTable, number> {
  const counts = {} as Record<BackupTable, number>;
  for (const table of BACKUP_TABLES) {
    counts[table] = snapshot.data[table].length;
  }
  return counts;
}

export function backupFileName(at: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}-${pad(at.getHours())}${pad(at.getMinutes())}`;
  return `workbench-${stamp}.json`;
}

export function downloadSnapshot(snapshot: BackupFile): void {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = backupFileName();
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/* -------------------------------------------------------------------------- */
/* 导入                                                                        */
/* -------------------------------------------------------------------------- */

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupValidationError';
  }
}

export function parseBackupText(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupValidationError('文件不是合法的 JSON，可能已损坏或选错了文件。');
  }

  const result = backupSchema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path.join('.') ?? '未知字段';
    throw new BackupValidationError(`备份结构校验失败（${path}）：${first?.message ?? '格式不符'}`);
  }
  return result.data;
}

export async function parseBackupFile(file: File): Promise<BackupFile> {
  return parseBackupText(await file.text());
}

/**
 * 修掉跨表引用：孤儿打卡记录直接丢弃，指向不存在项目的任务退回收件箱。
 * 合并导入最容易产生这类脏数据，必须在入库前处理。
 */
export function sanitizeSnapshot(snapshot: BackupFile): { snapshot: BackupFile; repaired: number } {
  const projectIds = new Set(snapshot.data.projects.map((p) => p.id));
  const habitIds = new Set(snapshot.data.habits.map((h) => h.id));
  let repaired = 0;

  const todos = snapshot.data.todos.map((todo) => {
    if (todo.projectId && !projectIds.has(todo.projectId)) {
      repaired += 1;
      return { ...todo, projectId: undefined };
    }
    return todo;
  });

  const habitLogs = snapshot.data.habitLogs.filter((log: HabitLog) => {
    const ok = habitIds.has(log.habitId);
    if (!ok) repaired += 1;
    return ok;
  });

  const folderIds = new Set(snapshot.data.noteFolders.map((f) => f.id));
  const notes = snapshot.data.notes.map((note) => {
    if (note.folderId && !folderIds.has(note.folderId)) {
      repaired += 1;
      return { ...note, folderId: null };
    }
    if (note.folderId === undefined) return { ...note, folderId: null };
    return note;
  });

  return {
    snapshot: { ...snapshot, data: { ...snapshot.data, todos, habitLogs, notes } },
    repaired,
  };
}

export type ImportMode = 'merge' | 'replace';

export interface ImportResult {
  mode: ImportMode;
  imported: Record<BackupTable, number>;
  repaired: number;
}

/**
 * 写入备份。
 * - replace：清空后整体替换（调用方负责先落地一份快照）
 * - merge：按 id upsert，同 id 以备份为准
 */
export async function applySnapshot(
  raw: BackupFile,
  mode: ImportMode = 'merge',
): Promise<ImportResult> {
  const { snapshot, repaired } = sanitizeSnapshot(raw);

  await db.transaction('rw', db.tables, async () => {
    if (mode === 'replace') {
      await Promise.all(BACKUP_TABLES.map((table) => db.table(table).clear()));
    }
    for (const table of BACKUP_TABLES) {
      const rows = snapshot.data[table];
      if (rows.length > 0) {
        await db.table(table).bulkPut(rows);
      }
    }
  });

  return { mode, imported: countByTable(snapshot), repaired };
}

/** 清空业务数据（含回收站），meta 一并重置以便重新播种 */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });
}
