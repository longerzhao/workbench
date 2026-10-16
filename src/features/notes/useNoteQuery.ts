import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { noteFolderRepo, noteRepo } from '@/db/repositories';
import type { Note, NoteFolder } from '@/db/schema';

export function useNoteSearch(): {
  noteId: string | undefined;
  setNoteId: (id: string | undefined) => void;
} {
  const [search, setSearch] = useSearchParams();

  const noteId = useMemo(() => {
    const id = search.get('id')?.trim();
    return id || undefined;
  }, [search]);

  const setNoteId = (id: string | undefined) => {
    const next = new URLSearchParams(search);
    if (id) next.set('id', id);
    else next.delete('id');
    setSearch(next, { replace: true });
  };

  return { noteId, setNoteId };
}

export function useNotesData(noteId: string | undefined): {
  notes: Note[] | undefined;
  folders: NoteFolder[] | undefined;
  selected: Note | undefined;
} {
  const notes = useLiveQuery(() => noteRepo.listAll(), []);
  const folders = useLiveQuery(() => noteFolderRepo.listAll(), []);
  const selected = notes?.find((n) => n.id === noteId);
  return { notes, folders, selected };
}
