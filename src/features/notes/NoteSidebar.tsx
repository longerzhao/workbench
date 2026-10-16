import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  Pencil,
  Pin,
  Plus,
  Search,
  StickyNote,
  Trash,
} from 'lucide-react';
import type { Note, NoteFolder } from '@/db/schema';
import { noteFolderRepo, noteRepo } from '@/db/repositories';
import { toast } from '@/app/store/toast';
import { Empty } from '@/components/ui/Empty';
import { IconButton } from '@/components/ui/Button';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { fromNow } from '@/lib/date';
import { summarizeNote } from '@/lib/noteText';
import {
  ancestorFolderIds,
  buildNoteTree,
  type NoteTreeFolderNode,
  type NoteTreeNode,
} from '@/lib/noteTree';
import { cn } from '@/lib/cn';

export interface NoteSidebarProps {
  notes: Note[] | undefined;
  folders: NoteFolder[] | undefined;
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onCreated: (id: string) => void;
  compact?: boolean;
}

type DragPayload =
  | { kind: 'note'; id: string }
  | { kind: 'folder'; id: string };

function parseDragId(id: string | number): DragPayload | null {
  const raw = String(id);
  if (raw.startsWith('note:')) return { kind: 'note', id: raw.slice(5) };
  if (raw.startsWith('folder:')) return { kind: 'folder', id: raw.slice(7) };
  return null;
}

