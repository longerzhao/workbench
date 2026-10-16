import { useState, type FormEvent } from 'react';
import { Folder, Pencil, Plus, Trash } from 'lucide-react';
import { bookmarkRepo, DEFAULT_BOOKMARK_GROUP } from '@/db/repositories';
import { toast } from '@/app/store/toast';
import { IconButton } from '@/components/ui/Button';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

export interface BookmarkSidebarProps {
  groups: string[] | undefined;
  activeGroup: string;
  onSelect: (group: string) => void;
  compact?: boolean;
}

export function BookmarkSidebar({
  groups,
  activeGroup,
  onSelect,
  compact,
}: BookmarkSidebarProps) {
  const [draft, setDraft] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const createGroup = async (event: FormEvent) => {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return;
    if (groups?.includes(name)) {
      toast(`分组「${name}」已存在`, 'danger');
      return;
    }
    setDraft('');
    onSelect(name);
    toast(`已切换到「${name}」，添加第一条书签即可创建分组`, 'success', 3);
  };

  const commitRename = async (from: string) => {
    const to = renameDraft.trim();
    setRenaming(null);
    if (!to || to === from) return;
    try {
      await bookmarkRepo.renameGroup(from, to);
      onSelect(to);
      toast('已重命名分组', 'success', 2);
    } catch (error) {
      toast(error instanceof Error ? error.message : '重命名失败', 'danger');
    }
  };

  const dissolve = async (name: string) => {
    if (name === DEFAULT_BOOKMARK_GROUP) {
      toast('默认分组不能解散', 'danger');
      return;
    }
    if (!window.confirm(`解散分组「${name}」？其中的书签会移到「${DEFAULT_BOOKMARK_GROUP}」。`)) {
      return;
    }
    try {
      await bookmarkRepo.dissolveGroup(name);
      onSelect(DEFAULT_BOOKMARK_GROUP);
      toast('分组已解散', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'danger');
    }
  };

  if (compact) {
    return (
      <div className="flex gap-1.5 overflow-x-auto px-3 py-2 scrollbar-none">
        {(groups ?? []).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => onSelect(name)}
            className={cn(
              'chip shrink-0',
              activeGroup === name && 'bg-primary-soft text-primary-text',
            )}
          >
            {name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-line bg-surface">
      <div className="border-b border-line px-3 py-3">
        <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-ink-subtle">
          分组
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {groups === undefined ? (
          <div className="p-2">
            <SkeletonLines lines={4} />
          </div>
        ) : (
          <ul className="space-y-0.5">
            {groups.map((name) => {
              const active = name === activeGroup;
              if (renaming === name) {
                return (
                  <li key={name} className="px-1">
                    <input
                      autoFocus
                      className="input h-8 text-xs"
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onBlur={() => void commitRename(name)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void commitRename(name);
                        if (e.key === 'Escape') setRenaming(null);
                      }}
                    />
                  </li>
                );
              }
              return (
                <li key={name}>
                  <div
                    className={cn(
                      'group flex items-center gap-1 rounded-[10px] pr-1',
                      active ? 'bg-primary-soft text-primary-text' : 'hover:bg-surface-2',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(name)}
                      className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left text-[0.8125rem]"
                    >
                      <Folder className="size-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{name}</span>
                    </button>
                    <IconButton
                      label="重命名"
                      className="size-7 opacity-0 group-hover:opacity-100"
                      onClick={() => {
                        setRenaming(name);
                        setRenameDraft(name);
                      }}
                    >
                      <Pencil className="size-3" />
                    </IconButton>
                    {name !== DEFAULT_BOOKMARK_GROUP ? (
                      <IconButton
                        label="解散分组"
                        className="size-7 text-danger opacity-0 group-hover:opacity-100"
                        onClick={() => void dissolve(name)}
                      >
                        <Trash className="size-3" />
                      </IconButton>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form onSubmit={(e) => void createGroup(e)} className="border-t border-line p-2">
        <div className="flex gap-1.5">
          <input
            className="input h-8 min-w-0 flex-1 text-xs"
            placeholder="新建分组"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <IconButton label="新建分组" className="size-8" type="submit">
            <Plus className="size-4" />
          </IconButton>
        </div>
      </form>
    </aside>
  );
}
