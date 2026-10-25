import type { Habit, HabitLog, Project, Todo } from '@/db/schema';
import { currentStreak, longestStreak } from '@/lib/habitStats';
import { addDays, toDateKey, type DateKey } from '@/lib/date';

export interface HabitRangeBar {
  id: string;
  name: string;
  color: string;
  /** 选定范围内的打卡天数 */
  hit: number;
  /** 按周目标折算到该范围的期望天数 */
  expected: number;
  ratio: number;
  /** 截至今天的连续天数 */
  streak: number;
  /** 历史最长连续天数 */
  bestStreak: number;
}

/**
 * 习惯在选定范围内的达成情况。
 * logs 传全量打卡（连续天数要看历史），范围内命中在函数内截取。
 */
export function habitRangeBars(
  habits: Habit[],
  logs: HabitLog[],
  days: number,
  today: DateKey,
): HabitRangeBar[] {
  const from = addDays(today, -(days - 1));

  return habits
    .filter((h) => !h.archived)
    .map((h) => {
      const hit = new Set(logs.filter((l) => l.habitId === h.id).map((l) => l.date));
      const count = [...hit].filter((d) => d >= from && d <= today).length;
      // 周目标折算：7 天目标 4 次 → 14 天期望 8 次
      const expected = Math.max(1, Math.round((h.targetPerWeek * days) / 7));
      return {
        id: h.id,
        name: h.name,
        color: h.color,
        hit: count,
        expected,
        ratio: Math.min(1, count / expected),
        streak: currentStreak(hit, today),
        bestStreak: longestStreak(hit),
      };
    })
    .sort((a, b) => b.ratio - a.ratio || a.name.localeCompare(b.name, 'zh-CN'));
}

/** 范围内与上一个同长周期内的打卡总数，供环比 */
export function habitHitTotals(
  logs: HabitLog[],
  days: number,
  today: DateKey,
): { cur: number; prev: number } {
  const curFrom = addDays(today, -(days - 1));
  const prevFrom = addDays(today, -(days * 2 - 1));
  let cur = 0;
  let prev = 0;
  for (const log of logs) {
    if (log.date >= curFrom && log.date <= today) cur += 1;
    else if (log.date >= prevFrom && log.date < curFrom) prev += 1;
  }
  return { cur, prev };
}

export interface PeriodSummary {
  completedCur: number;
  completedPrev: number;
  focusCurSec: number;
  focusPrevSec: number;
}

/**
 * 环比摘要。completed/focus 传「近 2×days 天」的日序列：
 * 后 days 天是本周期，前 days 天是上一周期。
 */
export function rangeSummary(
  completed: { count: number }[],
  focus: { focusSeconds: number }[],
  days: number,
): PeriodSummary {
  const split = <T,>(list: T[]) => ({
    prev: list.slice(0, days),
    cur: list.slice(list.length - days),
  });
  const c = split(completed);
  const f = split(focus);
  const sum = (rows: { count?: number; focusSeconds?: number }[]) =>
    rows.reduce((acc, row) => acc + (row.count ?? row.focusSeconds ?? 0), 0);

  return {
    completedCur: sum(c.cur),
    completedPrev: sum(c.prev),
    focusCurSec: sum(f.cur),
    focusPrevSec: sum(f.prev),
  };
}

export interface CompletionHeatmap {
  /** 7 行（周一在首）× 24 列（0–23 时）的完成次数 */
  grid: number[][];
  /** 热力上限，供归一化透明度 */
  max: number;
}

/**
 * 完成「星期 × 小时」分布，回答"我几点最有产出"。
 * 只统计范围内的 completedAt，星期按周一在首排列。
 */
export function completionHeatmap(
  todos: Todo[],
  days: number,
  today: DateKey,
): CompletionHeatmap {
  const from = addDays(today, -(days - 1));
  const grid: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));

  for (const todo of todos) {
    if (!todo.done || !todo.completedAt) continue;
    const date = new Date(todo.completedAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = toDateKey(date);
    if (key < from || key > today) continue;

    // getDay(): 0=周日 → 周一在首的行号
    const row = (date.getDay() + 6) % 7;
    grid[row]![date.getHours()]! += 1;
  }

  const max = Math.max(0, ...grid.flat());
  return { grid, max };
}

export interface ProjectProgressBar {
  id: string;
  name: string;
  color: string;
  open: number;
  done: number;
  total: number;
  /** 完成进度 done/total */
  ratio: number;
}

export function projectProgressBars(
  todos: Todo[],
  projects: Project[],
): ProjectProgressBar[] {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const stats = new Map<string, { open: number; done: number }>();

  for (const todo of todos) {
    const key = todo.projectId ?? '__inbox__';
    const cur = stats.get(key) ?? { open: 0, done: 0 };
    if (todo.done) cur.done += 1;
    else cur.open += 1;
    stats.set(key, cur);
  }

  const rows: ProjectProgressBar[] = [];
  for (const [key, { open, done }] of stats) {
    const total = open + done;
    if (total === 0) continue;
    const project = key === '__inbox__' ? null : byId.get(key);
    rows.push({
      id: key,
      name: key === '__inbox__' ? '收件箱' : (project?.name ?? '未知项目'),
      color: key === '__inbox__' ? '#94a3b8' : (project?.color ?? '#94a3b8'),
      open,
      done,
      total,
      ratio: done / total,
    });
  }

  // 未完成多的、完成率低的靠前
  return rows.sort(
    (a, b) =>
      b.open - a.open || a.ratio - b.ratio || a.name.localeCompare(b.name, 'zh-CN'),
  );
}

