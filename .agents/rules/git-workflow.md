# Git Workflow & Operational Rules

> **Scope**: Git operations executed by main agents and subagents.

## Rules

### 1. Pre-Approved Local Operations
- The following local operations are **strictly pre-approved** and do NOT require prompt or confirmation from the user:
  - Repository inspections: `git status`, `git diff`, `git log`, `git rev-parse HEAD`.
  - Staging changes: `git add <files>`.
  - Committing changes: `git commit -m "..."`.
  - Stashing and branch switches: `git stash`, `git checkout`, `git branch`.
  - Pulling remote changes: `git pull`.

### 2. Strictly Forbidden Remote Pushes
- **NEVER execute `git push` without direct, explicit user request.**
- Pushing to remote repositories (`origin`, upstream, etc.) can trigger CI/CD pipelines, production deployments, or remote overwrites.
- Always ask the user for permission before running `git push`.