export function NoteSidebar({
  notes,
  folders,
  selectedId,
  onSelect,
  onCreated,
  compact,
}: NoteSidebarProps) {
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [forcedClosed, setForcedClosed] = useState<Set<string>>(() => new Set());
  const [folderDraft, setFolderDraft] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const selectedFolderId = notes?.find((n) => n.id === selectedId)?.folderId ?? null;

  const autoExpanded = useMemo(() => {
    if (!folders || !selectedFolderId) return new Set<string>();
    return new Set(ancestorFolderIds(folders, selectedFolderId));
  }, [folders, selectedFolderId]);

  const isExpanded = (id: string) => {
    if (forcedClosed.has(id)) return false;
    return expanded.has(id) || autoExpanded.has(id);
  };

  const filteredNotes = useMemo(() => {
    if (!notes) return undefined;
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [notes, query]);

  const tree = useMemo(() => {
    if (!notes || !folders) return undefined;
    return buildNoteTree(folders, notes);
  }, [notes, folders]);

  const searching = query.trim().length > 0;

  const createNote = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const note = await noteRepo.create({
        content: '',
        title: '无标题笔记',
        folderId: activeFolderId,
      });
      onCreated(note.id);
    } catch (error) {
      toast(error instanceof Error ? error.message : '新建失败', 'danger');
    } finally {
      setCreating(false);
    }
  };

  const startCreateFolder = (parentId: string | null) => {
    setFolderDraft(parentId === null ? 'root' : parentId);
    setFolderName('');
    if (parentId) {
      setExpanded((prev) => new Set(prev).add(parentId));
      setActiveFolderId(parentId);
    }
  };

  const commitCreateFolder = async (event: FormEvent) => {
    event.preventDefault();
    if (folderDraft === null) return;
    const parentId = folderDraft === 'root' ? null : folderDraft;
    try {
      const folder = await noteFolderRepo.create({ name: folderName, parentId });
      setFolderDraft(null);
      setFolderName('');
      setActiveFolderId(folder.id);
      if (parentId) setExpanded((prev) => new Set(prev).add(parentId));
      setExpanded((prev) => new Set(prev).add(folder.id));
      toast('已创建目录', 'success', 2);
    } catch (error) {
      toast(error instanceof Error ? error.message : '创建失败', 'danger');
    }
  };

  const commitRename = async (id: string) => {
    const name = renameDraft.trim();
    setRenamingId(null);
    if (!name) return;
    try {
      await noteFolderRepo.rename(id, name);
    } catch (error) {
      toast(error instanceof Error ? error.message : '重命名失败', 'danger');
    }
  };

  const removeFolder = async (folder: NoteFolder) => {
    if (!window.confirm(`删除目录「${folder.name}」？其中的笔记和子目录会移到上一级。`)) return;
    try {
      await noteFolderRepo.remove(folder.id);
      if (activeFolderId === folder.id) setActiveFolderId(folder.parentId);
      toast('目录已删除', 'success', 2);
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'danger');
    }
  };

  const toggleExpand = (id: string) => {
    if (isExpanded(id)) {
      setForcedClosed((prev) => new Set(prev).add(id));
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      setForcedClosed((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setExpanded((prev) => new Set(prev).add(id));
    }
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const active = parseDragId(event.active.id);
    if (!active || !event.over) return;
    const overId = String(event.over.id);

    let targetFolderId: string | null | undefined;
    if (overId === 'drop:root') targetFolderId = null;
    else if (overId.startsWith('drop:folder:')) targetFolderId = overId.slice('drop:folder:'.length);
    else return;

    try {
      if (active.kind === 'note') {
        const note = notes?.find((n) => n.id === active.id);
        if (!note || (note.folderId ?? null) === targetFolderId) return;
        await noteRepo.moveToFolder(active.id, targetFolderId);
      } else {
        const folder = folders?.find((f) => f.id === active.id);
        if (!folder || folder.parentId === targetFolderId) return;
        if (targetFolderId === active.id) return;
        await noteFolderRepo.move(active.id, targetFolderId);
        if (targetFolderId) setExpanded((prev) => new Set(prev).add(targetFolderId));
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '移动失败', 'danger');
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-subtle" />
          <input
            className="input h-8 pl-8 text-xs"
            placeholder="搜索笔记"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <IconButton label="新建笔记" className="size-8" onClick={() => void createNote()} disabled={creating}>
          <Plus className="size-4" />
        </IconButton>
      </div>
    );
  }

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex items-center gap-1.5 border-b border-line p-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-subtle" />
          <input
            className="input h-8 pl-8 text-xs"
            placeholder="搜索笔记"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <IconButton
          label="新建目录"
          className="size-8"
          onClick={() => startCreateFolder(activeFolderId)}
        >
          <FolderPlus className="size-4" />
        </IconButton>
        <IconButton label="新建笔记" className="size-8" onClick={() => void createNote()} disabled={creating}>
          <Plus className="size-4" />
        </IconButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {notes === undefined || folders === undefined ? (
          <div className="p-2">
            <SkeletonLines lines={6} />
          </div>
        ) : searching ? (
          filteredNotes && filteredNotes.length === 0 ? (
            <Empty icon={<StickyNote />} title="无匹配笔记" hint="换个关键词试试" className="py-10" />
          ) : (
            <ul className="space-y-0.5">
              {(filteredNotes ?? []).map((note) => (
                <li key={note.id}>
                  <NoteRowButton
                    note={note}
                    active={note.id === selectedId}
                    onSelect={() => onSelect(note.id)}
                  />
                </li>
              ))}
            </ul>
          )
        ) : (
          <DndContext sensors={sensors} onDragEnd={(e) => void onDragEnd(e)}>
            <RootDropZone>
              {folderDraft === 'root' ? (
                <FolderNameForm
                  value={folderName}
                  onChange={setFolderName}
                  onSubmit={commitCreateFolder}
                  onCancel={() => setFolderDraft(null)}
                />
              ) : null}

              {tree && tree.length === 0 && folderDraft === null ? (
                <Empty
                  icon={<StickyNote />}
                  title="还没有笔记"
                  hint="点 + 新建笔记，或用文件夹图标建目录"
                  className="py-10"
                />
              ) : null}

              <ul className="space-y-0.5">
                {(tree ?? []).map((node) => (
                  <TreeNodeView
                    key={node.type === 'folder' ? node.folder.id : node.note.id}
                    node={node}
                    depth={0}
                    selectedId={selectedId}
                    activeFolderId={activeFolderId}
                    isExpanded={isExpanded}
                    renamingId={renamingId}
                    renameDraft={renameDraft}
                    folderDraft={folderDraft}
                    folderName={folderName}
                    onSelectNote={(id) => {
                      const note = notes?.find((n) => n.id === id);
                      if (note?.folderId) {
                        setActiveFolderId(note.folderId);
                        const ancestors = ancestorFolderIds(folders ?? [], note.folderId);
                        setForcedClosed((prev) => {
                          const next = new Set(prev);
                          for (const fid of ancestors) next.delete(fid);
                          return next;
                        });
                      }
                      onSelect(id);
                    }}
                    onSelectFolder={setActiveFolderId}
                    onToggleExpand={toggleExpand}
                    onStartRename={(folder) => {
                      setRenamingId(folder.id);
                      setRenameDraft(folder.name);
                    }}
                    onRenameDraftChange={setRenameDraft}
                    onCommitRename={(id) => void commitRename(id)}
                    onCancelRename={() => setRenamingId(null)}
                    onRemoveFolder={(folder) => void removeFolder(folder)}
                    onCreateChild={(parentId) => startCreateFolder(parentId)}
                    onFolderNameChange={setFolderName}
                    onCommitCreateFolder={commitCreateFolder}
                    onCancelCreateFolder={() => setFolderDraft(null)}
                  />
                ))}
              </ul>
            </RootDropZone>
          </DndContext>
        )}
      </div>
    </aside>
  );
}

