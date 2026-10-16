# 笔记目录树 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 笔记侧栏支持可嵌套目录，目录与笔记混排；笔记仅属一个目录。

**Architecture:** `noteFolders` 表 + `Note.folderId`；`noteTree` 纯函数建树；`noteFolderRepo` / `noteRepo` 写库；侧栏树 + dnd-kit。

**Tech Stack:** Dexie、React、@dnd-kit、Vitest

---

### Task 1: Schema + tree helpers + tests

- [ ] `NoteFolder`、`Note.folderId`、Dexie v2 upgrade
- [ ] `src/lib/noteTree.ts` + test（建树、成环检测、删目录提升逻辑辅助）

### Task 2: Repos

- [ ] `noteFolderRepo` CRUD / move / remove（提升子项）
- [ ] `noteRepo.create` 支持 `folderId`；`moveToFolder`
- [ ] 导出 index

### Task 3: UI

- [ ] `useNotesData` 拉 folders；`NoteSidebar` 树视图
- [ ] 新建目录 / 重命名 / 删除；新建笔记进当前目录
- [ ] 拖拽笔记/目录；搜索扁平列表
- [ ] typecheck / lint / tests
