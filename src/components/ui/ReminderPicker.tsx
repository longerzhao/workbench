import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { toast } from '@/app/store/toast';
import { requestNotificationPermission } from '@/lib/notify';
import { dayjs, todayKey, toDateKey, type DateKey } from '@/lib/date';
import { cn } from '@/lib/cn';
import { DatePicker } from './DatePicker';
import { TimePicker } from './TimePicker';

export interface ReminderPickerProps {
  value: string | undefined;
  onChange: (iso: string | undefined) => void;
  /** 到期日，用于快捷时刻的默认落点 */
  dueDate?: DateKey;
  className?: string;
}

/**
 * 提醒时间选择：日期走 DatePicker、时刻走 TimePicker，与全站保持同一套控件。
 * 没有通知授权时首次设置会弹权限请求；被拒了也照常存时间。
 */
export function ReminderPicker({
  value,
  onChange,
  dueDate,
  className,
}: ReminderPickerProps) {
  // 未设置时用「选中日期」暂存，确认后才落到 ISO
  const current = value ? new Date(value) : undefined;
  const [date, setDate] = useState<DateKey>(
    current && !Number.isNaN(current.getTime()) ? toDateKey(current) : (dueDate ?? todayKey()),
  );
  const [time, setTime] = useState(() =>
    current && !Number.isNaN(current.getTime())
      ? dayjs(current).format('HH:mm')
      : '09:00',
  );

  const emit = (nextDate: DateKey, nextTime: string) => {
    const iso = new Date(`${nextDate}T${nextTime}`).toISOString();
    onChange(iso);
  };

  const ensurePermission = async () => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      const ok = await requestNotificationPermission();
      if (!ok) toast('未获得通知权限，提醒时间仍会保存');
    }
  };

  const clear = () => onChange(undefined);

  const quick = (quickTime: string) => {
    setTime(quickTime);
    const target = value ? toDateKey(new Date(value)) : (dueDate ?? todayKey());
    setDate(target);
    emit(target, quickTime);
    void ensurePermission();
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-1.5">
        <DatePicker
          value={date}
          onChange={(next) => {
            if (!next) return;
            setDate(next);
            emit(next, time);
          }}
          format="YYYY/MM/DD"
          triggerClassName="h-8 flex-1"
        />
        <TimePicker
          value={time}
          onChange={(next) => {
            setTime(next);
            emit(date, next);
          }}
          className="h-8 shrink-0"
        />

        {value ? (
          <button
            type="button"
            onClick={clear}
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
        {(
          [
            ['09:00', '上午 9 点'],
            ['12:00', '中午 12 点'],
            ['18:00', '下午 6 点'],
            ['21:00', '晚上 9 点'],
          ] as const
        ).map(([quickTime, label]) => (
          <button
            key={quickTime}
            type="button"
            onClick={() => quick(quickTime)}
            className="chip bg-surface-2 text-ink-muted transition-colors hover:bg-primary-soft hover:text-primary-text"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}