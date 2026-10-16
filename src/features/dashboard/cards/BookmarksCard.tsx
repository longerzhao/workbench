import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bookmark, ExternalLink, Plus } from 'lucide-react';
import { bookmarkRepo, DEFAULT_BOOKMARK_GROUP } from '@/db/repositories';
import { Panel } from '@/components/ui/Panel';
import { Empty } from '@/components/ui/Empty';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { Button, IconButton } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/app/store/toast';
import { cn } from '@/lib/cn';

/** 每组最多露出几个，超出的折叠为 "+N" */
const PER_GROUP_LIMIT = 8;

export function BookmarksCard() {
  const groups = useLiveQuery(() => bookmarkRepo.grouped(), []);
  const [open, setOpen] = useState(false);

  return (
    <Panel
      title="快捷入口"
      icon={<Bookmark />}
      badge={groups === undefined ? undefined : groups.reduce((sum, g) => sum + g.items.length, 0)}
      action={
        <IconButton label="添加网址" className="size-7" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
        </IconButton>
      }
      padded={false}
      bodyClassName="p-3.5"
    >
      {groups === undefined ? (
        <SkeletonLines lines={4} />
      ) : groups.length === 0 ? (
        <Empty
          icon={<Bookmark />}
          title="还没有快捷入口"
          hint="把每天都要打开的网址放进来，一点就到。"
          action={
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Plus className="size-3.5" />
              添加网址
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.group}>
              <p className="mb-1.5 text-[0.6875rem] font-medium text-ink-subtle">{group.group}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.items.slice(0, PER_GROUP_LIMIT).map((item) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    onClick={() => void bookmarkRepo.recordClick(item.id)}
                    title={item.url}
                    className="group flex max-w-[10rem] items-center gap-1.5 rounded-[10px] border border-line bg-surface-2 px-2 py-1.5 text-[0.75rem] text-ink transition-all hover:-translate-y-px hover:border-primary hover:bg-primary-soft hover:text-primary-text"
                  >
                    <span className="grid size-4 shrink-0 place-items-center rounded bg-primary/12 text-[0.5625rem] font-bold uppercase text-primary-text">
                      {item.title.slice(0, 1)}
                    </span>
                    <span className="truncate">{item.title}</span>
                    <ExternalLink className="size-2.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
                  </a>
                ))}
                {group.items.length > PER_GROUP_LIMIT ? (
                  <span className="chip self-center">
                    +{group.items.length - PER_GROUP_LIMIT}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddBookmarkModal
        open={open}
        onClose={() => setOpen(false)}
        groupOptions={groups?.map((g) => g.group) ?? []}
      />
    </Panel>
  );
}

interface AddBookmarkModalProps {
  open: boolean;
  onClose: () => void;
  groupOptions: string[];
}

function AddBookmarkModal({ open, onClose, groupOptions }: AddBookmarkModalProps) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [group, setGroup] = useState(DEFAULT_BOOKMARK_GROUP);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setTitle('');
    setUrl('');
    setGroup(DEFAULT_BOOKMARK_GROUP);
  };

  const handleAdd = async () => {
    if (!url.trim() || busy) return;

    setBusy(true);
    try {
      await bookmarkRepo.create({ title, url, group });
      toast('已添加快捷入口', 'success', 2);
      reset();
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : '添加失败', 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="添加快捷入口"
      description="标题留空时自动取域名"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            取消
          </Button>
          <Button variant="primary" onClick={() => void handleAdd()} disabled={busy}>
            添加
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void handleAdd();
        }}
        className="space-y-3"
      >
        <label className="block space-y-1.5">
          <span className="text-[0.8125rem] text-ink-muted">网址</span>
          <input
            autoFocus
            className="input"
            placeholder="github.com"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[0.8125rem] text-ink-muted">标题</span>
          <input
            className="input"
            placeholder="留空则用域名"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <div className="space-y-1.5">
          <span className="text-[0.8125rem] text-ink-muted">分组</span>
          <input
            className="input"
            placeholder={DEFAULT_BOOKMARK_GROUP}
            value={group}
            onChange={(event) => setGroup(event.target.value)}
          />
          {groupOptions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {groupOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setGroup(option)}
                  className={cn(
                    'chip transition-colors',
                    group === option ? 'bg-primary-soft text-primary-text' : 'hover:bg-surface-3',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
