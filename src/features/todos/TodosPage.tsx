import { useMemo, useState } from 'react';
import {
  applySecondaryFilters,
  collectTags,
  type SecondaryFilters,
} from '@/lib/todoFilters';
import { TodoBatchBar } from './TodoBatchBar';
import { TodoList } from './TodoList';
import { TodoSidebar } from './TodoSidebar';
import { TodoToolbar } from './TodoToolbar';
import { TodoTrash } from './TodoTrash';
import { useTodoList, useTodoSearch } from './useTodoQuery';

export function TodosPage() {
  const { params, setParams } = useTodoSearch();
  const { todos, trash, projects } = useTodoList(params);

  const [secondary, setSecondary] = useState<SecondaryFilters>({ tags: [] });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const projectList = projects ?? [];
  const activeProject = projectList.find((p) => p.id === params.projectId);

  const availableTags = useMemo(() => collectTags(todos ?? []), [todos]);

  const filtered = useMemo(() => {
    if (!todos) return undefined;
    if (params.view === 'trash') return todos;
    return applySecondaryFilters(todos, secondary);
  }, [todos, secondary, params.view]);

  const hasSecondary =
    secondary.priority !== undefined || secondary.tags.length > 0;

  const selectable = params.view !== 'done' && params.view !== 'trash';
  const draggable =
    selectable &&
    !hasSecondary &&
    (params.view === 'today' ||
      params.view === 'week' ||
      params.view === 'inbox' ||
      params.view === 'all');

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedId((cur) => (cur === id ? null : id));
  };

  // 切换视图时清空多选与次级筛选，避免错位
  const navigate = (next: Parameters<typeof setParams>[0]) => {
    setSelectedIds(new Set());
    setExpandedId(null);
    setSecondary({ tags: [] });
    setParams(next);
  };

  const count =
    params.view === 'trash' ? (trash?.length ?? 0) : (filtered?.length ?? 0);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden md:flex-row">
      <div className="hidden md:flex">
        <TodoSidebar
          params={params}
          projects={projects}
          onNavigate={navigate}
        />
      </div>

      <div className="border-b border-line md:hidden">
        <TodoSidebar
          params={params}
          projects={projects}
          onNavigate={navigate}
          compact
        />
      </div>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <TodoToolbar
          view={params.view}
          projectId={params.projectId}
          projectName={activeProject?.name}
          count={count}
          secondary={secondary}
          availableTags={availableTags}
          onSecondaryChange={setSecondary}
          hideFilters={params.view === 'trash'}
        />

        {selectable ? (
          <p className="shrink-0 border-b border-line bg-surface-2/60 px-4 py-1.5 text-[0.6875rem] text-ink-subtle lg:px-6">
            <span className="mr-3">⠿ 悬停左侧六点可拖动排序</span>
            <span className="mr-3">▢ 虚线方框：多选（批量操作）</span>
            <span>○ 圆圈：标记完成</span>
          </p>
        ) : null}

        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-0 overflow-y-auto pb-24">
            {params.view === 'trash' ? (
              <TodoTrash records={trash} />
            ) : (
              <TodoList
                todos={filtered}
                projects={projectList}
                expandedId={expandedId}
                onToggleExpand={toggleExpand}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                selectable={selectable}
                draggable={draggable}
              />
            )}
          </div>

          {selectable ? (
            <TodoBatchBar
              selectedIds={[...selectedIds]}
              projects={projectList}
              onClear={() => setSelectedIds(new Set())}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
