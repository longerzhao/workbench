import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { RotateCcw, StickyNote, Trash, Trash2 } from 'lucide-react';
import type { TrashRecord } from '@/db/schema';
import { habitRepo, noteRepo, todoRepo } from '@/db/repositories';
import { toast } from '@/app/store/toast';
import { Button, IconButton } from '@/components/ui/Button';
import { Empty } from '@/components/ui/Empty';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { fromNow } from '@/lib/date';
import { cn } from '@/lib/cn';

type TrashTab = 'todos' | 'notes' | 'habits';

const TABS: { id: TrashTab; label: string }[] = [
  { id: 'todos', label: '待办' },
  { id: 'notes', label: '笔记' },
  { id: 'habits', label: '习惯' },
];

const EMPTY_HINTS: Record<TrashTab, string> = {
  todos: '删除的待办会在这里保留 7 天，可以恢复或永久删除。',
  notes: '删除的笔记会在这里保留 7 天，可以恢复或永久删除。',
  habits: '删除的习惯连同打卡记录一起在这里保留 7 天。',
};

export function TrashPage() {
  const [tab, setTab] = useState<TrashTab>('todos');
  const navigate = useNavigate();

  const todos = useLiveQuery(() => todoRepo.listTrashTodos(), []);
  const notes = useLiveQuery(() => noteRepo.listTrashNotes(), []);
  const habits = useLiveQuery(() => habitRepo.listTrashHabits(), []);

  const records = tab === 'todos' ? todos : tab === 'notes' ? notes : habits;

  const restore = (repo: typeof todoRepo | typeof noteRepo | typeof habitRepo, id: string) => {
    void repo
      .restoreTrash(id)
      .then(() => toast('已恢复', 'success'))
      .catch((error: unknown) => toast(error instanceof Error ? error.message : '恢复失败', 'danger'));
  };

  const purge = (repo: typeof todoRepo | typeof noteRepo | typeof habitRepo, id: string) => {
    if (!window.confirm('永久删除？不可撤销。')) return;
    void repo
      .purgeTrash(id)
      .then(() => toast('已永久删除'))
      .catch((error: unknown) => toast(error instanceof Error ? error.message : '删除失败', 'danger'));
  };

  const empty = () => {
    const name = TABS.find((t) => t.id === tab)?.label ?? '';
    if (!window.confirm(`清空${name}回收站？此操作不可撤销。`)) return;
    const run =
      tab === 'todos'
        ? todoRepo.emptyTodoTrash()
        : tab === 'notes'
          ? noteRepo.emptyTrashNotes()
          : habitRepo.emptyTrashHabits();
    void run.then((n: number) => toast(`已永久删除 ${n} 项`, 'success'));
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <Trash2 className="size-5 text-primary" />
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold text-ink">回收站</h1>
          <p className="text-[0.75rem] text-ink-subtle">删除的内容保留 7 天，之后自动清除</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          返回
        </Button>
      </header>

      <div className="flex items-center gap-1 border-b border-line px-4 py-2">
        {TABS.map((t) => {
          const count =
            t.id === 'todos' ? todos?.length : t.id === 'notes' ? notes?.length : habits?.length;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'chip',
                tab === t.id ? 'bg-primary-soft text-primary-text' : 'hover:bg-surface-2',
              )}
            >
              {t.label}
              {count ? <span className="ml-1 tabular-nums opacity-70">{count}</span> : null}
            </button>
          );
        })}
        {records && records.length > 0 ? (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto text-danger"
            onClick={empty}
          >
            清空本类
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {records === undefined ? (
          <SkeletonLines lines={5} />
        ) : records.length === 0 ? (
          <Empty icon={<Trash />} title="回收站是空的" hint={EMPTY_HINTS[tab]} className="py-16" />
        ) : (
          <TrashList records={records} tab={tab} onRestore={restore} onPurge={purge} />
        )}
      </div>
    </div>
  );
}

function TrashList({
  records,
  tab,
  onRestore,
  onPurge,
}: {
  records: TrashRecord[];
  tab: TrashTab;
  onRestore: (
    repo: typeof todoRepo | typeof noteRepo | typeof habitRepo,
    id: string,
  ) => void;
  onPurge: (repo: typeof todoRepo | typeof noteRepo | typeof habitRepo, id: string) => void;
}) {
  const repo = tab === 'todos' ? todoRepo : tab === 'notes' ? noteRepo : habitRepo;
  const KindIcon = tab === 'notes' ? StickyNote : tab === 'habits' ? Trash2 : Trash;

  return (
    <ul className="space-y-1">
      {records.map((row) => (
        <li
          key={row.id}
          className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-2"
        >
          <KindIcon className="size-4 shrink-0 text-ink-subtle" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.8125rem] text-ink">{row.label}</p>
            <p className="text-[0.6875rem] text-ink-subtle">删除于 {fromNow(row.deletedAt)}</p>
          </div>
          <IconButton
            label="恢复"
            onClick={() => onRestore(repo, row.id)}
          >
            <RotateCcw className="size-3.5" />
          </IconButton>
          <IconButton
            label="永久删除"
            className="text-danger"
            onClick={() => onPurge(repo, row.id)}
          >
            <Trash className="size-3.5" />
          </IconButton>
        </li>
      ))}
    </ul>
  );
}
