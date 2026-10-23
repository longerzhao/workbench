import { useState } from 'react';
import { Calendar, Flag, FolderInput, Trash, X } from 'lucide-react';
import type { Priority, Project } from '@/db/schema';
import { todoRepo } from '@/db/repositories';
import { toast } from '@/app/store/toast';
import { todayKey } from '@/lib/date';
import { Button } from '@/components/ui/Button';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';

export interface TodoBatchBarProps {
  selectedIds: string[];
  projects: Project[];
  onClear: () => void;
}

export function TodoBatchBar({ selectedIds, projects, onClear }: TodoBatchBarProps) {
  const [busy, setBusy] = useState(false);
  if (selectedIds.length === 0) return null;

  const run = async (action: () => Promise<number | void>, okMsg: string) => {
    setBusy(true);
    try {
      const n = await action();
      toast(typeof n === 'number' ? `${okMsg}（${n}）` : okMsg, 'success');
      onClear();
    } catch (error) {
      toast(error instanceof Error ? error.message : '批量操作失败', 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-50 flex justify-center px-4 pb-[max(0.25rem,env(safe-area-inset-bottom))] lg:bottom-4">
      <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-1 rounded-2xl border border-line bg-surface/95 px-2 py-1.5 shadow-[var(--shadow-pop)] backdrop-blur-sm">
        <span className="px-2 text-xs font-medium text-ink">已选 {selectedIds.length}</span>

        <Dropdown
          side="top"
          align="start"
          trigger={
            <Button variant="ghost" size="sm" disabled={busy}>
              <Calendar className="size-3.5" />
              改期
            </Button>
          }
        >
          {(close) => (
            <>
              <DropdownItem
                onClick={() => {
                  close();
                  const dueDate = window.prompt('到期日 YYYY-MM-DD（留空清除）') ?? '';
                  void run(
                    () =>
                      todoRepo.updateMany(selectedIds, {
                        dueDate: dueDate.trim() || undefined,
                      }),
                    '已改期',
                  );
                }}
              >
                指定日期…
              </DropdownItem>
              <DropdownItem
                onClick={() => {
                  close();
                  // 本地时区的今天：toISOString 是 UTC，东八区 0-8 点会取到昨天
                  void run(
                    () => todoRepo.updateMany(selectedIds, { dueDate: todayKey() }),
                    '已设为今天',
                  );
                }}
              >
                今天
              </DropdownItem>
              <DropdownItem
                onClick={() => {
                  close();
                  void run(
                    () => todoRepo.updateMany(selectedIds, { dueDate: undefined }),
                    '已清除日期',
                  );
                }}
              >
                清除日期
              </DropdownItem>
            </>
          )}
        </Dropdown>

        <Dropdown
          side="top"
          align="start"
          trigger={
            <Button variant="ghost" size="sm" disabled={busy}>
              <Flag className="size-3.5" />
              优先级
            </Button>
          }
        >
          {(close) =>
            ([0, 1, 2, 3] as Priority[]).map((p) => (
              <DropdownItem
                key={p}
                onClick={() => {
                  close();
                  void run(
                    () => todoRepo.updateMany(selectedIds, { priority: p }),
                    p === 0 ? '已清除优先级' : `已设为 P${p}`,
                  );
                }}
              >
                {p === 0 ? '无优先级' : `P${p}`}
              </DropdownItem>
            ))
          }
        </Dropdown>

        <Dropdown
          side="top"
          align="end"
          trigger={
            <Button variant="ghost" size="sm" disabled={busy}>
              <FolderInput className="size-3.5" />
              移入项目
            </Button>
          }
        >
          {(close) => (
            <>
              <DropdownItem
                onClick={() => {
                  close();
                  void run(
                    () => todoRepo.updateMany(selectedIds, { projectId: undefined }),
                    '已移回收件箱',
                  );
                }}
              >
                收件箱
              </DropdownItem>
              {projects.map((p) => (
                <DropdownItem
                  key={p.id}
                  onClick={() => {
                    close();
                    void run(
                      () => todoRepo.updateMany(selectedIds, { projectId: p.id }),
                      `已移入「${p.name}」`,
                    );
                  }}
                >
                  {p.name}
                </DropdownItem>
              ))}
            </>
          )}
        </Dropdown>

        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          className="text-danger"
          onClick={() => {
            if (!window.confirm(`将 ${selectedIds.length} 项移入回收站？`)) return;
            void run(() => todoRepo.removeMany(selectedIds), '已归档到回收站');
          }}
        >
          <Trash className="size-3.5" />
          归档
        </Button>

        <Button variant="ghost" size="sm" onClick={onClear} disabled={busy}>
          <X className="size-3.5" />
          取消
        </Button>
      </div>
    </div>
  );
}
