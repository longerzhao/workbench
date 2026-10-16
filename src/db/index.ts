import type { Table } from 'dexie';
import { db, type EntityTableName, type TrashRecord } from './schema';

export { db, WorkbenchDB, ENTITY_TABLES } from './schema';
export type * from './schema';

/** 统一的时间戳来源，便于将来注入假时钟做测试 */
export function nowISO(): string {
  return new Date().toISOString();
}

export async function metaGet(key: string): Promise<string | undefined> {
  const row = await db.meta.get(key);
  return row?.value;
}

export async function metaSet(key: string, value: string): Promise<void> {
  await db.meta.put({ key, value });
}

/**
 * 软删除：实体移入回收站，7 天内可撤销。
 * 硬删除只允许从回收站发起（purge）。
 */
export async function moveToTrash(
  table: EntityTableName,
  entityId: string,
  label: string,
): Promise<void> {
  const source = db.table(table) as Table<{ id: string }, string>;
  const payload = await source.get(entityId);
  if (payload === undefined) return;

  const record: TrashRecord = {
    id: `${table}:${entityId}`,
    table,
    entityId,
    payload,
    label,
    deletedAt: nowISO(),
  };

  await db.transaction('rw', db.trash, source, async () => {
    await db.trash.put(record);
    await source.delete(entityId);
  });
}

export async function restoreFromTrash(trashId: string): Promise<void> {
  const record = await db.trash.get(trashId);
  if (!record) return;

  const target = db.table(record.table) as Table<{ id: string }, string>;
  await db.transaction('rw', db.trash, target, async () => {
    await target.put(record.payload as { id: string });
    await db.trash.delete(trashId);
  });
}

export async function purgeFromTrash(trashId: string): Promise<void> {
  await db.trash.delete(trashId);
}

export async function emptyTrash(): Promise<void> {
  await db.trash.clear();
}

/** 清掉超过保留期的回收站条目 */
export async function pruneTrash(retentionDays = 7): Promise<number> {
  const cutoff = Date.now() - retentionDays * 86_400_000;
  const all = await db.trash.toArray();
  const expired = all.filter((r) => new Date(r.deletedAt).getTime() < cutoff).map((r) => r.id);
  if (expired.length > 0) await db.trash.bulkDelete(expired);
  return expired.length;
}
