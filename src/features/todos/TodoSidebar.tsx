import { useState, type FormEvent } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Inbox,
  ListChecks,
  Folder,
  Plus,
  Trash,
  Pencil,
} from 'lucide-react';
import type { Project } from '@/db/schema';
import { projectRepo } from '@/db/repositories';
import { toast } from '@/app/store/toast';
import { IconButton } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { VIEW_LABELS, type TodoView } from '@/lib/todoFilters';
import type { TodoSearchParams } from './filters';

const SMART: { view: TodoView; icon: typeof ListChecks }[] = [
  { view: 'today', icon: ListChecks },
  { view: 'week', icon: CalendarDays },
  { view: 'inbox', icon: Inbox },
  { view: 'all', icon: Folder },
  { view: 'done', icon: CheckCircle2 },
  { view: 'trash', icon: Trash },
];

export interface TodoSidebarProps {
  params: TodoSearchParams;
  projects: Project[] | undefined;
  onNavigate: (next: Partial<TodoSearchParams>) => void;
  /** 紧凑横向 chips（窄屏） */
  compact?: boolean;
}

export function TodoSidebar({ params, projects, onNavigate, compact }: TodoSidebarProps) {
  const [draft, setDraft] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const createProject = async (event: FormEvent) => {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return;
    try {
      const project = await projectRepo.create({ name });
      setDraft('');
      onNavigate({ view: 'all', projectId: project.id });
    } catch (error) {
      toast(error instanceof Error ? error.message : '创建项目失败', 'danger');
    }
  };

  const commitRename = async (id: string) => {
    const name = renameDraft.trim();
    setRenamingId(null);
    if (!name) return;
    try {
      await projectRepo.update(id, { name });
    } catch (error) {
      toast(error instanceof Error ? error.message : '重命名失败', 'danger');
    }
  };

  const removeProject = async (id: string, name: string) => {
    if (!window.confirm(`删除项目「${name}」？其下任务会退回收件箱。`)) return;
    try {
      await projectRepo.remove(id);
      if (params.projectId === id) onNavigate({ projectId: undefined, view: 'all' });
      toast('项目已删除', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'danger');
    }
  };

  if (compact) {
    return (
      <div className="flex gap-1.5 overflow-x-auto px-3 py-2 scrollbar-none">
        {SMART.map(({ view, icon: Icon }) => {
          const active = params.view === view && !params.projectId;
          return (
            <button
              key={view}
              type="button"
              onClick={() => onNavigate({ view, projectId: undefined })}
              className={cn(
                'chip shrink-0 gap-1.5',
                active && 'bg-primary-soft text-primary-text',
              )}
            >
              <Icon className="size-3.5" />
              {VIEW_LABELS[view]}
            </button>
          );
        })}
        {(projects ?? []).map((project) => {
          const active = params.projectId === project.id;
          return (
            <button
              key={project.id}
              type="button"
              onClick={() => onNavigate({ view: 'all', projectId: project.id })}
              className={cn('chip shrink-0 gap-1.5', active && 'bg-primary-soft text-primary-text')}
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              {project.name}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-line bg-surface">
      <div className="px-3 pt-4 pb-2">
        <p className="px-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-subtle">
          智能列表
        </p>
        <nav className="mt-1.5 space-y-0.5">
          {SMART.map(({ view, icon: Icon }) => {
            const active = params.view === view && !params.projectId;
            return (
              <button
                key={view}
                type="button"
                onClick={() => onNavigate({ view, projectId: undefined })}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[0.8125rem] transition-colors',
                  active
                    ? 'bg-primary-soft font-medium text-primary-text'
                    : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
                )}
              >
                <Icon className="size-3.5 shrink-0 opacity-80" />
                {VIEW_LABELS[view]}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="divider mx-3" />

      <div className="flex min-h-0 flex-1 flex-col px-3 pt-3 pb-3">
        <p className="px-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-subtle">
          项目
        </p>
        <ul className="mt-1.5 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
          {(projects ?? []).map((project) => {
            const active = params.projectId === project.id;
            if (renamingId === project.id) {
              return (
                <li key={project.id} className="px-1">
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onBlur={() => void commitRename(project.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void commitRename(project.id);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    className="h-8 w-full rounded-lg border border-line bg-surface-2 px-2 text-[0.8125rem] outline-none focus:border-primary"
                  />
                </li>
              );
            }
            return (
              <li key={project.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onNavigate({ view: 'all', projectId: project.id })}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[0.8125rem] transition-colors',
                    active
                      ? 'bg-primary-soft font-medium text-primary-text'
                      : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
                  )}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="min-w-0 flex-1 truncate">{project.name}</span>
                </button>
                <div className="absolute top-0.5 right-0.5 hidden items-center group-hover:flex">
                  <IconButton
                    label="重命名"
                    className="size-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenamingId(project.id);
                      setRenameDraft(project.name);
                    }}
                  >
                    <Pencil className="size-3" />
                  </IconButton>
                  <IconButton
                    label="删除项目"
                    className="size-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      void removeProject(project.id, project.name);
                    }}
                  >
                    <Trash className="size-3" />
                  </IconButton>
                </div>
              </li>
            );
          })}
        </ul>

        <form onSubmit={createProject} className="mt-2 flex items-center gap-1 px-1">
          <Plus className="size-3.5 shrink-0 text-ink-subtle" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="新建项目…"
            className="h-8 min-w-0 flex-1 bg-transparent text-[0.8125rem] outline-none placeholder:text-ink-subtle"
          />
        </form>
      </div>
    </aside>
  );
}
