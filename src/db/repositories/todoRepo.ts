import { db, moveToTrash, nowISO, purgeFromTrash, restoreFromTrash } from '..';
import type { Priority, SubTask, Todo, TrashRecord } from '../schema';
import { newId } from '@/lib/id';
import { toDateKey, todayKey, recentDays, type DateKey } from '@/lib/date';
import {
  applyProjectFilter,
  matchesView,
  sortForView,
  type TodoView,
} from '@/lib/todoFilters';

export interface NewTodoInput {
  title: string;
  note?: string;
  priority?: Priority;
  dueDate?: DateKey;
  projectId?: string;
  tags?: string[];
}

export interface TodoListFilter {
  view: Exclude<TodoView, 'trash'>;
  projectId?: string;
}

/** 排序：先看到期的，到期日相同比优先级，最后按手工顺序 */
function byUrgency(a: Todo, b: Todo): number {
  const ad = a.dueDate ?? '9999-12-31';
  const bd = b.dueDate ?? '9999-12-31';
  if (ad !== bd) return ad < bd ? -1 : 1;
  if (a.priority !== b.priority) return b.priority - a.priority;
  return a.order - b.order;
}

async function nextOrder(): Promise<number> {
  const last = await db.todos.orderBy('order').last();
  return (last?.order ?? 0) + 1;
}

