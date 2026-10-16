import { useEffect } from 'react';
import { StickyNote } from 'lucide-react';
import { Empty } from '@/components/ui/Empty';
import { NoteEditor } from './NoteEditor';
import { NoteSidebar } from './NoteSidebar';
import { useNoteSearch, useNotesData } from './useNoteQuery';

export function NotesPage() {
  const { noteId, setNoteId } = useNoteSearch();
  const { notes, folders, selected } = useNotesData(noteId);

  // 给新建后的 liveQuery 一点窗口，避免刚写入就被当成无效 id 清掉
  useEffect(() => {
    if (!noteId || notes === undefined) return;
    if (notes.some((n) => n.id === noteId)) return;
    const timer = window.setTimeout(() => setNoteId(undefined), 150);
    return () => window.clearTimeout(timer);
  }, [noteId, notes, setNoteId]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden md:flex-row">
      <div className="hidden md:flex">
        <NoteSidebar
          notes={notes}
          folders={folders}
          selectedId={noteId}
          onSelect={setNoteId}
          onCreated={setNoteId}
        />
      </div>

      <div className="md:hidden">
        <NoteSidebar
          notes={notes}
          folders={folders}
          selectedId={noteId}
          onSelect={setNoteId}
          onCreated={setNoteId}
          compact
        />
        {notes && notes.length > 0 ? (
          <div className="flex gap-1.5 overflow-x-auto border-b border-line px-3 py-2 scrollbar-none">
            {notes.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setNoteId(n.id)}
                className={
                  n.id === noteId
                    ? 'chip shrink-0 bg-primary-soft text-primary-text'
                    : 'chip shrink-0'
                }
              >
                {n.title || '无标题'}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {selected ? (
        <NoteEditor key={selected.id} note={selected} onDeleted={() => setNoteId(undefined)} />
      ) : (
        <div className="grid min-h-0 flex-1 place-items-center p-6">
          <Empty
            icon={<StickyNote />}
            title="选择或新建一篇笔记"
            hint="左侧列表点选，或点 + 开始写。"
          />
        </div>
      )}
    </div>
  );
}
