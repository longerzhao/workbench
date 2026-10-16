# 日历年视图生肖水印 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 年视图按公历年生肖显示半透明 SVG 水印。

**Architecture:** 纯函数映射 `(year-4)%12` → 生肖 key → `/zodiac/{key}.svg`；YearView 底层绝对定位展示。

**Tech Stack:** React、Vite public assets、Vitest

---

### Task 1: zodiac helper + 测试

**Files:**
- Create: `src/lib/zodiac.ts`
- Create: `src/lib/zodiac.test.ts`

- [ ] Step 1: 写 `zodiacKeyForYear` / `zodiacSrcForYear`，顺序鼠→猪
- [ ] Step 2: 测 2020→shu、2026→ma、2025→she
- [ ] Step 3: 跑测试通过

### Task 2: SVG 资源

**Files:**
- Create: `public/zodiac/*.svg`（12 个单色剪影）

- [ ] Step 1: 每个 SVG `viewBox` 统一、`fill="currentColor"` 或实色可被 CSS 着色

### Task 3: YearView 挂载

**Files:**
- Modify: `src/features/calendar/YearView.tsx`

- [ ] Step 1: 底层水印层 + 卡片 z-index
- [ ] Step 2: typecheck / lint / 相关测试
