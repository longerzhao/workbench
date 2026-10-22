import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { toast } from '@/app/store/toast';
import { requestNotificationPermission } from '@/lib/notify';
import { fromLocalInput, toLocalInput } from '@/lib/reminderTime';
import { todayKey, type DateKey } from '@/lib/date';
import { cn } from '@/lib/cn';

export interface ReminderPickerProps {
  value: string | undefined;
  onChange: (iso: string | undefined) => void;
  /** 到期日，用于「到期当天」快捷选项的默认落点 */
  dueDate?: DateKey;
  className?: string;
}

/**
 * 提醒时间选择：优先用浏览器系统通知。
 * 没有授权时首次设置会弹权限请求，被拒了也照常存时间（下次打开仍会尝试提醒）。
 */
export function ReminderPicker({
  value,
  onChange,
  dueDate,
  className,
}: ReminderPickerProps) {
  const [text, setText] = useState(() => toLocalInput(value));

  const commit = (next: string) => {
    setText(next);
    onChange(fromLocalInput(next));
  };

  const quick = (time: string) => {
    commit(`${dueDate ?? todayKey()}T${time}`);
  };

  const clear = async () => {
    commit('');
    onChange(undefined);
  };

  const ensurePermission = async () => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      const ok = await requestNotificationPermission();
      if (!ok) {
        toast('未获得通知权限，提醒时间仍会保存');
      }
    }
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-1.5">
        <input
          type="datetime-local"
          value={text}
          onChange={(e) => commit(e.target.value)}
          onFocus={() => void ensurePermission()}
          aria-label="提醒时间"
          className="h-8 min-w-0 flex-1 rounded-[10px] border border-line bg-surface px-2 text-[0.8125rem] tabular-nums text-ink outline-none transition-colors focus:border-line-strong"
        />
        {value ? (
          <button
            type="button"
            onClick={() => void clear()}
            aria-label="清除提醒"
            title="清除提醒"
            className="grid size-8 shrink-0 place-items-center rounded-[10px] text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <BellOff className="size-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void ensurePermission()}
            aria-label="申请通知权限"
            title="申请通知权限"
            className="grid size-8 shrink-0 place-items-center rounded-[10px] text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Bell className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[
          ['09:00', '上午 9 点'],
          ['12:00', '中午 12 点'],
          ['18:00', '下午 6 点'],
          ['21:00', '晚上 9 点'],
        ].map(([time, label]) => (
          <button
            key={time}
            type="button"
            onClick={() => quick(time!)}
            className="chip bg-surface-2 text-ink-muted transition-colors hover:bg-primary-soft hover:text-primary-text"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}