export const todoRepo = {
  /** 按浮点序号读出全部待办 */
  async listAll(): Promise<Todo[]> {
    return db.todos.orderBy('order').toArray();
  },

  /** 全部未完成，按紧迫度排序 */
  async listOpen(): Promise<Todo[]> {
    const rows = await db.todos.toArray();
    return rows.filter((t) => !t.done).sort(byUrgency);
  },

  /**
   * 今日待办：今天到期 + 已逾期 + 未排期的收件箱任务。
   * 主页面最重要的一张卡，口径刻意放宽——不能漏掉任何"该做的事"。
   */
  async listToday(): Promise<Todo[]> {
    const today = todayKey();
    const rows = await db.todos.toArray();
    return rows.filter((t) => !t.done && (!t.dueDate || t.dueDate <= today)).sort(byUrgency);
  },

  async listByProject(projectId: string): Promise<Todo[]> {
    const rows = await db.todos.where('projectId').equals(projectId).toArray();
    return rows.filter((t) => !t.done).sort(byUrgency);
  },

  /** 待办页统一查询入口（不含回收站） */
  async listByFilter(filter: TodoListFilter): Promise<Todo[]> {
    const today = todayKey();
    const rows = await db.todos.toArray();
    const matched = rows.filter((t) => matchesView(t, filter.view, today));
    return sortForView(applyProjectFilter(matched, filter.projectId), filter.view);
  },

  async create(input: NewTodoInput): Promise<Todo> {
    const ts = nowISO();
    const todo: Todo = {
      id: newId('todo'),
      title: input.title.trim(),
      note: input.note,
      done: false,
      priority: input.priority ?? 0,
      dueDate: input.dueDate,
      projectId: input.projectId,
      tags: input.tags ?? [],
      subtasks: [],
      order: await nextOrder(),
      createdAt: ts,
      updatedAt: ts,
    };
    await db.todos.add(todo);
    return todo;
  },

  async update(id: string, patch: Partial<Omit<Todo, 'id' | 'createdAt'>>): Promise<void> {
    const ts = nowISO();
    // Dexie 的 update 会忽略 undefined；清除可选字段必须用 modify
    const clearDue = 'dueDate' in patch && patch.dueDate === undefined;
    const clearProject = 'projectId' in patch && patch.projectId === undefined;
    const clearNote = 'note' in patch && patch.note === undefined;
    const clearCompleted = 'completedAt' in patch && patch.completedAt === undefined;
    if (clearDue || clearProject || clearNote || clearCompleted) {
      await db.todos
        .where('id')
        .equals(id)
        .modify((row) => {
          Object.assign(row, patch, { updatedAt: ts });
          if (clearDue) delete row.dueDate;
          if (clearProject) delete row.projectId;
          if (clearNote) delete row.note;
          if (clearCompleted) delete row.completedAt;
        });
      return;
    }
    await db.todos.update(id, { ...patch, updatedAt: ts });
  },

  /** 勾选 / 取消勾选。completedAt 是所有统计的唯一依据，必须同步维护 */
  async toggle(id: string): Promise<void> {
    const todo = await db.todos.get(id);
    if (!todo) return;
    const done = !todo.done;
    await db.todos.update(id, {
      done,
      completedAt: done ? nowISO() : undefined,
      updatedAt: nowISO(),
    });
  },

  async remove(id: string): Promise<void> {
    const todo = await db.todos.get(id);
    if (!todo) return;
    await moveToTrash('todos', id, todo.title);
  },

  async updateMany(
    ids: string[],
    patch: Partial<Pick<Todo, 'dueDate' | 'priority' | 'projectId' | 'tags'>>,
  ): Promise<number> {
    if (ids.length === 0) return 0;
    let ok = 0;
    const ts = nowISO();
    const clearDue = 'dueDate' in patch && patch.dueDate === undefined;
    const clearProject = 'projectId' in patch && patch.projectId === undefined;
    const useModify = clearDue || clearProject;
    await db.transaction('rw', db.todos, async () => {
      for (const id of ids) {
        if (useModify) {
          const existed = await db.todos.get(id);
          if (!existed) continue;
          await db.todos
            .where('id')
            .equals(id)
            .modify((row) => {
              if (patch.priority !== undefined) row.priority = patch.priority;
              if (patch.tags) row.tags = patch.tags;
              if ('dueDate' in patch) {
                if (patch.dueDate === undefined) delete row.dueDate;
                else row.dueDate = patch.dueDate;
              }
              if ('projectId' in patch) {
                if (patch.projectId === undefined) delete row.projectId;
                else row.projectId = patch.projectId;
              }
              row.updatedAt = ts;
            });
          ok += 1;
        } else {
          const n = await db.todos.update(id, { ...patch, updatedAt: ts });
          if (n) ok += 1;
        }
      }
    });
    return ok;
  },

  async removeMany(ids: string[]): Promise<number> {
    let ok = 0;
    for (const id of ids) {
      const todo = await db.todos.get(id);
      if (!todo) continue;
      await moveToTrash('todos', id, todo.title);
      ok += 1;
    }
    return ok;
  },

  async addSubtask(todoId: string, title: string): Promise<SubTask | undefined> {
    const todo = await db.todos.get(todoId);
    if (!todo) return undefined;
    const trimmed = title.trim();
    if (!trimmed) return undefined;
    const sub: SubTask = { id: newId('sub'), title: trimmed, done: false };
    await db.todos.update(todoId, {
      subtasks: [...todo.subtasks, sub],
      updatedAt: nowISO(),
    });
    return sub;
  },

  async toggleSubtask(todoId: string, subId: string): Promise<void> {
    const todo = await db.todos.get(todoId);
    if (!todo) return;
    const subtasks = todo.subtasks.map((s) =>
      s.id === subId ? { ...s, done: !s.done } : s,
    );
    await db.todos.update(todoId, { subtasks, updatedAt: nowISO() });
  },

  async updateSubtask(todoId: string, subId: string, title: string): Promise<void> {
    const todo = await db.todos.get(todoId);
    if (!todo) return;
    const trimmed = title.trim();
    if (!trimmed) return;
    const subtasks = todo.subtasks.map((s) => (s.id === subId ? { ...s, title: trimmed } : s));
    await db.todos.update(todoId, { subtasks, updatedAt: nowISO() });
  },

  async removeSubtask(todoId: string, subId: string): Promise<void> {
    const todo = await db.todos.get(todoId);
    if (!todo) return;
    await db.todos.update(todoId, {
      subtasks: todo.subtasks.filter((s) => s.id !== subId),
      updatedAt: nowISO(),
    });
  },

  async listTrashTodos(): Promise<TrashRecord[]> {
    const rows = await db.trash.where('table').equals('todos').toArray();
    return rows.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  },

  async restoreTrash(trashId: string): Promise<void> {
    await restoreFromTrash(trashId);
  },

  async purgeTrash(trashId: string): Promise<void> {
    await purgeFromTrash(trashId);
  },

  async emptyTodoTrash(): Promise<number> {
    const rows = await db.trash.where('table').equals('todos').toArray();
    if (rows.length === 0) return 0;
    await db.trash.bulkDelete(rows.map((r) => r.id));
    return rows.length;
  },

  /** 某天完成的数量（按 completedAt 落地的本地日期算） */
  async countCompletedOn(date: DateKey): Promise<number> {
    const rows = await db.todos.toArray();
    return rows.filter((t) => t.done && t.completedAt && toDateKey(t.completedAt) === date).length;
  },

  async listCompletedOn(date: DateKey): Promise<Todo[]> {
    const rows = await db.todos.toArray();
    return rows
      .filter((t) => t.done && t.completedAt && toDateKey(t.completedAt) === date)
      .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''));
  },

  /** 最近 n 天的完成量，缺失日期补 0，图表不会断点 */
  async dailyCompletedSeries(days = 7): Promise<{ date: DateKey; count: number }[]> {
    const dates = recentDays(days);
    const rows = await db.todos.toArray();

    const byDate = new Map<DateKey, number>();
    for (const todo of rows) {
      if (!todo.done || !todo.completedAt) continue;
      const key = toDateKey(todo.completedAt);
      byDate.set(key, (byDate.get(key) ?? 0) + 1);
    }

    return dates.map((date) => ({ date, count: byDate.get(date) ?? 0 }));
  },

  /** 拖拽后重排：按传入顺序重写浮点序号（全量覆盖这批 id） */
  async reorder(orderedIds: string[]): Promise<void> {
    await db.transaction('rw', db.todos, async () => {
      await Promise.all(
        orderedIds.map((id, index) =>
          db.todos.update(id, { order: index + 1, updatedAt: nowISO() }),
        ),
      );
    });
  },

  /**
   * 仅重排当前列表中的任务：取出这批 id 原先占用的 order 槽位（升序），
   * 按新顺序重新分配，避免把列表外任务的相对位置打乱成「挤到末尾」。
   */
  async reorderWithin(orderedIds: string[]): Promise<void> {
    if (orderedIds.length === 0) return;
    await db.transaction('rw', db.todos, async () => {
      const rows = await db.todos.bulkGet(orderedIds);
      const orders = rows
        .filter((r): r is Todo => Boolean(r))
        .map((r) => r.order)
        .sort((a, b) => a - b);
      if (orders.length !== orderedIds.length) return;
      const ts = nowISO();
      await Promise.all(
        orderedIds.map((id, index) =>
          db.todos.update(id, { order: orders[index]!, updatedAt: ts }),
        ),
      );
    });
  },
};
