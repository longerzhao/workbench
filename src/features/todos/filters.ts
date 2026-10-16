import { isTodoView, type TodoView } from '@/lib/todoFilters';

export type { TodoView, SecondaryFilters } from '@/lib/todoFilters';
export {
  TODO_VIEWS,
  isTodoView,
  matchesView,
  applyProjectFilter,
  applySecondaryFilters,
  collectTags,
  sortForView,
  VIEW_LABELS,
} from '@/lib/todoFilters';

export interface TodoSearchParams {
  view: TodoView;
  projectId?: string;
}

/** 从 URLSearchParams 解析待办页状态 */
export function parseTodoSearch(search: URLSearchParams): TodoSearchParams {
  const rawView = search.get('view');
  const view: TodoView = isTodoView(rawView) ? rawView : 'today';
  const project = search.get('project')?.trim();
  const projectId = view === 'trash' ? undefined : project || undefined;
  return { view, projectId };
}

export function buildTodoSearch(params: TodoSearchParams): string {
  const next = new URLSearchParams();
  if (params.view !== 'today') next.set('view', params.view);
  if (params.projectId) next.set('project', params.projectId);
  const qs = next.toString();
  return qs ? `?${qs}` : '';
}
