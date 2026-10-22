import { useState, type FormEvent } from 'react';
import { Repeat } from 'lucide-react';
import type { CalendarEvent, EventRepeat } from '@/db/schema';
import { eventRepo } from '@/db/repositories';
import { toast } from '@/app/store/toast';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { DatePicker } from '@/components/ui/DatePicker';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import { Modal } from '@/components/ui/Modal';
import { TimePicker } from '@/components/ui/TimePicker';
import { isValidTimeRange } from '@/lib/calendarGrid';
import { REPEAT_LABELS, REPEAT_OPTIONS, eventRepeatSummary } from '@/lib/eventOccurrence';
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
  const [endDate, setEndDate] = useState<DateKey | undefined>(editing?.endDate);
  const [repeat, setRepeat] = useState<EventRepeat>(editing?.repeat ?? 'none');
  const [allDay, setAllDay] = useState(editing?.allDay ?? false);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [color, setColor] = useState(editing?.color ?? COLORS[0]!);
  const [note, setNote] = useState(editing?.note ?? '');
  const [busy, setBusy] = useState(false);

  const endDateLabel = repeat === 'none' ? '结束日期（跨天）' : '重复截止';

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed || busy) return;
    if (!isValidTimeRange(start, end, allDay)) {
      toast('结束时间须晚于开始时间', 'danger');
      return;
    }
    // 结束日不能早于开始日；重复截止允许等于开始日（当天最后一次）
    const nextEnd = endDate && endDate > date ? endDate : undefined;
    if (endDate && endDate < date) {
      toast('结束日期不能早于开始日期', 'danger');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: trimmed,
        date,
        endDate: nextEnd,
        allDay,
        repeat,
        start: allDay ? '00:00' : start,
        end: allDay ? '23:59' : end,
        color,
        note: note.trim() || undefined,
      };
      if (editing) {
        await eventRepo.update(editing.id, payload);
        toast('已更新日程', 'success', 2);
      } else {
        await eventRepo.create(payload);
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
        className="space-y-4"
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

        <div className="space-y-1.5">
          <span className="text-[0.8125rem] text-ink-muted">日期</span>
          <DatePicker
            value={date}
            clearable={false}
            format="YYYY/MM/DD"
            onChange={(next) => {
              if (next) setDate(next);
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <span className="flex items-center gap-1 text-[0.8125rem] text-ink-muted">
              <Repeat className="size-3" />
              重复
            </span>
            <Dropdown
              align="start"
              className="w-full"
              trigger={
                <button
                  type="button"
                  className="flex h-8 w-full items-center justify-between rounded-[10px] border border-line bg-surface px-2.5 text-left text-[0.8125rem] text-ink transition-colors hover:border-line-strong hover:bg-surface-2"
                >
                  {REPEAT_LABELS[repeat]}
                </button>
              }
            >
              {(close) => (
                <>
                  {REPEAT_OPTIONS.map((o) => (
                    <DropdownItem
                      key={o.value}
                      active={repeat === o.value}
                      onClick={() => {
                        setRepeat(o.value);
                        close();
                      }}
                    >
                      {o.label}
                    </DropdownItem>
                  ))}
                </>
              )}
            </Dropdown>
          </div>

          <div className="space-y-1.5">
            <span className="text-[0.8125rem] text-ink-muted">{endDateLabel}</span>
            <DatePicker
              value={endDate}
              clearable
              format="YYYY/MM/DD"
              placeholder={repeat === 'none' ? '仅当天' : '一直重复'}
              onChange={(next) => setEndDate(next)}
            />
          </div>
        </div>
        {endDate && endDate < date ? (
          <p className="text-[0.6875rem] text-danger">结束日期不能早于开始日期</p>
        ) : endDate && endDate > date && repeat === 'none' ? (
          <p className="text-[0.6875rem] text-ink-subtle">
            {eventRepeatSummary({ date, endDate, repeat } as CalendarEvent)}
          </p>
        ) : null}

        <div className="flex items-center justify-between rounded-[10px] border border-line px-3 py-2">
          <span className="text-[0.8125rem] text-ink">全天</span>
          <Checkbox checked={allDay} onChange={setAllDay} label="全天" variant="select" />
        </div>

        {!allDay ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="text-[0.8125rem] text-ink-muted">开始</span>
              <TimePicker value={start} onChange={setStart} />
            </div>
            <div className="space-y-1.5">
              <span className="text-[0.8125rem] text-ink-muted">结束</span>
              <TimePicker value={end} onChange={setEnd} />
            </div>
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
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                className={cn(
                  'size-7 rounded-full ring-2 ring-offset-2 ring-offset-surface transition-shadow',
                  color === c ? 'ring-primary' : 'ring-transparent hover:ring-line-strong',
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
