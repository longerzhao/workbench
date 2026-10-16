import { useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, StickyNote } from 'lucide-react';
import { noteRepo } from '@/db/repositories';
import { Panel } from '@/components/ui/Panel';
import { Empty } from '@/components/ui/Empty';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { toast } from '@/app/store/toast';
import { fromNow } from '@/lib/date';

const RECENT_LIMIT = 3;

export function NotesCard() {
  const notes = useLiveQuery(() => noteRepo.listRecent(RECENT_LIMIT), []);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const content = draft.trim();
    if (!content || saving) return;

    setSaving(true);
    try {
      await noteRepo.create({ content });
      setDraft('');
      toast('已存入笔记', 'success', 2);
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 直接存，Shift+Enter 换行——速记场景下这是最省事的默认
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void save();
    }
  };

  return (
    <Panel
      title="速记"
      icon={<StickyNote />}
      action={
        <Link to="/notes" className="btn btn-ghost h-7 px-2 text-xs" title="打开笔记">
          <ArrowRight className="size-3.5" />
        </Link>
      }
      padded={false}
      bodyClassName="flex flex-col"
      footer={<span>Enter 保存 · Shift + Enter 换行</span>}
    >
      <div className="shrink-0 p-2.5">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder="记点什么…"
          className="w-full resize-none rounded-[10px] bg-surface-2 px-2.5 py-2 text-[0.8125rem] leading-relaxed outline-none transition-shadow placeholder:text-ink-subtle focus:ring-2 focus:ring-[var(--ring)]"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-line px-1.5 py-1.5">
        {notes === undefined ? (
          <div className="px-2 py-1">
            <SkeletonLines lines={2} />
          </div>
        ) : notes.length === 0 ? (
          <Empty icon={<StickyNote />} title="还没有笔记" hint="上面输入一行字，回车就存下了。" />
        ) : (
          <ul className="space-y-px">
            {notes.map((note) => (
              <li key={note.id}>
                <Link
                  to={`/notes?id=${encodeURIComponent(note.id)}`}
                  className="flex items-baseline gap-2 rounded-[10px] px-2 py-1.5 transition-colors hover:bg-surface-2"
                >
                  <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-ink">
                    {note.title}
                  </span>
                  <span className="shrink-0 text-[0.6875rem] text-ink-subtle">
                    {fromNow(note.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
