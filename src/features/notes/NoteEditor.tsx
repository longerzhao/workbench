import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Pin, Trash, X } from 'lucide-react';
import type { Note } from '@/db/schema';
import { noteRepo } from '@/db/repositories';
import { toast } from '@/app/store/toast';
import { Button, IconButton } from '@/components/ui/Button';
import { fromNow } from '@/lib/date';
import { cn } from '@/lib/cn';
import { NotePreview } from './NotePreview';

type Tab = 'edit' | 'preview';

export interface NoteEditorProps {
  note: Note;
  onDeleted: () => void;
}

export function NoteEditor({ note, onDeleted }: NoteEditorProps) {
  const [tab, setTab] = useState<Tab>('edit');
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState(note.tags);
  const [tagDraft, setTagDraft] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (note.title === '无标题笔记' && !note.content) {
      titleRef.current?.focus();
      titleRef.current?.select();
    }
  }, [note.id, note.title, note.content]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const persist = async (patch: { title?: string; content?: string; tags?: string[] }) => {
    try {
      await noteRepo.update(note.id, patch);
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'danger');
    }
  };

  const scheduleContentSave = (nextContent: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persist({ content: nextContent });
    }, 400);
  };

  const flushTitle = () => {
    const next = title.trim() || '无标题笔记';
    if (next !== note.title) void persist({ title: next });
    if (next !== title) setTitle(next);
  };

  const saveTags = (next: string[]) => {
    setTags(next);
    const same =
      next.length === note.tags.length && next.every((t, i) => t === note.tags[i]);
    if (!same) void persist({ tags: next });
  };

  const commitTagDraft = () => {
    const parts = tagDraft
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) {
      setTagDraft('');
      return;
    }
    const next = [...tags];
    for (const part of parts) {
      if (!next.includes(part)) next.push(part);
    }
    setTagDraft('');
    saveTags(next);
  };

  const removeTag = (tag: string) => {
    saveTags(tags.filter((t) => t !== tag));
  };

  const onTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commitTagDraft();
      return;
    }
    if (event.key === 'Backspace' && !tagDraft && tags.length > 0) {
      removeTag(tags[tags.length - 1]!);
    }
  };

  const flushContent = () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (content !== note.content) void persist({ content });
  };

  const togglePin = async () => {
    try {
      await noteRepo.togglePin(note.id);
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'danger');
    }
  };

  const remove = async () => {
    if (!window.confirm('删除这篇笔记？可在顶栏数据菜单的回收站恢复（保留 7 天）。')) return;
    try {
      await noteRepo.remove(note.id);
      toast('已移入回收站');
      onDeleted();
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'danger');
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-start gap-2 border-b border-line px-4 py-3">
        <input
          ref={titleRef}
          className="min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none placeholder:text-ink-subtle"
          value={title}
          placeholder="标题"
          onChange={(e) => setTitle(e.target.value)}
          onBlur={flushTitle}
        />
        <IconButton
          label={note.pinned ? '取消置顶' : '置顶'}
          className={cn('size-8', note.pinned && 'text-primary')}
          onClick={() => void togglePin()}
        >
          <Pin className={cn('size-4', note.pinned && 'fill-current')} />
        </IconButton>
        <IconButton label="删除笔记" className="size-8 text-danger" onClick={() => void remove()}>
          <Trash className="size-4" />
        </IconButton>
      </div>

      <div className="flex items-center gap-1 border-b border-line px-4 py-1.5">
        <Button
          size="sm"
          variant={tab === 'edit' ? 'primary' : 'ghost'}
          onClick={() => {
            flushContent();
            setTab('edit');
          }}
        >
          编辑
        </Button>
        <Button
          size="sm"
          variant={tab === 'preview' ? 'primary' : 'ghost'}
          onClick={() => {
            flushContent();
            setTab('preview');
          }}
        >
          预览
        </Button>
      </div>

      {tab === 'edit' ? (
        <textarea
          className="min-h-0 flex-1 resize-none bg-transparent px-4 py-3 font-mono text-[0.8125rem] leading-relaxed outline-none placeholder:text-ink-subtle"
          value={content}
          placeholder="写点 Markdown…"
          onChange={(e) => {
            const next = e.target.value;
            setContent(next);
            scheduleContentSave(next);
          }}
          onBlur={flushContent}
        />
      ) : (
        <NotePreview content={content} />
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-2.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-[0.75rem] text-ink-muted">
          <span className="shrink-0">标签</span>
          {tags.map((tag) => (
            <span key={tag} className="chip gap-1 bg-primary-soft text-primary-text">
              {tag}
              <button
                type="button"
                aria-label={`移除标签 ${tag}`}
                className="rounded-full p-0.5 hover:bg-primary/20"
                onClick={() => removeTag(tag)}
              >
                <X className="size-2.5" />
              </button>
            </span>
          ))}
          <input
            className="h-7 min-w-[7rem] flex-1 border-0 bg-transparent px-1 text-xs text-ink outline-none placeholder:text-ink-subtle"
            placeholder={tags.length ? '回车添加' : '输入后回车添加'}
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={onTagKeyDown}
            onBlur={commitTagDraft}
          />
        </div>
        <span className="shrink-0 text-[0.6875rem] text-ink-subtle">
          更新于 {fromNow(note.updatedAt)}
        </span>
      </div>
    </div>
  );
}
