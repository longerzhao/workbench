import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { todoRepo } from '@/db/repositories';
import { projectRepo } from '@/db/repositories';
import { buildTodoSearch, parseTodoSearch, type TodoSearchParams } from './filters';
import type { TodoView } from '@/lib/todoFilters';

export function useTodoSearch(): {
  params: TodoSearchParams;
  setParams: (next: Partial<TodoSearchParams> & { view?: TodoView }) => void;
} {
  const [search, setSearch] = useSearchParams();

  const params = useMemo(() => parseTodoSearch(search), [search]);

  const setParams = (next: Partial<TodoSearchParams>) => {
    const merged: TodoSearchParams = {
      view: next.view ?? params.view,
      projectId: next.projectId !== undefined ? next.projectId : params.projectId,
    };
    // 显式传 undefined / 空字符串清掉 project
    if ('projectId' in next && !next.projectId) {
      delete merged.projectId;
    }
    if (merged.view === 'trash') {
      delete merged.projectId;
    }
    const qs = buildTodoSearch(merged);
    setSearch(qs ? new URLSearchParams(qs.slice(1)) : new URLSearchParams(), { replace: true });
  };

  return { params, setParams };
}

export function useTodoList(params: TodoSearchParams) {
  const todos = useLiveQuery(
    () => {
      if (params.view === 'trash') return Promise.resolve([]);
      return todoRepo.listByFilter({
        view: params.view,
        projectId: params.projectId,
      });
    },
    [params.view, params.projectId],
  );

  const trash = useLiveQuery(
    () => (params.view === 'trash' ? todoRepo.listTrashTodos() : Promise.resolve([])),
    [params.view],
  );

  const projects = useLiveQuery(() => projectRepo.listAll(), []);

  return { todos, trash, projects };
}
