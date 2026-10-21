import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  CornerDownLeft,
  ListChecks,
  NotebookPen,
  Search,
  Sparkles,
  SunMoon,
  type LucideIcon,
} from 'lucide-react';
import { NAV_ITEMS } from '@/app/navigation';
import { useCommandStore } from '@/app/store/command';
import { useUIStore } from '@/app/store/ui';
import { toast } from '@/app/store/toast';
import { noteRepo, todoRepo } from '@/db/repositories';
import { cn } from '@/lib/cn';
import { rankByFuzzy, splitHighlight } from '@/lib/fuzzy';

interface PaletteItem {
  key: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  /** 命中下标，用于高亮；没有查询时为空 */
  positions: number[];
  run: () => void | Promise<void>;
}

interface Section {
  title: string;
  items: PaletteItem[];
}

const MAX_TODO_HITS = 5;
const MAX_NOTE_HITS = 5;

function Highlight({ text, positions }: { text: string; positions: number[] }) {
  if (positions.length === 0) return <>{text}</>;
  return (
    <>
      {splitHighlight(text, positions).map(([chunk, marked], index) =>
        marked ? (
          <mark key={index} className="bg-primary-soft text-primary-text">
            {chunk}
          </mark>
        ) : (
          <span key={index}>{chunk}</span>
        ),
      )}
    </>
  );
}

/**
 * 命令面板。由外壳按 open 条件挂载，所以每次打开都是干净状态，
 * 不需要在 effect 里重置 query —— 那正是 react-hooks v7 禁止的写法。
 */
