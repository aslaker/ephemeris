# Tasks: Fix Crew Data Rendering Regression

**Input**: Design documents from `/specs/003-fix-crew-render/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not explicitly requested - test tasks omitted.

**Organization**: Tasks organized by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Includes exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root (per plan.md)

---

## Phase 1: Setup

**Purpose**: No setup required - this is a bug fix in an existing project

**Status**: ✅ SKIPPED (existing TanStack Start web application)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational work required - existing infrastructure is adequate

**Status**: ✅ SKIPPED (query layer, error handling, and Sentry already configured)

---

## Phase 3: User Story 1 - View ISS Crew Manifest (Priority: P1) 🎯 MVP

**Goal**: Restore crew data rendering by fixing the API fetch layer to bypass the failing CORS proxy

**Independent Test**: Navigate to `/iss/crew` and verify that crew member cards are displayed with names, roles, agencies, and mission progress

### Implementation for User Story 1

- [X] T001 [US1] Create server function `fetchCrewFromApi` using `createServerFn` in `src/lib/iss/api.ts`
- [X] T002 [US1] Add response validation for Open Notify API in `src/lib/iss/api.ts`
- [X] T003 [US1] Update `fetchCrewData` to use server function instead of proxy-based fetch in `src/lib/iss/api.ts`
- [X] T004 [US1] Remove silent error handling (catch block returning empty array) in `src/lib/iss/api.ts`
- [X] T005 [US1] Verify ISS crew filtering logic works with new server function in `src/lib/iss/api.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional - crew cards should render when navigating to `/iss/crew`

---

## Phase 4: User Story 2 - View Mission Progress (Priority: P2)

**Goal**: Ensure mission timeline information displays correctly for astronauts with available data

**Independent Test**: Verify crew cards show "Time in Orbit" days, progress bar, launch date, and return date for astronauts with mission data in the local database

### Implementation for User Story 2

- [X] T006 [US2] Verify mission enrichment continues to work after API layer changes in `src/lib/iss/api.ts`
- [X] T007 [US2] Confirm astronauts without launch data show "STATUS: ACTIVE" with "DATA STREAM LIMITED" message in `src/routes/iss/-components/CrewCard.tsx`

**Checkpoint**: At this point, both User Stories should be fully functional - crew manifest loads with mission progress for enriched astronauts

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [X] T008 Verify error state displays "CREW_DATA_UNAVAILABLE" when API fails in `src/routes/iss/crew.tsx`
- [X] T009 Verify loading skeleton displays while fetching in `src/routes/iss/crew.tsx`
- [X] T010 Confirm Sentry instrumentation continues to work with new server function in `src/lib/iss/api.ts`
- [X] T011 Run quickstart.md validation steps to confirm fix is complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: SKIPPED - existing project
- **Foundational (Phase 2)**: SKIPPED - existing infrastructure
- **User Story 1 (Phase 3)**: Can start immediately - this is the core fix
- **User Story 2 (Phase 4)**: Depends on US1 completion (shares same API layer)
- **Polish (Phase 5)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies - this IS the fix
- **User Story 2 (P2)**: Depends on US1 - mission progress requires crew data to load first

### Task Dependencies Within User Story 1

```
T001 (create server function)
  ↓
T002 (add response validation)
  ↓
T003 (update fetchCrewData to use server function)
  ↓
T004 (remove silent error handling) ──────┐
  ↓                                       ↓
T005 (verify ISS filtering) ──────────────┴─► Checkpoint: US1 Complete
```

### Parallel Opportunities

- T006 and T007 can run in parallel after US1 is complete
- T008, T009, T010 can run in parallel during Polish phase

---

## Parallel Example: Polish Phase

```bash
# All verification tasks can run in parallel:
Task: "Verify error state displays 'CREW_DATA_UNAVAILABLE' when API fails"
Task: "Verify loading skeleton displays while fetching"
Task: "Confirm Sentry instrumentation continues to work"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (T001-T005)
2. **STOP and VALIDATE**: Navigate to `/iss/crew` and verify crew cards render
3. Deploy if ready - core functionality restored

### Incremental Delivery

1. Complete US1 → Test independently → Deploy (MVP! Core fix deployed)
2. Verify US2 → Confirm mission progress works → No additional deploy needed
3. Complete Polish → Final validation → Done

---

## Summary

| Metric | Count |
|--------|-------|
| **Total Tasks** | 11 |
| **User Story 1 Tasks** | 5 |
| **User Story 2 Tasks** | 2 |
| **Polish Tasks** | 4 |
| **Files Modified** | 2 (`src/lib/iss/api.ts`, verification only: `src/routes/iss/crew.tsx`, `src/routes/iss/-components/CrewCard.tsx`) |

### Key Changes

| File | Change Type |
|------|-------------|
| `src/lib/iss/api.ts` | Add server function, update fetchCrewData, remove silent catch |
| `src/routes/iss/crew.tsx` | Verification only (no code changes expected) |
| `src/routes/iss/-components/CrewCard.tsx` | Verification only (no code changes expected) |

### MVP Scope

**User Story 1 only** (Tasks T001-T005) delivers the core fix:
- Server function bypasses CORS proxy
- Errors propagate to TanStack Query
- UI shows crew cards (success) or error state (failure)

---

## Notes

- This is a **bug fix**, not a new feature - minimal changes required
- Primary file: `src/lib/iss/api.ts` - all implementation changes here
- The existing UI components, TanStack Query setup, and Sentry integration need no modifications
- US2 is verification-only - the mission enrichment logic already works once data loads
- Silent error handling removal is critical - it's the reason error state doesn't show

