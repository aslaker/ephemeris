---
description: Run comprehensive pre-commit workflow: fix tests, build, Wrangler, and lint issues, then update changelog, commit changes, and create/update PR.
---

# Pre-Commit

## Overview

Run comprehensive pre-commit workflow: fix tests, build, Wrangler, and lint issues, then update changelog, commit changes, and create/update PR.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Steps

### Phase 1: Fix Tests

**Run initial tests**

- Execute `bun run test`
- Analyze all test failures in the output

**Fix all failures**

- Automatically fix all test failures found
- Update test assertions as needed
- Fix implementation bugs causing failures
- Ensure all tests meet expectations
- Continue fixing until all tests pass

**Verify tests**

- Run `bun run test` again
- Confirm all tests pass
- If failures remain, continue fixing until resolved

### Phase 2: Fix TypeScript Types

**Run initial type check**

- Execute `bun run type-check`
- Analyze all TypeScript type errors in the output

**Fix all errors**

- Automatically fix all TypeScript type errors found
- Address type mismatches
- Fix import/export type issues
- Resolve any missing type definitions
- Continue fixing until type check passes

**Verify type check**

- Run `bun run type-check` again
- Confirm all type errors are resolved
- If errors remain, continue fixing until resolved

### Phase 3: Fix Build

**Run initial build**

- Execute `bun run build`
- Analyze all build errors in the output

**Fix all errors**

- Automatically fix all build errors found
- Address remaining TypeScript errors (if any)
- Fix import/export issues
- Resolve any missing dependencies or type issues
- Continue fixing until build succeeds

**Verify build**

- Run `bun run build` again
- Confirm build completes successfully
- If errors remain, continue fixing until resolved

### Phase 4: Fix Wrangler Types

**Run initial Wrangler check**

- Execute `bunx wrangler types`
- Analyze all Wrangler/Cloudflare type errors in the output

**Fix all errors**

- Automatically fix all Wrangler type errors found
- Address TypeScript errors in Cloudflare Workers bindings
- Fix import/export issues
- Resolve type mismatches for environment variables, KV, D1, etc.
- Continue fixing until all Wrangler type checks pass

**Verify fixes**

- Run `bunx wrangler types` again
- Confirm all errors are resolved
- If errors remain, continue fixing until resolved

### Phase 5: Fix Lint & Format

**Run initial check**

- Execute `bun run check` (runs Biome lint + format check)
- Analyze all errors and warnings in the output

**Fix all issues**

- Execute `bunx biome check --write` to auto-fix issues
- For issues that can't be auto-fixed, manually address:
  - Code style issues
  - Formatting problems
  - Rule violations
- Continue fixing until all lint/format issues are resolved

**Verify fixes**

- Run `bun run check` again
- Confirm all errors are resolved
- If issues remain, continue fixing until resolved

### Phase 6: Update Changelog

**Read existing CHANGELOG.md**

- Use Read tool to read the current CHANGELOG.md file
- If CHANGELOG.md doesn't exist, create it with this template:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Fixed

### Removed
```

- Identify the "Unreleased" section

**Analyze git changes**

- Get commits since last tag: `git log $(git describe --tags --abbrev=0 2>/dev/null || echo "")..HEAD --oneline`
- Get list of changed files: `git diff --name-only HEAD`
- Categorize changes:
  - **Added**: New features
  - **Changed**: Changes in existing functionality
  - **Fixed**: Bug fixes (include automated fixes from phases 1-4)
  - **Removed**: Removed features

**Update CHANGELOG.md**

- Use Edit tool to update the "Unreleased" section
- Add entries for significant changes
- Include summary of automated fixes: "Fixed X test failures, Y build errors, Z lint issues"
- Focus on user-facing changes and significant fixes
- Follow Keep a Changelog format

**Stage changelog**

- Stage CHANGELOG.md: `git add CHANGELOG.md`

### Phase 7: Commit Changes

**Check and handle branch safety**

- **CRITICAL**: Never commit to main or staging branches
- Check current branch: `CURRENT_BRANCH=$(git branch --show-current)`
- If on `main` or `master`:
  - Create feature branch: `git checkout -b fix/pre-commit-$(date +%Y%m%d-%H%M%S)`
- If on `staging`:
  - Create feature branch from staging: `git checkout -b fix/pre-commit-$(date +%Y%m%d-%H%M%S)`
- If on any other branch:
  - Continue with current branch (already safe)
- Verify we're not on main/staging: `CURRENT_BRANCH=$(git branch --show-current)` and confirm it's not main, master, or staging

**Stage all changes**

- Stage all modified files: `git add -u`
- Stage any new files: `git add .`

**Generate commit message**

- Analyze staged changes to create meaningful commit message
- Format:

```text
[type]: [Brief description]

[Detailed description if needed]

Automated fixes:
- Fixed X test failures
- Resolved Y TypeScript type errors
- Fixed Z build errors
- Fixed W Wrangler type errors
- Corrected V lint issues
```

- Use conventional commit types: `feat`, `fix`, `chore`, `docs`, etc.

**Commit and push**

- Commit with generated message using HEREDOC:

```bash
git commit -m "$(cat <<'EOF'
[commit message here]
EOF
)"
```

- Push to current branch: `git push -u origin $(git branch --show-current)`

### Phase 8: Create/Update PR

**Check for existing open PR**

- Get current branch: `CURRENT_BRANCH=$(git branch --show-current)`
- Check for open PRs: `gh pr list --head $CURRENT_BRANCH --state open --json number,state,url`
- Parse the JSON output to check if any open PRs exist
- If an open PR exists, extract the PR number and URL
- **CRITICAL**: Only proceed with update if an open PR exists; if no open PR exists, create a new one

**Generate PR title**

- Use the commit message subject line as PR title
- Format: `[Type]: [Brief description]`

**Generate PR description**

- Create comprehensive PR description:

```markdown
## Summary
[Brief description of changes]

