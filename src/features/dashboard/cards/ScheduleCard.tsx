import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, CalendarDays, Plus } from 'lucide-react';
import { eventRepo } from '@/db/repositories';
import { Panel } from '@/components/ui/Panel';
import { Empty } from '@/components/ui/Empty';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { IconButton } from '@/components/ui/Button';
import { toast } from '@/app/store/toast';
import { dayjs, todayKey } from '@/lib/date';
import { cn } from '@/lib/cn';

/** 下一个整半点，作为新建日程的默认开始时间 */
function nextSlot(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() <= 30 ? 30 : 60, 0, 0);
  return dayjs(now).format('HH:mm');
}

export function ScheduleCard() {
  const events = useLiveQuery(() => eventRepo.listToday(), []);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(() => nextSlot());
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      await eventRepo.create({
        title: trimmed,
        date: todayKey(),
        start,
        end: dayjs(`2000-01-01T${start}`).add(30, 'minute').format('HH:mm'),
      });
      setTitle('');
      setStart(nextSlot());
    } catch (error) {
      toast(error instanceof Error ? error.message : '添加失败', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const nowTime = dayjs().format('HH:mm');

  return (
    <Panel
      title="今日日程"
      icon={<CalendarDays />}
      badge={events === undefined ? undefined : events.length}
      action={
        <Link
          to={`/calendar?view=week&date=${todayKey()}`}
          className="btn btn-ghost h-7 px-2 text-xs"
          title="打开日历"
        >
          <ArrowRight className="size-3.5" />
        </Link>
      }
      padded={false}
      bodyClassName="flex flex-col"
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
        {events === undefined ? (
          <SkeletonLines lines={3} />
        ) : events.length === 0 ? (
          <Empty icon={<CalendarDays />} title="今天没有安排" hint="在下面添加一条日程。" />
        ) : (
          <ol className="space-y-0.5">
            {events.map((event) => {
              const passed = !event.allDay && event.end < nowTime;
              return (
                <li key={event.id} className="group flex items-start gap-2.5 rounded-lg py-1.5">
                  <span className="w-10 shrink-0 pt-px text-[0.6875rem] font-medium tabular-nums text-ink-muted">
                    {event.allDay ? '全天' : event.start}
                  </span>

                  <span
                    className="mt-[5px] size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: event.color }}
                  />

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate text-[0.8125rem] leading-snug',
                        passed ? 'text-ink-subtle line-through' : 'text-ink',
                      )}
                    >
                      {event.title}
                    </p>
                    {!event.allDay ? (
                      <p className="text-[0.6875rem] text-ink-subtle">
                        {event.start} – {event.end}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <form onSubmit={submit} className="shrink-0 border-t border-line p-2">
        <div className="flex items-center gap-1.5">
          <input
            type="time"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            aria-label="开始时间"
            className="h-8 w-[4.6rem] shrink-0 rounded-lg bg-surface-2 px-1.5 text-[0.6875rem] tabular-nums text-ink-muted outline-none"
          />
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] px-1.5 transition-colors focus-within:bg-surface-2">
            <Plus className="size-3.5 shrink-0 text-ink-subtle" />
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="添加日程…"
              className="h-8 min-w-0 flex-1 bg-transparent text-[0.8125rem] outline-none placeholder:text-ink-subtle"
            />
          </div>
          {title.trim() ? (
            <IconButton label="添加日程" type="submit" className="size-7" disabled={submitting}>
              <Plus className="size-3.5" />
            </IconButton>
          ) : null}
        </div>
      </form>
    </Panel>
  );
}
