import { RotateCcw, Trash } from 'lucide-react';
import type { TrashRecord } from '@/db/schema';
import { todoRepo } from '@/db/repositories';
import { toast } from '@/app/store/toast';
import { Button, IconButton } from '@/components/ui/Button';
import { Empty } from '@/components/ui/Empty';
import { fromNow } from '@/lib/date';

export interface TodoTrashProps {
  records: TrashRecord[] | undefined;
}

export function TodoTrash({ records }: TodoTrashProps) {
  if (records === undefined) {
    return <div className="p-6 text-sm text-ink-subtle">加载中…</div>;
  }

  if (records.length === 0) {
    return (
      <Empty
        icon={<Trash />}
        title="回收站是空的"
        hint="删除的待办会在这里保留 7 天，可以恢复或永久删除。"
        className="py-16"
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex justify-end border-b border-line px-4 py-2">
        <Button
          variant="outline"
          size="sm"
          className="text-danger"
          onClick={() => {
            if (!window.confirm('清空待办回收站？此操作不可撤销。')) return;
            void todoRepo.emptyTodoTrash().then((n) => toast(`已永久删除 ${n} 项`, 'success'));
          }}
        >
          清空回收站
        </Button>
      </div>
      <ul className="flex-1 space-y-1 overflow-y-auto p-3">
        {records.map((row) => (
          <li
            key={row.id}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.8125rem] text-ink">{row.label}</p>
              <p className="text-[0.6875rem] text-ink-subtle">删除于 {fromNow(row.deletedAt)}</p>
            </div>
            <IconButton
              label="恢复"
              onClick={() =>
                void todoRepo.restoreTrash(row.id).then(() => toast('已恢复', 'success'))
              }
            >
              <RotateCcw className="size-3.5" />
            </IconButton>
            <IconButton
              label="永久删除"
              onClick={() => {
                if (!window.confirm('永久删除？不可撤销。')) return;
                void todoRepo.purgeTrash(row.id).then(() => toast('已永久删除'));
              }}
            >
              <Trash className="size-3.5" />
            </IconButton>
          </li>
        ))}
      </ul>
    </div>
  );
}
