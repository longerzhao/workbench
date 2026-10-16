import { describe, expect, it } from 'vitest';
import type { Habit, HabitLog, Project, Todo } from '@/db/schema';
import { habitWeekBars, projectProgressBars } from './analyticsStats';

function habit(partial: Partial<Habit> & { id: string; name: string }): Habit {
  return {
    icon: 'Circle',
    color: '#7c3aed',
    targetPerWeek: 5,
    archived: false,
    order: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('habitWeekBars', () => {
  it('computes hit/target and sorts by ratio', () => {
    const habits = [
      habit({ id: 'a', name: 'A', targetPerWeek: 4 }),
      habit({ id: 'b', name: 'B', targetPerWeek: 7, archived: true }),
    ];
    const logs: HabitLog[] = [
      {
        id: 'a:2026-10-13',
        habitId: 'a',
        date: '2026-10-13',
        count: 1,
        createdAt: '2026-10-13T00:00:00.000Z',
      },
      {
        id: 'a:2026-10-14',
        habitId: 'a',
        date: '2026-10-14',
        count: 1,
        createdAt: '2026-10-14T00:00:00.000Z',
      },
    ];
    const bars = habitWeekBars(habits, logs, '2026-10-13', '2026-10-19');
    expect(bars).toHaveLength(1);
    expect(bars[0]).toMatchObject({ id: 'a', hit: 2, target: 4, ratio: 0.5 });
  });
});

describe('projectProgressBars', () => {
  it('computes done/total and open count', () => {
    const projects: Project[] = [
      {
        id: 'p1',
        name: '工作',
        color: '#2563eb',
        order: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const todos = [
      { id: '1', projectId: 'p1', done: true },
      { id: '2', projectId: 'p1', done: false },
      { id: '3', done: false },
      { id: '4', done: false },
    ] as Todo[];
    const rows = projectProgressBars(todos, projects);
    expect(rows.find((r) => r.id === 'p1')).toMatchObject({
      done: 1,
      open: 1,
      total: 2,
      ratio: 0.5,
    });
    expect(rows.find((r) => r.id === '__inbox__')).toMatchObject({
      open: 2,
      done: 0,
      total: 2,
      ratio: 0,
    });
  });
});
