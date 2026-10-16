import { useState, type FormEvent } from 'react';
import type { Bookmark } from '@/db/schema';
import { bookmarkRepo, DEFAULT_BOOKMARK_GROUP } from '@/db/repositories';
import { toast } from '@/app/store/toast';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';

export interface BookmarkFormProps {
  open: boolean;
  onClose: () => void;
  group: string;
  groupOptions: string[];
  editing?: Bookmark | null;
}

/** 用 key 重置草稿，避免 effect 内 setState */
export function BookmarkForm(props: BookmarkFormProps) {
  if (!props.open) return null;
  const formKey = props.editing?.id ?? `new:${props.group}`;
  return <BookmarkFormInner key={formKey} {...props} />;
}

function BookmarkFormInner({
  open,
  onClose,
  group,
  groupOptions,
  editing,
}: BookmarkFormProps) {
  const [title, setTitle] = useState(editing?.title ?? '');
  const [url, setUrl] = useState(editing?.url ?? '');
  const [groupValue, setGroupValue] = useState(
    (editing?.group ?? group) || DEFAULT_BOOKMARK_GROUP,
  );
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!url.trim() || busy) return;
    setBusy(true);
    try {
      if (editing) {
        await bookmarkRepo.update(editing.id, {
          title: title.trim(),
          url,
          group: groupValue.trim() || DEFAULT_BOOKMARK_GROUP,
        });
        toast('已更新书签', 'success', 2);
      } else {
        await bookmarkRepo.create({
          title,
          url,
          group: groupValue.trim() || DEFAULT_BOOKMARK_GROUP,
        });
        toast('已添加书签', 'success', 2);
      }
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? '编辑书签' : '添加书签'}
      description="标题留空时自动取域名"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            取消
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={busy || !url.trim()}>
            {editing ? '保存' : '添加'}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void submit();
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
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[0.8125rem] text-ink-muted">标题</span>
          <input
            className="input"
            placeholder="留空则用域名"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <div className="space-y-1.5">
          <span className="text-[0.8125rem] text-ink-muted">分组</span>
          <input
            className="input"
            placeholder={DEFAULT_BOOKMARK_GROUP}
            value={groupValue}
            onChange={(e) => setGroupValue(e.target.value)}
          />
          {groupOptions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {groupOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setGroupValue(option)}
                  className={cn(
                    'chip transition-colors',
                    groupValue === option ? 'bg-primary-soft text-primary-text' : 'hover:bg-surface-3',
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
