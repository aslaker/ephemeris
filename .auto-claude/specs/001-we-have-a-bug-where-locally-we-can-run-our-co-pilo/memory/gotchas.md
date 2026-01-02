# Gotchas & Pitfalls

Things to watch out for in this codebase.

## [2026-01-02 17:51]
Cannot run npm/bun/npx commands in sandbox environment - local dev server testing requires manual verification by user

_Context: Subtask 1-2 required testing the local development environment with wrangler dev. The sandbox blocks package manager commands (npm, bun, npx). Document manual steps in build-progress.txt for user to verify._