function RootDropZone({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'drop:root' });
  return (
    <div
      ref={setNodeRef}
      className={cn('min-h-full rounded-[10px]', isOver && 'bg-primary-soft/40 ring-1 ring-primary/30')}
    >
      {children}
    </div>
  );
}

function FolderNameForm({
  value,
  onChange,
  onSubmit,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mb-1 flex items-center gap-1 px-1 py-0.5">
      <Folder className="size-3.5 shrink-0 text-ink-subtle" />
      <input
        autoFocus
        className="input h-7 min-w-0 flex-1 text-xs"
        placeholder="目录名称"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
        }}
      />
    </form>
  );
}

function NoteRowButton({
  note,
  active,
  onSelect,
  dragHandle,
}: {
  note: Note;
  active: boolean;
  onSelect: () => void;
  dragHandle?: Record<string, unknown>;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      {...dragHandle}
      className={cn(
        'flex w-full flex-col gap-0.5 rounded-[10px] px-2.5 py-1.5 text-left transition-colors',
        active ? 'bg-primary-soft text-primary-text' : 'hover:bg-surface-2',
      )}
    >
      <span className="flex items-center gap-1.5">
        {note.pinned ? <Pin className="size-3 shrink-0 opacity-70" /> : null}
        <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium">
          {note.title || '无标题笔记'}
        </span>
        <span className="shrink-0 text-[0.6875rem] opacity-60">{fromNow(note.updatedAt)}</span>
      </span>
      <span className={cn('truncate text-[0.75rem]', active ? 'opacity-80' : 'text-ink-subtle')}>
        {summarizeNote(note.content)}
      </span>
    </button>
  );
}

type TreeNodeViewProps = {
  node: NoteTreeNode;
  depth: number;
  selectedId: string | undefined;
  activeFolderId: string | null;
  isExpanded: (id: string) => boolean;
  renamingId: string | null;
  renameDraft: string;
  folderDraft: string | null;
  folderName: string;
  onSelectNote: (id: string) => void;
  onSelectFolder: (id: string | null) => void;
  onToggleExpand: (id: string) => void;
  onStartRename: (folder: NoteFolder) => void;
  onRenameDraftChange: (v: string) => void;
  onCommitRename: (id: string) => void;
  onCancelRename: () => void;
  onRemoveFolder: (folder: NoteFolder) => void;
  onCreateChild: (parentId: string) => void;
  onFolderNameChange: (v: string) => void;
  onCommitCreateFolder: (e: FormEvent) => void;
  onCancelCreateFolder: () => void;
};

function TreeNodeView(props: TreeNodeViewProps) {
  if (props.node.type === 'note') {
    return (
      <DraggableNote
        note={props.node.note}
        depth={props.depth}
        active={props.node.note.id === props.selectedId}
        onSelect={() => props.onSelectNote(props.node.type === 'note' ? props.node.note.id : '')}
      />
    );
  }

  return <FolderNodeView {...props} node={props.node} />;
}

function DraggableNote({
  note,
  depth,
  active,
  onSelect,
}: {
  note: Note;
  depth: number;
  active: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `note:${note.id}`,
    data: { kind: 'note', id: note.id } satisfies DragPayload,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ paddingLeft: depth * 12 }}
      className={cn(isDragging && 'opacity-50')}
    >
      <NoteRowButton
        note={note}
        active={active}
        onSelect={onSelect}
        dragHandle={{ ...attributes, ...listeners }}
      />
    </li>
  );
}

