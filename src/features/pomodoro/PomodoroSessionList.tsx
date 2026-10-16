import { Timer } from 'lucide-react';
import type { Pomodoro } from '@/db/schema';
import { Empty } from '@/components/ui/Empty';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { formatDuration, fromNow } from '@/lib/date';
import { cn } from '@/lib/cn';

export interface PomodoroSessionListProps {
  sessions: Pomodoro[] | undefined;
}

export function PomodoroSessionList({ sessions }: PomodoroSessionListProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-[12px] border border-line">
      <header className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">最近会话</h2>
        <p className="text-[0.75rem] text-ink-subtle">已结束的专注与休息</p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {sessions === undefined ? (
          <div className="p-2">
            <SkeletonLines lines={5} />
          </div>
        ) : sessions.length === 0 ? (
          <Empty
            icon={<Timer />}
            title="暂无会话"
            hint="开始一轮番茄后，记录会出现在这里。"
            className="py-12"
          />
        ) : (
          <ul className="space-y-0.5">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 hover:bg-surface-2"
              >
                <span
                  className={cn(
                    'chip shrink-0',
                    s.type === 'focus' ? 'bg-primary-soft text-primary-text' : 'bg-surface-3',
                  )}
                >
                  {s.type === 'focus' ? '专注' : '休息'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.8125rem] text-ink">
                    {formatDuration(s.durationSec)}
                    {s.type === 'focus' ? (
                      <span
                        className={cn(
                          'ml-2 text-[0.75rem]',
                          s.completed ? 'text-primary-text' : 'text-ink-subtle',
                        )}
                      >
                        {s.completed ? '完成' : '放弃'}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[0.6875rem] text-ink-subtle">{fromNow(s.startedAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
