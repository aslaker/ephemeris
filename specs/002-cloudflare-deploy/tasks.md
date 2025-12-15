# Tasks: Cloudflare Workers Deployment

**Input**: Design documents from `/specs/002-cloudflare-deploy/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not requested - skipping test tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Verify Existing Infrastructure)

**Purpose**: Confirm existing Cloudflare configuration is correct

- [X] T001 Verify existing wrangler.jsonc has correct base configuration in wrangler.jsonc
- [X] T002 [P] Verify package.json has build/deploy/preview scripts in package.json

---

## Phase 2: Foundational (Core Configuration Updates)

**Purpose**: Update wrangler configuration with observability and correct compatibility date

**⚠️ CRITICAL**: These updates are required before any deployment can succeed

- [X] T003 Update compatibility_date to 2025-12-14 in wrangler.jsonc
- [X] T004 [P] Add observability.enabled: true configuration in wrangler.jsonc
- [X] T005 [P] Verify nodejs_compat flag is present in wrangler.jsonc

**Checkpoint**: Wrangler configuration complete - deployment tasks can proceed

---

## Phase 3: User Story 2 - Build for Production (Priority: P1) 🎯 MVP

**Goal**: Verify the application builds successfully for Cloudflare Workers

**Independent Test**: Run `bun run build` and verify it completes without errors

### Implementation for User Story 2

- [X] T006 [US2] Test build command completes successfully with `bun run build`
- [X] T007 [US2] Verify build output is generated in dist/server/ directory

**Checkpoint**: Build working - deployment can proceed

---

## Phase 4: User Story 1 - Deploy Application to Production (Priority: P1) 🎯 MVP

**Goal**: Deploy the application to Cloudflare Workers with a public URL

**Independent Test**: Run `bun run deploy` and verify application is accessible at the Workers URL

**Dependency**: User Story 2 (build must work first)

### Implementation for User Story 1

- [X] T008 [US1] Run wrangler login to authenticate with Cloudflare
- [X] T009 [US1] Execute deploy command with `bun run deploy`
- [X] T010 [US1] Verify deployed application is accessible and SSR works (pages render content, not loading spinners)

**Checkpoint**: MVP Complete - Application deployed to production

---

## Phase 5: User Story 3 - Preview Deployment Locally (Priority: P2)

**Goal**: Enable local testing of Workers environment before deployment

**Independent Test**: Run `bun run preview` and verify app works at localhost

### Implementation for User Story 3

- [X] T011 [US3] Build and run preview with `bun run build && bun run preview`
- [X] T012 [US3] Verify local preview simulates Workers environment correctly

**Checkpoint**: Local preview validated

---

## Phase 6: User Story 4 - Configure Environment Variables (Priority: P2)

**Goal**: Set up environment variable management for local and production

**Independent Test**: Create .dev.vars, set a variable, verify it's accessible in local preview

### Implementation for User Story 4

- [X] T013 [P] [US4] Create .dev.vars.example template file with documented variables at repository root
- [X] T014 [P] [US4] Update .gitignore to include .dev.vars (if not already present) in .gitignore
- [X] T015 [US4] Document production secrets management using wrangler secret put in quickstart.md

**Checkpoint**: Environment variable management complete

---

## Phase 7: User Story 5 - Automated Deployment via GitHub Actions (Priority: P2)

**Goal**: Automate deployment on push to main branch

**Independent Test**: Push a commit to main and verify GitHub Action runs and deploys

### Implementation for User Story 5

- [X] T016 [US5] Create .github/workflows/ directory structure
- [X] T017 [US5] Create deploy.yml workflow file with Biome lint, TypeScript check, build, and deploy steps in .github/workflows/deploy.yml
- [X] T018 [US5] Document required GitHub secrets (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID) in quickstart.md

**Checkpoint**: CI/CD pipeline ready - auto-deploy on push to main

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation

- [X] T019 Run full deployment validation per quickstart.md
- [X] T020 [P] Verify Sentry client-side tracking works in production

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - verifies config before updates
- **User Story 2 (Phase 3)**: Depends on Foundational - build config must be correct
- **User Story 1 (Phase 4)**: Depends on User Story 2 - build must work before deploy
- **User Story 3 (Phase 5)**: Depends on User Story 2 (build must work; does NOT require production deploy)
- **User Stories 4-5 (Phases 6-7)**: Can proceed after User Story 1 completion (deploy working)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

```text
                    ┌──────────────────┐
                    │   Setup (P1)     │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ Foundational (P2)│
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  US2: Build (P1) │
                    └────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
