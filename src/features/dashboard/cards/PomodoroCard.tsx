import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, Coffee, Hourglass, Pause, Play, RotateCcw, Target, Timer } from 'lucide-react';
import { todoRepo } from '@/db/repositories';
import { remainingFrom, usePomodoroStore } from '@/app/store/pomodoro';
import { Panel } from '@/components/ui/Panel';
import { Button, IconButton } from '@/components/ui/Button';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import { notify, requestNotificationPermission } from '@/lib/notify';
import { useNow } from '@/hooks/useNow';
import { formatClockDuration, formatDuration } from '@/lib/date';
import { useOverview } from '../useOverview';
import { cn } from '@/lib/cn';

export function PomodoroCard() {
  const mode = usePomodoroStore((state) => state.mode);
  const status = usePomodoroStore((state) => state.status);
  const endsAt = usePomodoroStore((state) => state.endsAt);
  const remainingSec = usePomodoroStore((state) => state.remainingSec);
  const durationSec = usePomodoroStore((state) => state.durationSec);
  const activeTodoTitle = usePomodoroStore((state) => state.activeTodoTitle);
  const soundEnabled = usePomodoroStore((state) => state.soundEnabled);
  const soundDurationSec = usePomodoroStore((state) => state.soundDurationSec);

  const setMode = usePomodoroStore((state) => state.setMode);
  const start = usePomodoroStore((state) => state.start);
  const pause = usePomodoroStore((state) => state.pause);
  const resume = usePomodoroStore((state) => state.resume);
  const abandon = usePomodoroStore((state) => state.abandon);
  const complete = usePomodoroStore((state) => state.complete);
  const advance = usePomodoroStore((state) => state.advance);
  const attachTodo = usePomodoroStore((state) => state.attachTodo);

  const overview = useOverview();
  const todayTodos = useLiveQuery(() => todoRepo.listToday(), []);

  // 每 500ms 重渲染一次；剩余时间本身由 endsAt 计算，不依赖这个定时器
  useNow(500);
  const remaining = remainingFrom({ status, endsAt, remainingSec });
  const ratio = durationSec > 0 ? remaining / durationSec : 0;

  // 只在"running → 归零"这一条边上触发一次，避免重复结算
  const settledRef = useRef(false);
  useEffect(() => {
    if (status !== 'running') {
      settledRef.current = false;
      return;
    }
    if (remaining > 0 || settledRef.current) return;

    settledRef.current = true;
    const wasFocus = mode === 'focus';
    void complete().then(() => {
      notify(
        wasFocus ? '专注结束' : '休息结束',
        wasFocus ? '起来活动一下，下一轮是休息。' : '休息够了，开始下一轮专注吧。',
        soundEnabled,
        soundDurationSec,
      );
      advance();
    });
  }, [status, remaining, mode, complete, advance, soundEnabled, soundDurationSec]);

  const handleStart = () => {
    // 通知权限必须在用户手势里申请，但绝不能 await：
    // 权限提示框可能一直挂着不返回，那样计时器就永远起不来。
    // 申请照常发起（手势有效），计时立刻开始。
    void requestNotificationPermission();
    void start();
  };

  const isFocus = mode === 'focus';

  return (
    <Panel
      title="番茄钟"
      icon={<Timer />}
      badge={
        isFocus
          ? status === 'idle'
            ? '待开始'
            : status === 'running'
              ? '进行中'
              : '已暂停'
          : '休息'
      }
      action={
        <Link to="/pomodoro" className="btn btn-ghost h-7 px-2 text-xs" title="打开番茄统计">
          <ArrowRight className="size-3.5" />
        </Link>
      }
      padded={false}
      bodyClassName="flex flex-col items-center justify-between gap-2 px-3.5 py-3"
    >
      {/* 模式切换 */}
      <div className="flex shrink-0 rounded-full bg-surface-2 p-0.5">
        {(['focus', 'break'] as const).map((value) => (
          <button
            key={value}
            type="button"
            disabled={status === 'running'}
            onClick={() => setMode(value)}
            className={cn(
              'flex items-center gap-1 rounded-full px-3 py-1 text-[0.6875rem] font-medium transition-colors disabled:opacity-50',
              mode === value ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
            )}
          >
            {value === 'focus' ? (
              <Target className="size-3" />
            ) : (
              <Coffee className="size-3" />
            )}
            {value === 'focus' ? '专注' : '休息'}
          </button>
        ))}
      </div>

      {/* 倒计时圆环 */}
      <ProgressRing
        ratio={ratio}
        size={112}
        stroke={7}
        color={isFocus ? 'var(--primary)' : 'var(--info)'}
        className="shrink-0"
      >
        <div className="text-center">
          <p className="text-xl font-semibold tabular-nums leading-none text-ink">
            {formatClockDuration(remaining)}
          </p>
          <p className="mt-1 text-[0.625rem] text-ink-subtle">{isFocus ? '专注中' : '休息中'}</p>
        </div>
      </ProgressRing>

      {/* 控制区 */}
      <div className="flex shrink-0 items-center gap-1.5">
        {status === 'running' ? (
          <>
            <Button variant="outline" size="sm" onClick={pause} className="h-8 px-3">
              <Pause className="size-3.5" />
              暂停
            </Button>
            <IconButton label="放弃本轮" className="size-8" onClick={() => void abandon()}>
              <RotateCcw className="size-3.5" />
            </IconButton>
          </>
        ) : (
          <>
            <Button
              variant="primary"
              size="sm"
              className="h-8 px-3.5"
              onClick={() => (status === 'paused' ? resume() : handleStart())}
            >
              <Play className="size-3.5" />
              {status === 'paused' ? '继续' : isFocus ? '开始专注' : '开始休息'}
            </Button>
            {status === 'paused' ? (
              <IconButton label="放弃本轮" className="size-8" onClick={() => void abandon()}>
                <RotateCcw className="size-3.5" />
              </IconButton>
            ) : null}
          </>
        )}
      </div>

      {/* 关联任务 */}
      <Dropdown
        align="start"
        className="w-56"
        trigger={
          <button
            type="button"
            className="flex max-w-[15rem] items-center gap-1.5 rounded-full border border-dashed border-line-strong px-2.5 py-1 text-[0.6875rem] text-ink-muted transition-colors hover:border-primary hover:text-ink"
          >
            <Hourglass className="size-3 shrink-0" />
            <span className="truncate">{activeTodoTitle ?? '关联一个任务'}</span>
          </button>
        }
      >
        {(close) => (
          <>
            {todayTodos && todayTodos.length > 0 ? (
              todayTodos.slice(0, 6).map((todo) => (
                <DropdownItem
                  key={todo.id}
                  onClick={() => {
                    attachTodo(todo.id, todo.title);
                    close();
                  }}
                >
                  {todo.title}
                </DropdownItem>
              ))
            ) : (
              <p className="px-2.5 py-2 text-xs text-ink-subtle">今日没有待办可关联</p>
            )}
            {activeTodoTitle ? (
              <DropdownItem
                onClick={() => {
                  attachTodo(undefined, undefined);
                  close();
                }}
              >
                取消关联
              </DropdownItem>
            ) : null}
          </>
        )}
      </Dropdown>

      {/* 今日战绩 */}
      <div className="flex shrink-0 items-center gap-3 border-t border-line pt-2 text-[0.6875rem] text-ink-muted">
        <span>
          🍅 今日 <strong className="font-semibold text-ink">{overview?.pomodoroCount ?? 0}</strong>{' '}
          个
        </span>
        <span className="text-line-strong">|</span>
        <span>
          专注{' '}
          <strong className="font-semibold tabular-nums text-ink">
            {formatDuration(overview?.focusSecondsToday ?? 0)}
          </strong>
        </span>
      </div>
    </Panel>
  );
}
