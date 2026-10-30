import { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { bookmarkRepo } from '@/db/repositories';
import { LayoutGrid, List, Network, Plus } from 'lucide-react';
import type { Bookmark } from '@/db/schema';
import { Button, IconButton } from '@/components/ui/Button';
import { buildBookmarkTopology, filterBookmarks, sortBookmarks } from '@/lib/bookmarkUi';
import { useUIStore } from '@/app/store/ui';
import { cn } from '@/lib/cn';
import { BookmarkForm } from './BookmarkForm';
import { BookmarkGrid } from './BookmarkGrid';
import { BookmarkList } from './BookmarkList';
import { BookmarkTopology } from './BookmarkTopology';
import { BookmarkSidebar } from './BookmarkSidebar';
import { useBookmarkList, useBookmarkSearch } from './useBookmarkQuery';

export function BookmarksPage() {
  const { group, setGroup, groups } = useBookmarkSearch();
  const { items } = useBookmarkList(group);
  const allItems = useLiveQuery(() => bookmarkRepo.listAll(), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Bookmark | null>(null);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  // 切分组时清掉搜索（渲染期重置派生状态，避免 effect 级联）
  const [prevGroup, setPrevGroup] = useState(group);
  if (prevGroup !== group) {
    setPrevGroup(group);
    setQuery('');
  }

  const bookmarkView = useUIStore((state) => state.bookmarkView);
  const setBookmarkView = useUIStore((state) => state.setBookmarkView);
  const bookmarkSort = useUIStore((state) => state.bookmarkSort);
  const setBookmarkSort = useUIStore((state) => state.setBookmarkSort);
  const groupsCollapsed = useUIStore((state) => state.bookmarkGroupsCollapsed);
  const toggleGroupsCollapsed = useUIStore((state) => state.toggleBookmarkGroups);

  // 排序与过滤是 lib 里的纯函数，带单测
  const visible = useMemo(() => {
    if (items === undefined) return undefined;
    return filterBookmarks(sortBookmarks(items, bookmarkSort), query);
  }, [items, bookmarkSort, query]);

  const topologyColumns = useMemo(() => {
    if (allItems === undefined || groups === undefined) return undefined;
    return buildBookmarkTopology(allItems, groups);
  }, [allItems, groups]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (bookmark: Bookmark) => {
    setEditing(bookmark);
    setFormOpen(true);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden md:flex-row">
      <div className="hidden md:flex">
        <BookmarkSidebar
          groups={groups}
          activeGroup={group}
          onSelect={setGroup}
          collapsed={groupsCollapsed}
          onToggleCollapse={toggleGroupsCollapsed}
        />
      </div>

      <div className="border-b border-line md:hidden">
        <BookmarkSidebar groups={groups} activeGroup={group} onSelect={setGroup} compact />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          {/* 分组名侧栏已高亮，头部不再重复；h1 仅供屏幕阅读器 */}
          <h1 className="sr-only">{group}</h1>

          <input
            ref={searchRef}
            className="input h-8 min-w-0 flex-1 text-xs sm:max-w-[13rem]"
            placeholder={bookmarkView === 'topo' ? '搜索全部分组…' : '搜索标题或域名…'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div
            className={cn(
              'flex shrink-0 items-center rounded-[9px] border border-line p-0.5',
              bookmarkView === 'topo' && 'hidden',
            )}
            role="group"
            aria-label="排序"
          >
            {(
              [
                ['manual', '手动'],
                ['clicks', '按点击'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setBookmarkSort(id)}
                aria-pressed={bookmarkSort === id}
                className={cn(
                  'rounded-[7px] px-2 py-1 text-[0.6875rem] transition-colors',
                  bookmarkSort === id
                    ? 'bg-primary-soft font-medium text-primary-text'
                    : 'text-ink-muted hover:bg-surface-2',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div
            className="flex shrink-0 items-center rounded-[9px] border border-line p-0.5"
            role="group"
            aria-label="视图"
          >
            <IconButton
              label="网格视图"
              aria-pressed={bookmarkView === 'grid'}
              className={cn('size-7 rounded-[7px]', bookmarkView === 'grid' && 'bg-primary-soft text-primary-text')}
              onClick={() => setBookmarkView('grid')}
            >
              <LayoutGrid className="size-3.5" />
            </IconButton>
            <IconButton
              label="列表视图"
              aria-pressed={bookmarkView === 'list'}
              className={cn('size-7 rounded-[7px]', bookmarkView === 'list' && 'bg-primary-soft text-primary-text')}
              onClick={() => setBookmarkView('list')}
            >
              <List className="size-3.5" />
            </IconButton>
            <IconButton
              label="拓扑视图"
              aria-pressed={bookmarkView === 'topo'}
              className={cn('size-7 rounded-[7px]', bookmarkView === 'topo' && 'bg-primary-soft text-primary-text')}
              onClick={() => setBookmarkView('topo')}
            >
              <Network className="size-3.5" />
            </IconButton>
          </div>

          <Button variant="primary" size="sm" className="shrink-0" onClick={openCreate}>
            <Plus className="size-3.5" />
            添加书签
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {bookmarkView === 'topo' ? (
            <BookmarkTopology
              columns={topologyColumns}
              query={query}
              onJump={(g) => {
                setGroup(g);
                setBookmarkView('grid');
              }}
            />
          ) : bookmarkView === 'grid' ? (
            <BookmarkGrid items={visible} filtered={Boolean(query.trim())} onAdd={openCreate} />
          ) : (
            <BookmarkList
              group={group}
              items={visible}
              // 搜索过滤或点击排序时顺序无意义，拖拽只在手工排序下开放
              draggable={bookmarkSort === 'manual' && !query.trim()}
              filtered={Boolean(query.trim())}
              onAdd={openCreate}
              onEdit={openEdit}
            />
          )}
        </div>
      </div>

      <BookmarkForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        group={group}
        groupOptions={groups ?? []}
        editing={editing}
      />
    </div>
  );
}
