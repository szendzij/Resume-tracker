# Windows PowerShell Execution Guidelines

> **Scope**: Shell execution via `run_command` on Windows machines with PowerShell.

## Rules

### 1. NPM / NPX Binary Execution
- On Windows systems with default PowerShell execution policies, invoking `npm` or `npx` directly attempts to execute `npm.ps1` or `npx.ps1`, which fails with:
  ```text
  PSSecurityException: File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system.
  ```
- **Always invoke Windows batch wrappers**:
  - Use `npm.cmd` instead of `npm` (e.g. `npm.cmd run build`, `npm.cmd test`).
  - Use `npx.cmd` instead of `npx`.
  - Alternatively, use `node ./node_modules/<bin>/...` or `bun` when available.

### 2. Git & Filesystem Sandboxing
- In sandboxed terminal mode (`BypassSandbox: false`), PowerShell cannot write to `.git/index.lock` or traverse parent paths (e.g., when `esbuild` looks for parent root `../..`).
- When executing `git commit` or commands needing `.git` lockfiles, use `BypassSandbox: true` to avoid `Permission denied: Unable to create '.git/index.lock'`.
- Keep standard read-only commands (`git status`, `git diff`, `git log`) in `BypassSandbox: false`.
