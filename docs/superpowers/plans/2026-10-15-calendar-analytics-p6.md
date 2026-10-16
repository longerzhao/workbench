# P6 Calendar + Analytics Implementation Plan

> **For agentic workers:** Inline execution this session (user asked for code).

**Goal:** Full `/#/calendar` (month/week + event CRUD) and `/#/analytics` (4 charts).

**Architecture:** Feature slices; URL `view`/`date` for calendar; `lib/calendarGrid` + `lib/analyticsStats`; existing repos.

**Tech Stack:** React 19, Dexie, Recharts, dayjs.

## Global Constraints

- No `import { db }` from features.
- No drag/recurrence/multi-day.
- Week hours 06:00–22:00.
- No git commits unless asked.

## Tasks

### Task 1: Pure helpers

- [x] `calendarGrid.ts` + tests
- [x] `analyticsStats.ts` + tests

### Task 2: Calendar page

- [x] useCalendarQuery, MonthView, WeekView, EventForm, CalendarPage
- [x] ScheduleCard link

### Task 3: Analytics page

- [x] Four charts + AnalyticsPage
- [x] Optional `?days=`

### Task 4: Verify + docs

- [x] typecheck, lint, test
- [x] README / ARCHITECTURE