┌─────────▼────────┐         │                  │
│ US3: Preview (P2)│         │                  │
└─────────┬────────┘         │                  │
          │         ┌────────▼─────────┐        │
          │         │ US1: Deploy (P1) │ ← MVP  │
          │         └────────┬─────────┘        │
          │                  │                  │
          │   ┌──────────────┼──────────────────┘
          │   │              │
          │   │      ┌───────▼────────┐ ┌───────▼────────┐
          │   │      │ US4: Env (P2)  │ │ US5: CI/CD (P2)│
          │   │      └────────────────┘ └────────────────┘
          │   │              │                  │
          └───┼──────────────┼──────────────────┘
              │              │
                    ┌────────▼─────────┐
                    │     Polish       │
                    └──────────────────┘
```

### Parallel Opportunities

**Within Phases:**
- Phase 2: T004 and T005 can run in parallel (different config sections)
- Phase 6: T013 and T014 can run in parallel (different files)
- Phase 8: T019 and T020 can run in parallel (independent validations)

**Across User Stories (P2 phase):**
- Once US1 (Deploy) is complete, US3, US4, and US5 can all proceed in parallel

---

## Parallel Example: P2 User Stories

```bash
# After MVP (US1+US2) is complete, launch all P2 stories in parallel:

# User Story 3 (Preview):
Task: "Build and run preview with bun run build && bun run preview"

# User Story 4 (Environment Variables):
Task: "Create .dev.vars.example template file"
Task: "Update .gitignore to include .dev.vars"

# User Story 5 (GitHub Actions):
Task: "Create .github/workflows/ directory structure"
Task: "Create deploy.yml workflow file"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup verification
2. Complete Phase 2: Foundational config updates
3. Complete Phase 3: User Story 2 (Build)
4. Complete Phase 4: User Story 1 (Deploy)
5. **STOP and VALIDATE**: Application is deployed and accessible
6. MVP is done - users can access the app!

### Incremental Delivery

1. Setup + Foundational → Config ready
2. Add User Story 2 (Build) → Build verified
3. Add User Story 1 (Deploy) → **MVP deployed!** 🎉
4. Add User Story 3 (Preview) → Local testing enabled
5. Add User Story 4 (Env vars) → Secrets management ready
6. Add User Story 5 (CI/CD) → Auto-deploy on push to main
7. Each increment adds value without breaking previous functionality

---

## File Changes Summary

### New Files

| File | User Story | Description |
|------|------------|-------------|
| `.github/workflows/deploy.yml` | US5 | GitHub Actions workflow for auto-deploy |
| `.dev.vars.example` | US4 | Template for local environment variables |

### Modified Files

| File | User Story | Description |
|------|------------|-------------|
| `wrangler.jsonc` | Foundational | Add observability, update compatibility_date |
| `.gitignore` | US4 | Add .dev.vars to ignored files |
| `quickstart.md` | US4, US5 | Document secrets management and GitHub setup |

---

## Notes

- This is an infrastructure-only feature - no changes to src/ application code
- [P] tasks = different files or independent operations, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently testable after completion
- Stop at MVP checkpoint (Phase 4) to validate before proceeding to P2 stories
- Sentry client-side tracking should continue to work without changes