## Automated Quality Assurance
- ✅ Tests: [X] failures fixed automatically
- ✅ TypeScript: [Y] type errors resolved
- ✅ Build: [Z] compilation errors resolved
- ✅ Wrangler: [W] type errors fixed
- ✅ Lint: [V] code quality issues corrected

## Changes Made
[List of significant changes from CHANGELOG.md]

## Files Modified
[Group by type: Components, Routes, Config, etc.]

## Testing
- All tests passing
- TypeScript type check passing
- Build successful
- Wrangler types valid
- Biome checks clean
```

**Create or update PR**

- **CRITICAL**: Always target `main` branch (or appropriate base branch for this repo)
- If an open PR exists (from step 1):
  - Update the existing PR: `gh pr edit [PR_NUMBER] --title "[PR Title]" --body "[PR Description]"`
  - Note: This will update the existing open PR, not create a duplicate
- If no open PR exists:
  - Create a new PR using HEREDOC:

```bash
gh pr create --base main --title "[PR Title]" --body "$(cat <<'EOF'
[PR description here]
EOF
)"
```

### Phase 9: Final Validation

**Re-run all checks**

- Run `bun run test` to verify all tests still pass
- Run `bun run type-check` to verify TypeScript types still valid
- Run `bun run build` to verify build still succeeds
- Run `bunx wrangler types` to verify Wrangler types still valid
- Run `bun run check` to verify Biome checks still clean

**Verify everything passes**

- Confirm all checks complete successfully
- If any check fails, report which phase needs attention
- Document any remaining issues

**Generate comprehensive report**

- Summarize results from all phases:
  - Phase 1: Test fixes (X failures fixed, Y remaining)
  - Phase 2: TypeScript type fixes (X errors fixed, Y remaining)
  - Phase 3: Build fixes (X errors fixed, Y remaining)
  - Phase 4: Wrangler fixes (X errors fixed, Y remaining)
  - Phase 5: Lint fixes (X issues fixed, Y remaining)
  - Phase 6: Changelog updated
  - Phase 7: Changes committed and pushed
  - Phase 8: PR created/updated
  - Phase 9: Final validation status
- Report any issues that couldn't be automatically fixed
- Provide actionable next steps if needed

## Success Criteria

- All tests passing
- TypeScript type check passing
- Build successful
- Wrangler types valid
- Biome checks clean
- CHANGELOG.md updated
- Changes committed and pushed to a feature branch (never main or staging)
- PR created/updated targeting main branch
- Comprehensive report generated

## Comprehensive Reporting

At the end of the workflow, provide a structured report:

### Pre-Commit Workflow Completion Report

#### Phase Results

**Phase 1: Test Fixes**

- Initial Failures: [number]
- Fixed Automatically: [number]
- Remaining: [number]
- Status: ✅ Success / ⚠️ Partial / ❌ Failed

**Phase 2: TypeScript Type Fixes**

- Initial Errors: [number]
- Fixed Automatically: [number]
- Remaining: [number]
- Status: ✅ Success / ⚠️ Partial / ❌ Failed

**Phase 3: Build Fixes**

- Initial Errors: [number]
- Fixed Automatically: [number]
- Remaining: [number]
- Status: ✅ Success / ⚠️ Partial / ❌ Failed

**Phase 4: Wrangler Fixes**

- Initial Errors: [number]
- Fixed Automatically: [number]
- Remaining: [number]
- Status: ✅ Success / ⚠️ Partial / ❌ Failed

**Phase 5: Lint Fixes**

- Initial Issues: [number]
- Fixed Automatically: [number]
- Remaining: [number]
- Status: ✅ Success / ⚠️ Partial / ❌ Failed

**Phase 6: Changelog**

- Status: ✅ Updated / ✅ Created / ❌ Failed
- Entries Added: [number]

**Phase 7: Commit**

- Status: ✅ Committed and Pushed / ❌ Failed
- Branch: [branch name]
- Commit Hash: [hash]

**Phase 8: Pull Request**

- Status: ✅ Created / ✅ Updated / ❌ Failed
- PR Number: #[number]
- PR URL: [url]
- Base Branch: main

**Phase 9: Final Validation**

- Tests: ✅ Passing / ❌ Failing
- TypeScript: ✅ Valid / ❌ Errors
- Build: ✅ Success / ❌ Failed
- Wrangler: ✅ Valid / ❌ Errors
- Lint: ✅ Clean / ❌ Issues

#### Overall Status

- ✅ **SUCCESS**: All phases completed successfully
- ⚠️ **PARTIAL**: Some phases completed with remaining issues
- ❌ **FAILURE**: Critical phases failed

#### Next Steps (if applicable)

- [List any manual interventions needed]
- [List any remaining issues to address]

## Notes

- Each fix phase runs in a closed loop until all issues are resolved
- Continue fixing until all checks pass before proceeding to next phase
- Always use `bun` commands (not npm)
- Always target `main` branch for PRs
- Use Read/Edit tools for file operations (never sed/echo/cat for file editing)
- **CRITICAL**: Never commit directly to main or staging branches
  - If on main: create feature branch
  - If on staging: create feature branch from staging
  - Always commit to a feature branch, never to protected branches
