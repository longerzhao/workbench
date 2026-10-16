import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Bookmark } from '@/db/schema';
import { Button } from '@/components/ui/Button';
import { BookmarkForm } from './BookmarkForm';
import { BookmarkList } from './BookmarkList';
import { BookmarkSidebar } from './BookmarkSidebar';
import { useBookmarkList, useBookmarkSearch } from './useBookmarkQuery';

export function BookmarksPage() {
  const { group, setGroup, groups } = useBookmarkSearch();
  const { items } = useBookmarkList(group);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Bookmark | null>(null);

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
        <BookmarkSidebar groups={groups} activeGroup={group} onSelect={setGroup} />
      </div>

      <div className="border-b border-line md:hidden">
        <BookmarkSidebar groups={groups} activeGroup={group} onSelect={setGroup} compact />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-ink">{group}</h1>
            <p className="text-[0.75rem] text-ink-subtle">
              {items === undefined ? '…' : `${items.length} 个书签`}
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus className="size-3.5" />
            添加书签
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <BookmarkList
            group={group}
            items={items}
            onAdd={openCreate}
            onEdit={openEdit}
          />
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
