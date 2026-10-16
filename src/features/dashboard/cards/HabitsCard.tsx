import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, Flame } from 'lucide-react';
import { habitRepo } from '@/db/repositories';
import { Panel } from '@/components/ui/Panel';
import { Empty } from '@/components/ui/Empty';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { habitIcon } from '@/lib/habitIcons';
import { todayKey, weekdayShort } from '@/lib/date';
import { cn } from '@/lib/cn';

const DAYS = 7;

export function HabitsCard() {
  const data = useLiveQuery(async () => {
    const [habits, matrix] = await Promise.all([
      habitRepo.listActive(),
      habitRepo.recentMatrix(DAYS),
    ]);
    return { habits, dates: matrix.dates, hit: matrix.hit };
  }, []);

  const today = todayKey();

  return (
    <Panel
      title="习惯打卡"
      icon={<Flame />}
      badge={data === undefined ? undefined : `近 ${DAYS} 天`}
      action={
        <Link to="/habits" className="btn btn-ghost h-7 px-2 text-xs" title="打开习惯">
          <ArrowRight className="size-3.5" />
        </Link>
      }
      padded={false}
      bodyClassName="flex flex-col"
      footer={
        data === undefined ? null : (
          <span>
            今日已打卡 {data.habits.filter((h) => data.hit.get(h.id)?.has(today)).length}/
            {data.habits.length} 个习惯 · 点格子即可补打或取消
          </span>
        )
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-2">
        {data === undefined ? (
          <SkeletonLines lines={4} />
        ) : data.habits.length === 0 ? (
          <Empty
            icon={<Flame />}
            title="还没有习惯"
            hint="到习惯页添加「阅读」「运动」这类想坚持的事。"
          />
        ) : (
          <div className="space-y-0.5">
            {/* 星期表头 */}
            <div className="flex items-center gap-2 pb-1">
              <span className="w-[6.5rem] shrink-0" />
              <div className="flex flex-1 items-center justify-between">
                {data.dates.map((date) => (
                  <span
                    key={date}
                    className={cn(
                      'w-6 text-center text-[0.625rem]',
                      date === today ? 'font-semibold text-primary-text' : 'text-ink-subtle',
                    )}
                  >
                    {weekdayShort(date)}
                  </span>
                ))}
              </div>
            </div>

            {data.habits.map((habit) => {
              const Icon = habitIcon(habit.icon);
              const hits = data.hit.get(habit.id);

              return (
                <div
                  key={habit.id}
                  className="flex items-center gap-2 rounded-lg py-1 transition-colors hover:bg-surface-2"
                >
                  <span className="flex w-[6.5rem] shrink-0 items-center gap-1.5">
                    <Icon className="size-3.5 shrink-0" style={{ color: habit.color }} />
                    <span className="truncate text-[0.8125rem] text-ink">{habit.name}</span>
                  </span>

                  <div className="flex flex-1 items-center justify-between">
                    {data.dates.map((date) => {
                      const done = hits?.has(date) ?? false;
                      const isToday = date === today;
                      const isFuture = date > today;

                      return (
                        <button
                          key={date}
                          type="button"
                          disabled={isFuture}
                          aria-label={`${habit.name} ${date} ${done ? '已打卡' : '未打卡'}`}
                          aria-pressed={done}
                          onClick={() => void habitRepo.toggleLog(habit.id, date)}
                          className={cn(
                            'size-6 rounded-[7px] border transition-all duration-150',
                            done ? 'border-transparent' : 'border-line-strong hover:border-primary',
                            isFuture && 'cursor-not-allowed opacity-35',
                            isToday && 'ring-1 ring-primary ring-offset-1 ring-offset-[var(--surface)]',
                          )}
                          style={done ? { backgroundColor: habit.color } : undefined}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Panel>
  );
}
