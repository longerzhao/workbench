import { describe, expect, it } from 'vitest';
import type { Habit, HabitLog, Project, Todo } from '@/db/schema';
import {
  completionHeatmap,
  habitHitTotals,
  habitRangeBars,
  projectProgressBars,
  rangeSummary,
} from './analyticsStats';

const TODAY = '2026-10-23'; // 周五

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

function log(id: string, habitId: string, date: string): HabitLog {
  return { id: `${habitId}:${date}:${id}`, habitId, date, count: 1, createdAt: `${date}T00:00:00.000Z` };
}

describe('habitRangeBars', () => {
  it('按周目标折算期望并统计范围内命中', () => {
    const habits = [habit({ id: 'a', name: 'A', targetPerWeek: 4 }), habit({ id: 'b', name: 'B', targetPerWeek: 7, archived: true })];
    const logs = [log('1', 'a', '2026-10-22'), log('2', 'a', '2026-10-09')]; // 一条在 14 天内，一条在范围外（from 是 10-10）
    const bars = habitRangeBars(habits, logs, 14, TODAY);

    expect(bars).toHaveLength(1); // 已归档的被排除
    expect(bars[0]).toMatchObject({ id: 'a', hit: 1, expected: 8, ratio: 1 / 8 });
  });

  it('连续天数来自全量打卡而非范围截断', () => {
    // 昨天、前天、大前天连续打，今天没打（currentStreak 从昨天起算）
    const logs = [log('1', 'a', '2026-10-22'), log('2', 'a', '2026-10-21'), log('3', 'a', '2026-10-20')];
    const bars = habitRangeBars([habit({ id: 'a', name: 'A' })], logs, 14, TODAY);
    expect(bars[0]).toMatchObject({ streak: 3, bestStreak: 3 });
  });

  it('最长连续只统计真正连续的段', () => {
    const logs = [log('1', 'a', '2026-10-22'), log('2', 'a', '2026-10-21'), log('3', 'a', '2026-08-01')];
    const bars = habitRangeBars([habit({ id: 'a', name: 'A' })], logs, 14, TODAY);
    expect(bars[0]).toMatchObject({ streak: 2, bestStreak: 2 });
  });

  it('7 天范围时期望等于周目标', () => {
    const bars = habitRangeBars([habit({ id: 'a', name: 'A', targetPerWeek: 5 })], [], 7, TODAY);
    expect(bars[0]).toMatchObject({ hit: 0, expected: 5 });
  });
});

describe('habitHitTotals', () => {
  it('切分本周期与上一周期', () => {
    const logs = [
      log('1', 'a', '2026-10-23'), // 本周期（近14天）
      log('2', 'a', '2026-10-15'), // 本周期
      log('3', 'a', '2026-10-08'), // 上一周期（15-28 天前）
      log('4', 'a', '2026-09-01'), // 两个周期之外
    ];
    expect(habitHitTotals(logs, 14, TODAY)).toEqual({ cur: 2, prev: 1 });
  });
});

describe('rangeSummary', () => {
  it('后半段是本周期，前半段是上一周期', () => {
    const completed = [
      { count: 1 }, { count: 1 }, { count: 1 }, // 上周期：3 项
      { count: 5 }, { count: 5 }, { count: 5 }, // 本周期：15 项
    ];
    const focus = [
      { focusSeconds: 100 }, { focusSeconds: 100 }, { focusSeconds: 100 }, // 300
      { focusSeconds: 50 }, { focusSeconds: 50 }, { focusSeconds: 50 }, // 150
    ];
    expect(rangeSummary(completed, focus, 3)).toEqual({
      completedCur: 15,
      completedPrev: 3,
      focusCurSec: 150,
      focusPrevSec: 300,
    });
  });
});

describe('completionHeatmap', () => {
  function doneTodo(completedAt: string): Todo {
    return {
      id: completedAt,
      title: 'x',
      done: true,
      priority: 0,
      tags: [],
      subtasks: [],
      order: 1,
      createdAt: completedAt,
      updatedAt: completedAt,
      completedAt,
    };
  }

  it('按星期（周一在首）× 小时聚合', () => {
    // 2026-10-19 是周一；22 点完成两条
    const todos = [doneTodo('2026-10-19T22:30:00'), doneTodo('2026-10-19T22:45:00')];
    const { grid, max } = completionHeatmap(todos, 14, TODAY);
    expect(grid[0]![22]).toBe(2); // 周一 22 时
    expect(max).toBe(2);
  });

  it('范围外与未完成的都不计入', () => {
    const todos = [
      doneTodo('2026-08-01T10:00:00'), // 太早
      { ...doneTodo('2026-10-22T10:00:00'), done: false, completedAt: undefined },
    ];
    const { grid, max } = completionHeatmap(todos, 14, TODAY);
    expect(max).toBe(0);
    expect(grid.flat().reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('非法 completedAt 不崩溃', () => {
    const todos = [doneTodo('not-a-date')];
    expect(completionHeatmap(todos, 14, TODAY).max).toBe(0);
  });
});

describe('projectProgressBars', () => {
  it('computes done/total and open count', () => {
    const projects: Project[] = [
      { id: 'p1', name: '工作', color: '#2563eb', order: 1, createdAt: '2026-01-01T00:00:00.000Z' },
    ];
    const todos = [
      { id: '1', projectId: 'p1', done: true },
      { id: '2', projectId: 'p1', done: false },
      { id: '3', done: false },
      { id: '4', done: false },
    ] as Todo[];
    const rows = projectProgressBars(todos, projects);
    expect(rows.find((r) => r.id === 'p1')).toMatchObject({ done: 1, open: 1, total: 2, ratio: 0.5 });
    expect(rows.find((r) => r.id === '__inbox__')).toMatchObject({ open: 2, done: 0, total: 2, ratio: 0 });
  });
});
