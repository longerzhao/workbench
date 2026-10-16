import type { Priority, Todo } from '@/db/schema';
import { todayKey, weekRange, type DateKey } from '@/lib/date';

export const TODO_VIEWS = ['today', 'week', 'inbox', 'all', 'done', 'trash'] as const;
export type TodoView = (typeof TODO_VIEWS)[number];

export function isTodoView(value: string | null | undefined): value is TodoView {
  return TODO_VIEWS.includes(value as TodoView);
}

/** 业务视图口径（不含项目叠滤） */
export function matchesView(todo: Todo, view: TodoView, today: DateKey = todayKey()): boolean {
  switch (view) {
    case 'today':
      return !todo.done && (!todo.dueDate || todo.dueDate <= today);
    case 'week': {
      if (todo.done || !todo.dueDate) return false;
      const { start, end } = weekRange(today);
      return todo.dueDate >= start && todo.dueDate <= end;
    }
    case 'inbox':
      return !todo.done && !todo.projectId;
    case 'all':
      return !todo.done;
    case 'done':
      return todo.done;
    case 'trash':
      return false;
    default:
      return false;
  }
}

export function applyProjectFilter(todos: Todo[], projectId?: string): Todo[] {
  if (!projectId) return todos;
  return todos.filter((t) => t.projectId === projectId);
}

export interface SecondaryFilters {
  /** undefined = 不限；0 = 仅无优先级 */
  priority?: Priority;
  /** 多选标签，取交集；空数组 = 不限 */
  tags: string[];
}

export function applySecondaryFilters(todos: Todo[], filters: SecondaryFilters): Todo[] {
  let rows = todos;
  if (filters.priority !== undefined) {
    rows = rows.filter((t) => t.priority === filters.priority);
  }
  if (filters.tags.length > 0) {
    rows = rows.filter((t) => filters.tags.every((tag) => t.tags.includes(tag)));
  }
  return rows;
}

export function collectTags(todos: Todo[]): string[] {
  const set = new Set<string>();
  for (const todo of todos) {
    for (const tag of todo.tags) {
      if (tag.trim()) set.add(tag);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

/** 排序：未完成按紧迫度；已完成按 completedAt 倒序 */
export function sortForView(todos: Todo[], view: TodoView): Todo[] {
  if (view === 'done') {
    return [...todos].sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  }
  return [...todos].sort((a, b) => {
    const ad = a.dueDate ?? '9999-12-31';
    const bd = b.dueDate ?? '9999-12-31';
    if (ad !== bd) return ad < bd ? -1 : 1;
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.order - b.order;
  });
}

export const VIEW_LABELS: Record<TodoView, string> = {
  today: '今天',
  week: '本周',
  inbox: '收件箱',
  all: '全部',
  done: '已完成',
  trash: '回收站',
};
