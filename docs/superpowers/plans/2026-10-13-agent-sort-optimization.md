# Agent Sort Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize the repository's `.agents` surface by segregating active DAILY components from off-stack LIBRARY components into `.agents/library/`, creating a searchable `skill-library` router, and verifying application builds and tests remain green.

**Architecture:** Maintain zero loss of existing capabilities while reducing prompt context bloat by moving non-TS/React rules, non-stack workflows, off-stack agents, and specialized skills to `.agents/library/`. Provide an on-demand router skill (`.agents/skills/skill-library/SKILL.md`) that indexes library assets so they remain reachable when needed.

**Tech Stack:** TypeScript, React 19, Vite 8, Express, Prisma (SQLite), Bun, Vitest, PowerShell.

**Spec:** Output of `/agent-sort` audit establishing the 22 DAILY agents, 14 DAILY skills, 11 DAILY workflows, 21 DAILY rules, and segregating off-stack languages (Python, Go, Rust, Java, Kotlin, C++, C#, Flutter, etc.).

## Global Constraints

- Never delete any capability; library items must be preserved in `.agents/library/`.
- Do not alter core application source code (`src/`, `server/`, `shared/`, `extension/`, `prisma/`).
- Follow project Git & Terminal Execution Rules (commits and status checks are pre-approved; do not push to remote).
- All Vitest suites (`bun run test` / `vitest run`) and TypeScript typecheck (`bun run lint`) must pass before completion.

## Review Focus

- Broken paths in scripts referencing `.agents/`
- Build entrypoint check integrity (`check-entrypoint.cjs`)
- Preservation of project-specific rules (`clean-entrypoint.md`, `data-extraction-quality.md`, `windows-powershell.md`)
- Preservation of extension clipper skill (`chrome-mv3-clipper`) and Docker troubleshoot skill (`bun-docker-troubleshoot`)
- Accuracy of `skill-library` index

---

### Task 1: Create Library Structure & Move Off-Stack Rules

**Files:**
- Create directories: `.agents/library/rules/`
- Move from `.agents/rules/` to `.agents/library/rules/`:
  - `angular-*.md` (5 files)
  - `arkts-*.md` (5 files)
  - `cpp-*.md` (5 files)
  - `csharp-*.md` (5 files)
  - `dart-*.md` (5 files)
  - `fsharp-*.md` (5 files)
  - `golang-*.md` (5 files)
  - `java-*.md` (5 files)
  - `kotlin-*.md` (5 files)
  - `nuxt-*.md` (5 files)
  - `perl-*.md` (5 files)
  - `php-*.md` (5 files)
  - `python-*.md` (6 files)
  - `react-native-*.md` (8 files)
  - `ruby-*.md` (5 files)
  - `rust-*.md` (5 files)
  - `swift-*.md` (5 files)
  - `vue-*.md` (5 files)

- [ ] **Step 1: Create directory `.agents/library/rules`**
- [ ] **Step 2: Move off-stack rule files into `.agents/library/rules/`**
- [ ] **Step 3: Verify remaining files in `.agents/rules/` strictly match TS, React, Web, Windows PowerShell, and shared standards**
- [ ] **Step 4: Commit rule organization**

---

### Task 2: Move Off-Stack Workflows to Library

**Files:**
- Create directories: `.agents/library/workflows/`
- Move from `.agents/workflows/` to `.agents/library/workflows/`:
  - Language-specific off-stack: `cpp-*`, `flutter-*`, `go-*`, `gradle-*`, `kotlin-*`, `python-*`, `fastapi-*`, `rust-*`, `vue-*`
  - Unused systems/loops: `pm2.md`, `jira.md`, `marketing-campaign.md`, `gan-*`, `santa-loop.md`, `multi-*`, `epic-*`, `orch-*`, `prp-*`, `instinct-*`, `learn-*`, `loop-*`, `sessions.md`, `save-session.md`, `resume-session.md`

- [ ] **Step 1: Create directory `.agents/library/workflows`**
- [ ] **Step 2: Move off-stack workflow files into `.agents/library/workflows/`**
- [ ] **Step 3: Verify remaining workflows in `.agents/workflows/` match DAILY set (React build/test/review, code-review, quality-gate, security-scan, refactor-clean, pr)**
- [ ] **Step 4: Commit workflow organization**

---

### Task 3: Move Off-Stack Agents & Skills to Library

**Files:**
- Create directories: `.agents/library/agents/`, `.agents/library/skills/`
- Move from `.agents/agents/` to `.agents/library/agents/`:
  - 45 off-stack & niche agents (Python, Go, Rust, Java, C++, C#, Flutter, Vue, Network, Healthcare, etc.)
- Move from `.agents/skills/` to `.agents/library/skills/`:
  - 36 off-stack & meta skills (`windows-desktop-e2e`, `codehealth-mcp`, `plankton-code-quality`, `ck`, `unified-memory`, etc.)

- [ ] **Step 1: Create directories `.agents/library/agents` and `.agents/library/skills`**
- [ ] **Step 2: Move off-stack agents to `.agents/library/agents/`**
- [ ] **Step 3: Move off-stack and meta skills to `.agents/library/skills/`**
- [ ] **Step 4: Verify remaining skills and agents in active `.agents/`**
- [ ] **Step 5: Commit agents and skills organization**

---

### Task 4: Create the `skill-library` Router

**Files:**
- Create: `.agents/skills/skill-library/SKILL.md`

- [ ] **Step 1: Create `skill-library` router indexing all archived library agents, skills, workflows, and rules with quick search categories**
- [ ] **Step 2: Verify router links and trigger categories**
- [ ] **Step 3: Commit `skill-library` router**

---

### Task 5: Verification & Sanity Checks

**Files:**
- Run checks across repository test suites, linter, and build pipeline.

- [ ] **Step 1: Run `npm run check:entrypoint` / `bun run check:entrypoint`**
- [ ] **Step 2: Run `bun run lint` (`tsc --noEmit`) to verify no type regressions**
- [ ] **Step 3: Run `bun run test` (`vitest run`) to verify all 10 test suites pass**
- [ ] **Step 4: Confirm git status is clean and all changes are staged/committed**
