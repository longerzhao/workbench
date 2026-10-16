import { describe, expect, it } from 'vitest';
import type { Todo } from '@/db/schema';
import {
  applyProjectFilter,
  applySecondaryFilters,
  collectTags,
  matchesView,
  sortForView,
} from './todoFilters';
import { parseTodoSearch } from '@/features/todos/filters';

function todo(partial: Partial<Todo> & { id: string; title: string }): Todo {
  return {
    note: undefined,
    done: false,
    priority: 0,
    tags: [],
    subtasks: [],
    order: 1,
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
    ...partial,
  };
}

const TODAY = '2026-10-15'; // Thursday

describe('parseTodoSearch', () => {
  it('defaults to today', () => {
    expect(parseTodoSearch(new URLSearchParams())).toEqual({ view: 'today' });
  });

  it('reads view and project', () => {
    expect(parseTodoSearch(new URLSearchParams('view=all&project=p1'))).toEqual({
      view: 'all',
      projectId: 'p1',
    });
  });

  it('drops project on trash', () => {
    expect(parseTodoSearch(new URLSearchParams('view=trash&project=p1'))).toEqual({
      view: 'trash',
    });
  });
});

describe('matchesView', () => {
  it('today includes undated and due today/overdue', () => {
    expect(matchesView(todo({ id: '1', title: 'a', dueDate: TODAY }), 'today', TODAY)).toBe(true);
    expect(matchesView(todo({ id: '2', title: 'b' }), 'today', TODAY)).toBe(true);
    expect(matchesView(todo({ id: '3', title: 'c', dueDate: '2026-10-14' }), 'today', TODAY)).toBe(
      true,
    );
    expect(matchesView(todo({ id: '4', title: 'd', dueDate: '2026-10-16' }), 'today', TODAY)).toBe(
      false,
    );
    expect(
      matchesView(todo({ id: '5', title: 'e', done: true, dueDate: TODAY }), 'today', TODAY),
    ).toBe(false);
  });

  it('week only includes dated tasks in ISO week', () => {
    expect(matchesView(todo({ id: '1', title: 'a', dueDate: '2026-10-12' }), 'week', TODAY)).toBe(
      true,
    );
    expect(matchesView(todo({ id: '2', title: 'b', dueDate: '2026-10-18' }), 'week', TODAY)).toBe(
      true,
    );
    expect(matchesView(todo({ id: '3', title: 'c' }), 'week', TODAY)).toBe(false);
    expect(matchesView(todo({ id: '4', title: 'd', dueDate: '2026-10-11' }), 'week', TODAY)).toBe(
      false,
    );
  });

  it('inbox is open without project', () => {
    expect(matchesView(todo({ id: '1', title: 'a' }), 'inbox', TODAY)).toBe(true);
    expect(matchesView(todo({ id: '2', title: 'b', projectId: 'p' }), 'inbox', TODAY)).toBe(false);
  });

  it('done only completed', () => {
    expect(matchesView(todo({ id: '1', title: 'a', done: true }), 'done', TODAY)).toBe(true);
    expect(matchesView(todo({ id: '2', title: 'b' }), 'done', TODAY)).toBe(false);
  });
});

describe('secondary filters', () => {
  const rows = [
    todo({ id: '1', title: 'a', priority: 3, tags: ['work', 'urgent'] }),
    todo({ id: '2', title: 'b', priority: 0, tags: ['work'] }),
    todo({ id: '3', title: 'c', priority: 3, tags: ['home'] }),
  ];

  it('filters by priority', () => {
    expect(applySecondaryFilters(rows, { priority: 3, tags: [] }).map((t) => t.id)).toEqual([
      '1',
      '3',
    ]);
    expect(applySecondaryFilters(rows, { priority: 0, tags: [] }).map((t) => t.id)).toEqual(['2']);
  });

  it('tag filter is intersection', () => {
    expect(applySecondaryFilters(rows, { tags: ['work', 'urgent'] }).map((t) => t.id)).toEqual([
      '1',
    ]);
  });

  it('collectTags sorts', () => {
    expect(collectTags(rows)).toEqual(['home', 'urgent', 'work']);
  });
});

describe('applyProjectFilter + sortForView', () => {
  it('filters by project', () => {
    const rows = [
      todo({ id: '1', title: 'a', projectId: 'p1' }),
      todo({ id: '2', title: 'b', projectId: 'p2' }),
    ];
    expect(applyProjectFilter(rows, 'p1').map((t) => t.id)).toEqual(['1']);
  });

  it('sorts done by completedAt desc', () => {
    const rows = [
      todo({ id: '1', title: 'a', done: true, completedAt: '2026-10-14T10:00:00.000Z' }),
      todo({ id: '2', title: 'b', done: true, completedAt: '2026-10-15T10:00:00.000Z' }),
    ];
    expect(sortForView(rows, 'done').map((t) => t.id)).toEqual(['2', '1']);
  });
});
