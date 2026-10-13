---
name: skill-library
description: Search and discover on-demand agents, skills, workflows, and rules archived in the library
---

# Skill Library Router

This repository uses an optimized, two-tier ECC architecture:
- **DAILY (Active):** Always-loaded components strictly matched to the active stack (TypeScript, React 19, Vite 8, Express, Prisma/SQLite, Bun, Chrome Extension MV3). Located in `.agents/agents/`, `.agents/skills/`, `.agents/workflows/`, and `.agents/rules/`.
- **LIBRARY (On-Demand):** Preserved reference components for off-stack languages, specialized pipelines, and periodic maintenance. Located in `.agents/library/`.

## Library Locations

- **Agents:** `.agents/library/agents/`
- **Skills:** `.agents/library/skills/`
- **Workflows:** `.agents/library/workflows/`
- **Rules:** `.agents/library/rules/`

---

## Grouped Trigger Keywords & Index

### 1. Off-Stack Languages & Frameworks
When working on cross-compilation, migrations, or external scripts:
- **Python / Django / FastAPI / PyTorch:**
  - Agents: `python-reviewer`, `django-reviewer`, `django-build-resolver`, `fastapi-reviewer`, `pytorch-build-resolver`
  - Rules: `python-*.md`
  - Workflows: `python-review.md`, `fastapi-review.md`
- **Go / Golang:**
  - Agents: `go-reviewer`, `go-build-resolver`
  - Rules: `golang-*.md`
  - Workflows: `go-build.md`, `go-review.md`, `go-test.md`
- **Rust:**
  - Agents: `rust-reviewer`, `rust-build-resolver`
  - Rules: `rust-*.md`
  - Workflows: `rust-build.md`, `rust-review.md`, `rust-test.md`
- **Java / Kotlin / Gradle:**
  - Agents: `java-reviewer`, `java-build-resolver`, `kotlin-reviewer`, `kotlin-build-resolver`
  - Rules: `java-*.md`, `kotlin-*.md`
  - Workflows: `gradle-build.md`, `kotlin-build.md`, `kotlin-review.md`, `kotlin-test.md`
- **C++ / C# / .NET / F#:**
  - Agents: `cpp-reviewer`, `cpp-build-resolver`, `csharp-reviewer`, `fsharp-reviewer`
  - Rules: `cpp-*.md`, `csharp-*.md`, `fsharp-*.md`
  - Workflows: `cpp-build.md`, `cpp-review.md`, `cpp-test.md`
- **Mobile & Cross-Platform (Flutter / Dart / Swift / ArkTS / React Native):**
  - Agents: `flutter-reviewer`, `dart-build-resolver`, `swift-reviewer`, `swift-build-resolver`, `harmonyos-app-resolver`
  - Rules: `dart-*.md`, `swift-*.md`, `arkts-*.md`, `react-native-*.md`
  - Workflows: `flutter-build.md`, `flutter-review.md`, `flutter-test.md`
- **Vue / Nuxt / Angular / PHP / Ruby / Perl:**
  - Agents: `vue-reviewer`, `php-reviewer`
  - Rules: `vue-*.md`, `nuxt-*.md`, `angular-*.md`, `php-*.md`, `ruby-*.md`, `perl-*.md`
  - Workflows: `vue-review.md`

### 2. Specialized & Domain Agents
- **Network / Homelab:** `network-architect`, `network-config-reviewer`, `network-troubleshooter`, `homelab-architect`
- **Healthcare & Clinical:** `healthcare-reviewer`
- **Communications & Marketing:** `chief-of-staff`, `marketing-agent`, `marketing-campaign.md`
- **SEO & Web Audits:** `seo-specialist`
- **Open Source Sanitization & Packaging:** `opensource-forker`, `opensource-packager`, `opensource-sanitizer`
- **AI Pipelines & Loops:** `gan-evaluator`, `gan-generator`, `gan-planner`, `mle-reviewer`, `rag-pipeline-reviewer`, `spec-miner`, `loop-operator`, `harness-optimizer`

### 3. Meta, Memory & Lifecycle Skills
- **Session Memory & Sync:** `ck`, `unified-memory`, `continuous-learning`, `continuous-learning-v2`, `growth-log`
- **Evaluation & Audits:** `agent-self-evaluation`, `agent-sort`, `eval-harness`, `codehealth-mcp`, `plankton-code-quality`, `skill-comply`, `skill-scout`, `skill-stocktake`, `repo-scan`, `rules-distill`, `config-gc`, `configure-ecc`, `ecc-guide`, `ecc-recipes`
- **Multi-Role Deliberation & Loops:** `council`, `council-multi-model`, `dev-team`, `delivery-gate`, `santa-method`, `plan-canvas`, `product-lens`, `loop-design-check`
- **Desktop Native Automation:** `windows-desktop-e2e`

---

## How to Load a Library Item

To consult or temporarily load an item from the library:
1. Locate the file in `.agents/library/<category>/<name>`.
2. Reference or read the markdown instructions directly using file viewing tools.
3. If an off-stack file or workflow is permanently needed for the project, move it from `.agents/library/` back to `.agents/`.