export function CommandPalette() {
  const navigate = useNavigate();
  const mode = useCommandStore((state) => state.mode);
  const closePalette = useCommandStore((state) => state.closePalette);
  const cycleTheme = useUIStore((state) => state.cycleTheme);

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const todos = useLiveQuery(() => todoRepo.listOpen(), []);
  const notes = useLiveQuery(() => noteRepo.listAll(), []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimmed = query.trim();

  const sections = useMemo<Section[]>(() => {
    /**
     * 「新建」放在最后而不是最前：输入「日历」时如果回车就建了一条叫日历的待办，
     * 比没反应更糟。命中导航/内容时优先跳转，只有在没别的命中时才轮得到新建。
     */
    const createActions: PaletteItem[] = trimmed
      ? [
          {
            key: 'create-todo',
            label: `新建待办「${trimmed}」`,
            hint: '回车创建',
            icon: ListChecks,
            positions: [],
            run: async () => {
              await todoRepo.create({ title: trimmed });
              toast(`已创建待办：${trimmed}`, 'success');
              navigate('/todos');
            },
          },
          {
            key: 'create-note',
            label: `新建笔记「${trimmed}」`,
            hint: '回车创建',
            icon: NotebookPen,
            positions: [],
            run: async () => {
              const note = await noteRepo.create({ content: trimmed });
              toast('已创建笔记', 'success');
              navigate(`/notes?id=${note.id}`);
            },
          },
        ]
      : [];

    const quickActions: PaletteItem[] = trimmed
      ? []
      : [
          {
            key: 'theme',
            label: '切换主题（浅色 → 深色 → 跟随系统）',
            icon: SunMoon,
            positions: [],
            run: () => cycleTheme(),
          },
        ];

    const navHits = rankByFuzzy(
      trimmed,
      NAV_ITEMS,
      (item) => `${item.label} ${item.hint}`,
      NAV_ITEMS.length,
    ).map<PaletteItem>(({ item, positions }) => ({
      key: `nav-${item.path}`,
      label: item.label,
      hint: item.hint,
      icon: item.icon,
      positions,
      run: () => navigate(item.path),
    }));

    const todoHits = rankByFuzzy(trimmed, todos ?? [], (todo) => todo.title, MAX_TODO_HITS).map<
      PaletteItem
    >(({ item, positions }) => ({
      key: `todo-${item.id}`,
      label: item.title,
      hint: item.dueDate ?? '未排期',
      icon: ListChecks,
      positions,
      run: () => navigate('/todos'),
    }));

    const noteHits = rankByFuzzy(trimmed, notes ?? [], (note) => note.title, MAX_NOTE_HITS).map<
      PaletteItem
    >(({ item, positions }) => ({
      key: `note-${item.id}`,
      label: item.title,
      hint: '笔记',
      icon: NotebookPen,
      positions,
      run: () => navigate(`/notes?id=${item.id}`),
    }));

    const result: Section[] = [];
    if (quickActions.length > 0) result.push({ title: '快捷操作', items: quickActions });
    if (navHits.length > 0) result.push({ title: '跳转', items: navHits });
    if (todoHits.length > 0) result.push({ title: '待办', items: todoHits });
    if (noteHits.length > 0) result.push({ title: '笔记', items: noteHits });
    if (createActions.length > 0) result.push({ title: '新建', items: createActions });
    return result;
  }, [trimmed, todos, notes, navigate, cycleTheme]);

  // 拍平成线性列表，键盘上下移动与高亮共用同一套下标
  const flat = useMemo(() => sections.flatMap((section) => section.items), [sections]);
  const safeActive = flat.length === 0 ? 0 : Math.min(active, flat.length - 1);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${safeActive}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [safeActive]);

  const runAt = async (index: number) => {
    const item = flat[index];
    if (!item) return;
    closePalette();
    await item.run();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePalette();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(flat.length === 0 ? 0 : (safeActive + 1) % flat.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(flat.length === 0 ? 0 : (safeActive - 1 + flat.length) % flat.length);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      void runAt(safeActive);
    }
  };

  let cursor = 0;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={closePalette}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="命令面板"
        className="card animate-pop-in relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden shadow-[var(--shadow-pop)]"
      >
        <div className="flex shrink-0 items-center gap-2.5 border-b border-line px-3.5">
          <Search className="size-4 shrink-0 text-ink-subtle" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded={flat.length > 0}
            aria-controls="command-list"
            aria-activedescendant={flat[safeActive] ? `command-item-${safeActive}` : undefined}
            placeholder={mode === 'create' ? '输入标题，回车新建…' : '搜索待办、笔记，或跳转模块…'}
            className="h-12 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle"
          />
          <kbd className="shrink-0 rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[0.625rem] text-ink-subtle">
            esc
          </kbd>
        </div>

        <div
          ref={listRef}
          id="command-list"
          role="listbox"
          className="min-h-0 flex-1 overflow-y-auto p-1.5"
        >
          {flat.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-3 py-10 text-center">
              <Sparkles className="size-5 text-ink-subtle" />
              <p className="text-[0.8125rem] text-ink-muted">没有匹配项</p>
              <p className="text-xs text-ink-subtle">换个关键词，或直接输入新标题回车新建</p>
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.title} className="mb-1">
                <p className="px-2 py-1 text-[0.625rem] font-medium uppercase tracking-wide text-ink-subtle">
                  {section.title}
                </p>
                {section.items.map((item) => {
                  const index = cursor;
                  cursor += 1;
                  const isActive = index === safeActive;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      id={`command-item-${index}`}
                      data-index={index}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onMouseMove={() => setActive(index)}
                      onClick={() => void runAt(index)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-[8px] px-2 py-2 text-left transition-colors',
                        isActive
                          ? 'bg-primary-soft text-primary-text'
                          : 'text-ink hover:bg-surface-2',
                      )}
                    >
                      <Icon className="size-3.5 shrink-0 opacity-70" />
                      <span className="min-w-0 flex-1 truncate text-[0.8125rem]">
                        <Highlight text={item.label} positions={item.positions} />
                      </span>
                      {item.hint ? (
                        <span className="shrink-0 text-[0.6875rem] text-ink-subtle">{item.hint}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <footer className="flex shrink-0 items-center gap-3 border-t border-line px-3.5 py-2 text-[0.6875rem] text-ink-subtle">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-line bg-surface-2 px-1 py-px">↑</kbd>
            <kbd className="rounded border border-line bg-surface-2 px-1 py-px">↓</kbd>
            选择
          </span>
          <span className="flex items-center gap-1">
            <CornerDownLeft className="size-3" />
            打开
          </span>
          <span className="ml-auto">输入标题回车可直接新建</span>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
