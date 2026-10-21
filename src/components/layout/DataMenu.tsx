import { useRef, useState } from 'react';
import { Database, HardDriveDownload, HardDriveUpload, Trash } from 'lucide-react';
import { metaSet, nowISO } from '@/db';
import {
  applySnapshot,
  buildSnapshot,
  clearAllData,
  countByTable,
  downloadSnapshot,
  parseBackupFile,
  sanitizeSnapshot,
  type BackupFile,
  type ImportMode,
} from '@/lib/backup';
import { toast } from '@/app/store/toast';
import { Button } from '@/components/ui/Button';
import { Dropdown, DropdownDivider, DropdownItem } from '@/components/ui/Dropdown';
import { Modal } from '@/components/ui/Modal';

interface PendingImport {
  snapshot: BackupFile;
  repaired: number;
}

export function DataMenu() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    try {
      const snapshot = await buildSnapshot();
      downloadSnapshot(snapshot);
      await metaSet('lastBackupAt', nowISO());
      const counts = countByTable(snapshot);
      toast(`已导出 ${counts.todos} 条待办、${counts.notes} 条笔记`, 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : '导出失败', 'danger');
    }
  };

  const handleFilePicked = async (file: File) => {
    try {
      const snapshot = await parseBackupFile(file);
      const { repaired } = sanitizeSnapshot(snapshot);
      setPending({ snapshot, repaired });
    } catch (error) {
      toast(error instanceof Error ? error.message : '导入失败', 'danger');
    }
  };

  const runImport = async (mode: ImportMode) => {
    if (!pending) return;
    setBusy(true);
    try {
      // 覆盖式导入前先落地一份当前数据的快照，否则这一步不可逆
      if (mode === 'replace') {
        downloadSnapshot(await buildSnapshot());
      }
      const result = await applySnapshot(pending.snapshot, mode);
      const total = Object.values(result.imported).reduce((sum, n) => sum + n, 0);
      toast(
        mode === 'replace' ? `已覆盖导入 ${total} 条记录` : `已合并导入 ${total} 条记录`,
        'success',
      );
      setPending(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : '导入失败', 'danger');
    } finally {
      setBusy(false);
    }
  };

  const runClear = async () => {
    setBusy(true);
    try {
      await clearAllData();
      // 重新打上种子标记，避免清空后示例数据又长回来
      await metaSet('seededAt', nowISO());
      toast('已清空全部本地数据', 'success');
      setConfirmClear(false);
    } catch (error) {
      toast(error instanceof Error ? error.message : '清空失败', 'danger');
    } finally {
      setBusy(false);
    }
  };

  const pendingCounts = pending ? countByTable(pending.snapshot) : null;

  return (
    <>
      <Dropdown
        trigger={
          <Button variant="ghost" size="icon" aria-label="数据" title="数据">
            <Database className="size-4" />
          </Button>
        }
      >
        {(close) => (
          <>
            <DropdownItem
              icon={<HardDriveDownload />}
              onClick={() => {
                close();
                void handleExport();
              }}
            >
              导出备份 JSON
            </DropdownItem>
            <DropdownItem
              icon={<HardDriveUpload />}
              onClick={() => {
                close();
                fileRef.current?.click();
              }}
            >
              从备份导入
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem
              icon={<Trash />}
              danger
              onClick={() => {
                close();
                setConfirmClear(true);
              }}
            >
              清空本地数据
            </DropdownItem>
          </>
        )}
      </Dropdown>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void handleFilePicked(file);
        }}
      />

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title="导入备份"
        description={`导出于 ${pending ? pending.snapshot.exportedAt.slice(0, 16).replace('T', ' ') : ''}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)} disabled={busy}>
              取消
            </Button>
            <Button variant="outline" onClick={() => void runImport('merge')} disabled={busy}>
              合并
            </Button>
            <Button variant="primary" onClick={() => void runImport('replace')} disabled={busy}>
              覆盖
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-[0.8125rem] text-ink-muted">
            <strong className="font-semibold text-ink">合并</strong> 按 id 覆盖同一条记录，保留其他数据；
            <strong className="font-semibold text-ink">覆盖</strong> 会清空现有数据后再导入，
            执行前会自动下载一份当前数据的快照。
          </p>

          {pendingCounts ? (
            <dl className="grid grid-cols-3 gap-2">
              {Object.entries(pendingCounts)
                .filter(([key]) => key !== 'meta')
                .map(([key, value]) => (
                  <div key={key} className="rounded-lg bg-surface-2 px-2.5 py-2">
                    <dt className="text-[0.6875rem] text-ink-subtle">{TABLE_LABEL[key] ?? key}</dt>
                    <dd className="text-sm font-semibold tabular-nums text-ink">{value}</dd>
                  </div>
                ))}
            </dl>
          ) : null}

          {pending && pending.repaired > 0 ? (
            <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-ink-muted">
              检测到 {pending.repaired} 条跨表引用失效的记录，导入时会自动修复。
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="清空本地数据"
        description="此操作不可撤销"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmClear(false)} disabled={busy}>
              取消
            </Button>
            <Button
              variant="primary"
              className="bg-danger hover:bg-danger/90"
              onClick={() => void runClear()}
              disabled={busy}
            >
              确认清空
            </Button>
          </>
        }
      >
        <p className="text-[0.8125rem] text-ink-muted">
          将删除当前浏览器中的全部待办、笔记、习惯、日程、书签与配置文件，包括回收站。建议先用「
          导出备份 JSON」留一份存档。
        </p>
      </Modal>
    </>
  );
}

/** 备份里各表的显示名；顺序与 lib/backup 的 BACKUP_TABLES 保持一致（meta 不展示） */
const TABLE_LABEL: Record<string, string> = {
  todos: '待办',
  projects: '项目',
  notes: '笔记',
  noteFolders: '目录',
  habits: '习惯',
  habitLogs: '打卡',
  pomodoros: '番茄',
  events: '日程',
  bookmarks: '书签',
  countdowns: '计时',
};