function FolderNodeView({
  node,
  depth,
  selectedId,
  activeFolderId,
  isExpanded,
  renamingId,
  renameDraft,
  folderDraft,
  folderName,
  onSelectNote,
  onSelectFolder,
  onToggleExpand,
  onStartRename,
  onRenameDraftChange,
  onCommitRename,
  onCancelRename,
  onRemoveFolder,
  onCreateChild,
  onFolderNameChange,
  onCommitCreateFolder,
  onCancelCreateFolder,
}: Omit<TreeNodeViewProps, 'node'> & { node: NoteTreeFolderNode }) {
  const folder = node.folder;
  const open = isExpanded(folder.id);
  const active = activeFolderId === folder.id;

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop:folder:${folder.id}`,
  });
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: `folder:${folder.id}`,
    data: { kind: 'folder', id: folder.id } satisfies DragPayload,
  });

  const setRefs = (el: HTMLElement | null) => {
    setDropRef(el);
    setDragRef(el);
  };

  return (
    <li className={cn(isDragging && 'opacity-50')}>
      <div
        ref={setRefs}
        style={{ paddingLeft: depth * 12 }}
        className={cn(
          'group flex items-center gap-0.5 rounded-[10px] pr-1',
          active && 'bg-primary-soft/60',
          isOver && 'bg-primary-soft ring-1 ring-primary/30',
        )}
      >
        <button
          type="button"
          className="grid size-7 shrink-0 place-items-center rounded-md text-ink-subtle hover:bg-surface-2"
          onClick={() => onToggleExpand(folder.id)}
          aria-label={open ? '折叠' : '展开'}
        >
          {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </button>

        {renamingId === folder.id ? (
          <input
            autoFocus
            className="input h-7 min-w-0 flex-1 text-xs"
            value={renameDraft}
            onChange={(e) => onRenameDraftChange(e.target.value)}
            onBlur={() => onCommitRename(folder.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCommitRename(folder.id);
              if (e.key === 'Escape') onCancelRename();
            }}
          />
        ) : (
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1 py-1.5 text-left text-[0.8125rem] font-medium text-ink hover:bg-surface-2"
            onClick={() => {
              onSelectFolder(folder.id);
              if (!open) onToggleExpand(folder.id);
            }}
            {...attributes}
            {...listeners}
          >
            <Folder className="size-3.5 shrink-0 opacity-70" />
            <span className="truncate">{folder.name}</span>
          </button>
        )}

        <IconButton
          label="在此新建目录"
          className="size-7 opacity-0 group-hover:opacity-100"
          onClick={() => onCreateChild(folder.id)}
        >
          <FolderPlus className="size-3.5" />
        </IconButton>
        <IconButton
          label="重命名"
          className="size-7 opacity-0 group-hover:opacity-100"
          onClick={() => onStartRename(folder)}
        >
          <Pencil className="size-3.5" />
        </IconButton>
        <IconButton
          label="删除目录"
          className="size-7 text-danger opacity-0 group-hover:opacity-100"
          onClick={() => onRemoveFolder(folder)}
        >
          <Trash className="size-3.5" />
        </IconButton>
      </div>

      {open ? (
        <ul className="space-y-0.5">
          {folderDraft === folder.id ? (
            <li style={{ paddingLeft: (depth + 1) * 12 }}>
              <FolderNameForm
                value={folderName}
                onChange={onFolderNameChange}
                onSubmit={onCommitCreateFolder}
                onCancel={onCancelCreateFolder}
              />
            </li>
          ) : null}
          {node.children.map((child) => (
            <TreeNodeView
              key={child.type === 'folder' ? child.folder.id : child.note.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              activeFolderId={activeFolderId}
              isExpanded={isExpanded}
              renamingId={renamingId}
              renameDraft={renameDraft}
              folderDraft={folderDraft}
              folderName={folderName}
              onSelectNote={onSelectNote}
              onSelectFolder={onSelectFolder}
              onToggleExpand={onToggleExpand}
              onStartRename={onStartRename}
              onRenameDraftChange={onRenameDraftChange}
              onCommitRename={onCommitRename}
              onCancelRename={onCancelRename}
              onRemoveFolder={onRemoveFolder}
              onCreateChild={onCreateChild}
              onFolderNameChange={onFolderNameChange}
              onCommitCreateFolder={onCommitCreateFolder}
              onCancelCreateFolder={onCancelCreateFolder}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
