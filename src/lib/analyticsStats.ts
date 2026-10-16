import type { Habit, HabitLog, Project, Todo } from '@/db/schema';
import { weekHitCount } from '@/lib/habitStats';
import type { DateKey } from '@/lib/date';

export interface HabitWeekBar {
  id: string;
  name: string;
  color: string;
  hit: number;
  target: number;
  ratio: number;
}

export function habitWeekBars(
  habits: Habit[],
  logs: HabitLog[],
  weekStart: DateKey,
  weekEnd: DateKey,
): HabitWeekBar[] {
  return habits
    .filter((h) => !h.archived)
    .map((h) => {
      const hit = new Set(logs.filter((l) => l.habitId === h.id).map((l) => l.date));
      const count = weekHitCount(hit, weekStart, weekEnd);
      const target = Math.max(1, h.targetPerWeek);
      return {
        id: h.id,
        name: h.name,
        color: h.color,
        hit: count,
        target,
        ratio: Math.min(1, count / target),
      };
    })
    .sort((a, b) => b.ratio - a.ratio || a.name.localeCompare(b.name, 'zh-CN'));
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

/** @deprecated 用 projectProgressBars；保留给旧调用 */
export type ProjectOpenBar = ProjectProgressBar & { count: number };

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

export function openTodosByProject(
  openTodos: Todo[],
  projects: Project[],
): ProjectOpenBar[] {
  return projectProgressBars(openTodos, projects).map((row) => ({
    ...row,
    count: row.open,
  }));
}
