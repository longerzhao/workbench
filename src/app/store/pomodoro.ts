import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { pomodoroRepo } from '@/db/repositories';

export type TimerStatus = 'idle' | 'running' | 'paused';
export type TimerMode = 'focus' | 'break';

interface PomodoroState {
  mode: TimerMode;
  status: TimerStatus;
  /** 本轮总时长（秒） */
  durationSec: number;
  /** running 状态下的结束时间戳；用它算剩余，而不是靠定时器累加 */
  endsAt: number | null;
  /** idle / paused 状态下的剩余秒数 */
  remainingSec: number;
  /** 对应数据库里的会话记录；break 轮次为 null */
  sessionId: string | null;
  activeTodoId?: string;
  activeTodoTitle?: string;

  focusMinutes: number;
  breakMinutes: number;
  soundEnabled: boolean;
  /** 结束提示音持续秒数，0～10；0 表示开启开关也不发声 */
  soundDurationSec: number;

  setMode: (mode: TimerMode) => void;
  setFocusMinutes: (minutes: number) => void;
  setBreakMinutes: (minutes: number) => void;
  toggleSound: () => void;
  setSoundDurationSec: (seconds: number) => void;
  attachTodo: (todoId?: string, title?: string) => void;

  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  /** 放弃本轮：记录为未完成，保留已专注的时长 */
  abandon: () => Promise<void>;
  /** 本轮自然走完 */
  complete: () => Promise<void>;
  /** 结束后切到另一个模式并重置 */
  advance: () => void;
}

function totalFor(mode: TimerMode, focusMinutes: number, breakMinutes: number): number {
  return Math.max(1, Math.round((mode === 'focus' ? focusMinutes : breakMinutes) * 60));
}

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      mode: 'focus',
      status: 'idle',
      durationSec: 25 * 60,
      endsAt: null,
      remainingSec: 25 * 60,
      sessionId: null,
      activeTodoId: undefined,
      activeTodoTitle: undefined,

      focusMinutes: 25,
      breakMinutes: 5,
      soundEnabled: true,
      soundDurationSec: 1,

      setMode: (mode) => {
        const { focusMinutes, breakMinutes } = get();
        const durationSec = totalFor(mode, focusMinutes, breakMinutes);
        set({ mode, status: 'idle', endsAt: null, durationSec, remainingSec: durationSec, sessionId: null });
      },

      setFocusMinutes: (minutes) => {
        const focusMinutes = Math.min(180, Math.max(1, Math.round(minutes)));
        const state = get();
        if (state.mode !== 'focus' || state.status !== 'idle') {
          set({ focusMinutes });
          return;
        }
        const durationSec = focusMinutes * 60;
        set({ focusMinutes, durationSec, remainingSec: durationSec });
      },

      setBreakMinutes: (minutes) => {
        const breakMinutes = Math.min(60, Math.max(1, Math.round(minutes)));
        const state = get();
        if (state.mode !== 'break' || state.status !== 'idle') {
          set({ breakMinutes });
          return;
        }
        const durationSec = breakMinutes * 60;
        set({ breakMinutes, durationSec, remainingSec: durationSec });
      },

      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),

      setSoundDurationSec: (seconds) => {
        const soundDurationSec = Math.min(10, Math.max(0, Math.round(seconds)));
        set({ soundDurationSec });
      },

      attachTodo: (todoId, title) => set({ activeTodoId: todoId, activeTodoTitle: title }),

      start: async () => {
        const { mode, focusMinutes, breakMinutes, activeTodoId, status } = get();
        if (status === 'running') return;

        const durationSec = totalFor(mode, focusMinutes, breakMinutes);

        // 只有专注轮次落库；休息轮次不进统计
        let sessionId: string | null = null;
        if (mode === 'focus') {
          const session = await pomodoroRepo.start({ type: 'focus', durationSec, todoId: activeTodoId });
          sessionId = session.id;
        }

        set({
          status: 'running',
          durationSec,
          remainingSec: durationSec,
          endsAt: Date.now() + durationSec * 1000,
          sessionId,
        });
      },

      pause: () => {
        const { status, endsAt } = get();
        if (status !== 'running' || endsAt === null) return;
        const remainingSec = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
        set({ status: 'paused', endsAt: null, remainingSec });
      },

      resume: () => {
        const { status, remainingSec, durationSec } = get();
        if (status !== 'paused') return;
        set({
          status: 'running',
          endsAt: Date.now() + remainingSec * 1000,
          durationSec: Math.max(durationSec, remainingSec),
        });
      },

      abandon: async () => {
        const state = get();
        const { sessionId, durationSec, mode } = state;

        if (mode === 'focus' && sessionId) {
          // 必须按"真实专注了多少秒"落库：若直接沿用计划时长，
          // 开一秒就放弃的番茄也会被算成完整 25 分钟专注。
          const elapsed = Math.max(0, durationSec - remainingFrom(state));
          await pomodoroRepo.finish(sessionId, false, elapsed);
        }

        const nextMode: TimerMode = mode === 'focus' ? 'break' : 'focus';
        const { focusMinutes, breakMinutes } = get();
        const nextDuration = totalFor(nextMode, focusMinutes, breakMinutes);
        set({
          status: 'idle',
          endsAt: null,
          sessionId: null,
          durationSec: nextDuration,
          remainingSec: nextDuration,
        });
      },

      complete: async () => {
        const { sessionId, mode, durationSec } = get();
        if (mode === 'focus' && sessionId) {
          await pomodoroRepo.finish(sessionId, true, durationSec);
        }
        set({ status: 'idle', endsAt: null, sessionId: null });
      },

      advance: () => {
        const { mode, focusMinutes, breakMinutes } = get();
        const nextMode: TimerMode = mode === 'focus' ? 'break' : 'focus';
        const durationSec = totalFor(nextMode, focusMinutes, breakMinutes);
        set({
          mode: nextMode,
          status: 'idle',
          endsAt: null,
          sessionId: null,
          durationSec,
          remainingSec: durationSec,
        });
      },
    }),
    {
      name: 'workbench:pomodoro',
      version: 1,
      // 只持久化设置和计时状态，函数不落盘
      partialize: (state) => ({
        mode: state.mode,
        status: state.status,
        durationSec: state.durationSec,
        endsAt: state.endsAt,
        remainingSec: state.remainingSec,
        sessionId: state.sessionId,
        activeTodoId: state.activeTodoId,
        activeTodoTitle: state.activeTodoTitle,
        focusMinutes: state.focusMinutes,
        breakMinutes: state.breakMinutes,
        soundEnabled: state.soundEnabled,
        soundDurationSec: state.soundDurationSec,
      }),
    },
  ),
);

/** 根据当前时间戳算剩余秒数，这是唯一可信的倒计时来源 */
export function remainingFrom(state: Pick<PomodoroState, 'status' | 'endsAt' | 'remainingSec'>): number {
  if (state.status === 'running' && state.endsAt !== null) {
    return Math.max(0, Math.round((state.endsAt - Date.now()) / 1000));
  }
  return state.remainingSec;
}
