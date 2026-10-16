# P5 Habits + Pomodoro Stats Implementation Plan

> **For agentic workers:** Execute task-by-task. Inline execution in this session (user asked for code).

**Goal:** Full `/#/habits` (year heatmap + CRUD list) and new `/#/pomodoro` stats page; nav entry; shared repos.

**Architecture:** Feature slices + `lib/habitStats` / `lib/heatmap`; extend `habitRepo` / `pomodoroRepo`; timer stays in Zustand; no schema migration.

**Tech Stack:** React 19, Dexie + useLiveQuery, Recharts, @dnd-kit, existing habitIcons.

## Global Constraints

- No `import { db }` from features.
- Heatmap "全部" mode: display only, no cell toggle.
- Single-habit mode: `toggleLog` same as dashboard card.
- No git commits unless user asks.

## File map

| Path | Role |
| --- | --- |
| `src/lib/habitStats.ts` + test | streak / longest / week progress |
| `src/lib/heatmap.ts` + test | year cells + intensity |
| `src/db/repositories/habitRepo.ts` | reorder, logs helpers |
| `src/db/repositories/pomodoroRepo.ts` | listRecent, week helpers |
| `src/features/habits/*` | page UI |
| `src/features/pomodoro/*` | stats page |
| `src/app/navigation.ts`, `router.tsx` | /pomodoro |
| README / ARCHITECTURE | mark P5 done |

---

### Task 1: Pure helpers + repo extensions

- [x] habitStats + heatmap + tests
- [x] habitRepo.reorder; pomodoroRepo.listRecent + week aggregates if needed
- [x] `pnpm test`

### Task 2: Habits page

- [x] Heatmap, list, row, form, replace HabitsPage placeholder
- [x] Link from HabitsCard

### Task 3: Pomodoro page + nav

- [x] Stats / chart / session list
- [x] Router + NAV_ITEMS

### Task 4: Verify + docs

- [x] typecheck, lint, test
- [x] README / ARCHITECTURE
