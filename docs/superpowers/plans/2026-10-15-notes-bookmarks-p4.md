# P4 Notes + Bookmarks Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Prefer inline execution in this session (user asked to start coding).

**Goal:** Replace `/#/notes` and `/#/bookmarks` placeholders with dual-pane managers (Markdown edit/preview + bookmark groups/CRUD/sort/clicks).

**Architecture:** Feature slices; URL query (`id` / `group`) for selection; extend `noteRepo` / `bookmarkRepo`; no new Zustand stores; no schema migration.

**Tech Stack:** React 19, react-router hash search params, Dexie + useLiveQuery, @dnd-kit, react-markdown (no rehype-raw → no raw HTML).

## Global Constraints

- No direct `import { db }` from features/components (repos only).
- Soft-delete via existing `remove` → trash; no dedicated trash pages in P4.
- Letter icons only; no favicon / HTML import.
- No git commits unless user asks.
- Default bookmark group remains `DEFAULT_BOOKMARK_GROUP` (`常用`).

## File map

| Path | Role |
| --- | --- |
| `src/lib/noteText.ts` + test | Summary truncate, tag parse |
| `src/lib/bookmarkUi.ts` + test | Letter icon glyph |
| `src/db/repositories/bookmarkRepo.ts` | listByGroup, listGroupNames, reorder, renameGroup, dissolveGroup |
| `src/features/notes/*` | Page, sidebar, editor, preview, URL hook |
| `src/features/bookmarks/*` | Page, sidebar, list, row, form, URL hook |
| `src/features/dashboard/cards/NotesCard.tsx` | Link with `?id=` |
| `package.json` | Add `react-markdown` |
| `README.md` / `docs/ARCHITECTURE.md` | Mark P4 done |

---

### Task 1: Pure helpers + bookmarkRepo extensions

**Files:**
- Create: `src/lib/noteText.ts`, `src/lib/noteText.test.ts`
- Create: `src/lib/bookmarkUi.ts`, `src/lib/bookmarkUi.test.ts`
- Modify: `src/db/repositories/bookmarkRepo.ts`

- [x] `summarizeNote(content, max=80)` — strip markdown noise lightly, single-line truncate
- [x] `parseTagsInput(raw)` — split on `,` / whitespace, trim, dedupe
- [x] `formatTagsInput(tags)` — join with `, `
- [x] `letterGlyph(title, url)` — first char of title else hostname
- [x] `listByGroup(group)` order asc; `listGroupNames()` sorted unique
- [x] `reorderInGroup(group, orderedIds)`; `renameGroup(from, to)`; `dissolveGroup(group)` → default group
- [x] `pnpm test`

### Task 2: Notes page (list + editor + preview tabs)

**Files:**
- Create: `src/features/notes/useNoteQuery.ts`, `NoteSidebar.tsx`, `NoteEditor.tsx`, `NotePreview.tsx`
- Modify: `src/features/notes/NotesPage.tsx`
- Modify: `NotesCard` links to `/notes?id=`
- Add dependency: `react-markdown`

- [x] URL `id` parse/set; invalid id clears query
- [x] Sidebar: search, create, pin-sorted list with summary
- [x] Editor: title, tags, edit/preview tabs, debounce/blur save, delete
- [x] Preview via `react-markdown` without raw HTML plugin

### Task 3: Bookmarks page (groups + list + sort)

**Files:**
- Create: `src/features/bookmarks/useBookmarkQuery.ts`, `BookmarkSidebar.tsx`, `BookmarkList.tsx`, `BookmarkRow.tsx`, `BookmarkForm.tsx`
- Modify: `src/features/bookmarks/BookmarksPage.tsx`

- [x] URL `group` parse/set with fallback
- [x] Sidebar: groups CRUD (create / rename / dissolve)
- [x] List + form modal; dnd reorder; click → recordClick + open

### Task 4: Verify + docs

- [x] `pnpm typecheck && pnpm lint && pnpm test`
- [x] README roadmap P4 ✅; ARCHITECTURE §13 / roadmap line

---

**Spec coverage:** §1–8 of `2026-10-15-notes-bookmarks-p4-design.md` mapped to Tasks 1–4. Trash UI intentionally omitted (spec §1 范围外).
