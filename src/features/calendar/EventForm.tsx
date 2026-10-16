import { useState, type FormEvent } from 'react';
import type { CalendarEvent } from '@/db/schema';
import { eventRepo } from '@/db/repositories';
import { toast } from '@/app/store/toast';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { isValidTimeRange } from '@/lib/calendarGrid';
import { dayjs, type DateKey } from '@/lib/date';
import { cn } from '@/lib/cn';

const COLORS = ['#7c3aed', '#2563eb', '#16a34a', '#d97706', '#0d9488', '#db2777', '#dc2626'];

export interface EventFormProps {
  open: boolean;
  onClose: () => void;
  defaultDate: DateKey;
  defaultStart?: string;
  editing?: CalendarEvent | null;
}

export function EventForm(props: EventFormProps) {
  if (!props.open) return null;
  const key = props.editing?.id ?? `new:${props.defaultDate}:${props.defaultStart ?? ''}`;
  return <EventFormInner key={key} {...props} />;
}

function EventFormInner({
  open,
  onClose,
  defaultDate,
  defaultStart,
  editing,
}: EventFormProps) {
  const initialStart = editing?.start ?? defaultStart ?? '09:00';
  const initialEnd =
    editing?.end ??
    dayjs(`2000-01-01T${initialStart}`).add(1, 'hour').format('HH:mm');

  const [title, setTitle] = useState(editing?.title ?? '');
  const [date, setDate] = useState(editing?.date ?? defaultDate);
  const [allDay, setAllDay] = useState(editing?.allDay ?? false);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [color, setColor] = useState(editing?.color ?? COLORS[0]!);
  const [note, setNote] = useState(editing?.note ?? '');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed || busy) return;
    if (!isValidTimeRange(start, end, allDay)) {
      toast('结束时间须晚于开始时间', 'danger');
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await eventRepo.update(editing.id, {
          title: trimmed,
          date,
          allDay,
          start: allDay ? '00:00' : start,
          end: allDay ? '23:59' : end,
          color,
          note: note.trim() || undefined,
        });
        toast('已更新日程', 'success', 2);
      } else {
        await eventRepo.create({
          title: trimmed,
          date,
          allDay,
          start: allDay ? '00:00' : start,
          end: allDay ? '23:59' : end,
          color,
          note: note.trim() || undefined,
        });
        toast('已添加日程', 'success', 2);
      }
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'danger');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!editing) return;
    if (!window.confirm(`删除日程「${editing.title}」？`)) return;
    try {
      await eventRepo.remove(editing.id);
      toast('已移入回收站');
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'danger');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? '编辑日程' : '新建日程'}
      footer={
        <>
          {editing ? (
            <Button variant="ghost" className="mr-auto text-danger" onClick={() => void remove()} disabled={busy}>
              删除
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            取消
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={busy || !title.trim()}>
            {editing ? '保存' : '添加'}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-3"
      >
        <label className="block space-y-1.5">
          <span className="text-[0.8125rem] text-ink-muted">标题</span>
          <input
            autoFocus
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="日程标题"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[0.8125rem] text-ink-muted">日期</span>
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value as DateKey)}
          />
        </label>

        <label className="flex items-center gap-2 text-[0.8125rem] text-ink-muted">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="size-3.5 accent-[var(--primary)]"
          />
          全天
        </label>

        {!allDay ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-[0.8125rem] text-ink-muted">开始</span>
              <input
                type="time"
                className="input"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[0.8125rem] text-ink-muted">结束</span>
              <input
                type="time"
                className="input"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <span className="text-[0.8125rem] text-ink-muted">颜色</span>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setColor(c)}
                className={cn(
                  'size-7 rounded-full border-2',
                  color === c ? 'border-ink' : 'border-transparent',
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-[0.8125rem] text-ink-muted">备注</span>
          <textarea
            className="input min-h-[4rem] resize-y"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="可选"
          />
        </label>
      </form>
    </Modal>
  );
}
