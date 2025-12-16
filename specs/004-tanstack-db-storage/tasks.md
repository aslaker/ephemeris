# Tasks: Local-First Data Storage

**Input**: Design documents from `/specs/004-tanstack-db-storage/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api-interfaces.ts ✅, quickstart.md ✅

**Tests**: Not explicitly requested in spec - test tasks omitted per template guidance.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [X] T001 Install dexie dependency via `npm install dexie`
- [X] T002 [P] Create directory structure `src/hooks/iss/` for ISS data hooks

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core Dexie database infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Create Dexie database setup with typed tables in `src/lib/iss/db.ts`
- [X] T004 [P] Add StoredAstronaut and StoredTLE extended types to `src/lib/iss/db.ts`
- [X] T005 Create storage helper functions (getCachedPosition, getCachedCrew, getCachedTLE) in `src/lib/iss/db.ts`
- [X] T006 Create retention policy configuration and cleanup helpers in `src/lib/iss/storage.ts`
- [X] T007 Add Zod validation schemas for stored data types in `src/lib/iss/storage.ts`
- [X] T007.5 Add corruption recovery logic that triggers TanStack Query refetch after removing invalid records in `src/lib/iss/storage.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Instant App Load with Cached Data (Priority: P1) 🎯 MVP

**Goal**: Users open the app and immediately see previously collected ISS data without waiting for network requests

**Independent Test**: Open app after initial data collection, verify all previously viewed data appears immediately, confirm background updates occur without user awareness

### Implementation for User Story 1

- [X] T008 [US1] Modify queries.ts to add Dexie persistence side effect in currentPosition queryFn in `src/lib/iss/queries.ts`
- [X] T009 [US1] Modify queries.ts to add Dexie persistence side effect in crew queryFn in `src/lib/iss/queries.ts`
- [X] T010 [US1] Modify queries.ts to add Dexie persistence side effect in tle queryFn in `src/lib/iss/queries.ts`
- [X] T011 [US1] Create useISSPosition hook with cache-first loading pattern in `src/hooks/iss/useISSData.ts`
- [X] T012 [US1] Create useISSCrew hook with cache-first loading pattern in `src/hooks/iss/useISSData.ts`
- [X] T013 [US1] Create useISSTLE hook with cache-first loading pattern in `src/hooks/iss/useISSData.ts`
- [X] T014 [US1] Update ISS index route to use useISSPosition hook in `src/routes/iss/index.tsx`
- [X] T015 [US1] Update ISS crew route to use useISSCrew hook in `src/routes/iss/crew.tsx`
- [X] T016 [US1] Update StatsPanel to show fromCache indicator (optional debug info) in `src/routes/iss/-components/StatsPanel.tsx`

**Checkpoint**: User Story 1 complete - app loads instantly with cached data, existing "ESTABLISHING UPLINK" loading state handles first-visit UX

---

## Phase 4: User Story 2 - Seamless Background Data Refresh (Priority: P1)

**Goal**: Data refreshes automatically in background without visible loading states or interruptions, position updates animate smoothly

**Independent Test**: Monitor network activity while using app, verify data updates occur automatically, confirm UI never shows loading states during background refreshes, observe smooth position animations

### Implementation for User Story 2

- [X] T017 [US2] Ensure refetchInterval configuration is preserved in modified queries.ts in `src/lib/iss/queries.ts`
- [X] T018 [US2] Add error handling for failed background refreshes with retry logic in `src/lib/iss/queries.ts`
- [X] T019 [US2] Add window focus/visibility handlers for smart refetching in `src/hooks/iss/useISSData.ts`
- [X] T020 [US2] Ensure position marker uses CSS transitions for smooth animation in `src/routes/iss/-components/StatsPanel.tsx`
- [X] T021 [US2] Add Sentry instrumentation for background refresh operations in `src/lib/iss/queries.ts`

**Checkpoint**: User Story 2 complete - background refresh works seamlessly, position updates are smooth

---

## Phase 5: User Story 3 - Historical Data Collection and Persistence (Priority: P2)

**Goal**: App automatically collects and stores ISS data over time, building a historical record accessible by time range

**Independent Test**: Run app over extended period, verify data accumulates in IndexedDB, confirm historical records can be queried and displayed

### Implementation for User Story 3

- [X] T022 [US3] Implement getPositionsInRange query function in `src/lib/iss/db.ts`
- [X] T023 [US3] Implement retention cleanup function (cleanupOldPositions) in `src/lib/iss/storage.ts`
- [X] T024 [US3] Implement TLE retention cleanup function (cleanupOldTle) in `src/lib/iss/storage.ts`
- [X] T025 [US3] Create usePositionHistory hook for time-range queries in `src/hooks/iss/useISSData.ts`
- [X] T026 [US3] Add cleanup scheduler that runs during app activity in `src/lib/iss/storage.ts`
- [X] T027 [US3] Integrate cleanup scheduler into app initialization in `src/routes/iss/index.tsx`

**Checkpoint**: User Story 3 complete - historical data is collected, persisted, and queryable by time range

---

## Phase 6: User Story 4 - Foundation for Advanced Features (Priority: P3)

**Goal**: Storage system supports future features like flight path scrubbing, event timeline, and cloud sync

**Independent Test**: Verify storage system efficiently queries data by time ranges, supports event association patterns, and schema is ready for cloud sync

### Implementation for User Story 4

- [X] T028 [US4] Implement gap detection function (detectGaps) in `src/lib/iss/storage.ts`
- [X] T029 [US4] Implement shouldUseOrbitalCalculation threshold check (24h) in `src/lib/iss/storage.ts`
- [X] T030 [US4] Implement fillGapWithOrbital using existing orbital.ts calculateOrbitPath in `src/lib/iss/storage.ts`
- [X] T031 [US4] Create useGapFilling hook to fill gaps on background refresh in `src/hooks/iss/useISSData.ts`
- [X] T032 [US4] Add schema version tracking for future migrations in `src/lib/iss/db.ts`
- [X] T032.5 [US4] Create TimelineEvent interface and event association schema foundation in `src/lib/iss/db.ts` (schema only, no UI - enables future event timeline features per FR-011)
- [X] T033 [US4] Implement runMigrations helper for schema updates in `src/lib/iss/storage.ts`

**Checkpoint**: User Story 4 complete - foundation ready for flight path scrubbing, event timeline, and cloud sync features

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup demo code and final verification

- [X] T034 [P] Remove demo chat route `src/routes/demo/db-chat.tsx`
- [X] T035 [P] Remove demo chat API `src/routes/demo/db-chat-api.ts`
- [X] T036 [P] Remove demo chat hook `src/hooks/demo.useChat.ts`
- [X] T037 [P] Remove demo chat component `src/components/demo.chat-area.tsx`
- [X] T038 [P] Remove demo messages component `src/components/demo.messages.tsx`
- [X] T039 Remove messagesCollection from `src/db-collections/index.ts` (keep file if other exports exist)
- [X] T040 Remove Header navigation references to demo chat in `src/components/Header.tsx`
- [X] T041 Verify no remaining TypeScript errors or broken imports after demo removal
- [X] T042 Run quickstart.md validation checklist manually

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001, T002) completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 and US2 can proceed in parallel after Foundational
  - US3 depends on US1 (needs persistence working)
  - US4 depends on US3 (needs historical data infrastructure)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Can run in parallel with US1
- **User Story 3 (P2)**: Depends on US1 completion (needs persistence infrastructure)
- **User Story 4 (P3)**: Depends on US3 completion (needs historical data queries)

### Within Each User Story

- Modify queries.ts before creating hooks that depend on persistence
- Create hooks before updating routes that use them
- Core implementation before integration
- T007.5 (corruption recovery) depends on T007 (Zod validation)
- T032.5 (event foundation) can run in parallel with T032 and T033

### Parallel Opportunities

- T002 can run in parallel with T001
- T004 can run in parallel with T003
- T007 and T007.5 are sequential (T007.5 depends on T007)
- T032, T032.5, T033 can all run in parallel (different concerns)
- T034-T038 (demo removal) can all run in parallel
- US1 and US2 can be worked on in parallel after Foundational phase

---

## Parallel Example: Phase 1 (Setup)

```bash
# Both can run simultaneously:
Task T001: "Install dexie dependency via npm install dexie"
Task T002: "Create directory structure src/hooks/iss/"
```

## Parallel Example: Phase 7 (Demo Removal)

```bash
# All demo files can be removed in parallel:
Task T034: "Remove demo chat route src/routes/demo/db-chat.tsx"
Task T035: "Remove demo chat API src/routes/demo/db-chat-api.ts"
Task T036: "Remove demo chat hook src/hooks/demo.useChat.ts"
Task T037: "Remove demo chat component src/components/demo.chat-area.tsx"
Task T038: "Remove demo messages component src/components/demo.messages.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T007)
3. Complete Phase 3: User Story 1 (T008-T016)
4. Complete Phase 4: User Story 2 (T017-T021)
5. **STOP and VALIDATE**: Test instant load + background refresh independently
6. Deploy/demo if ready - app now has local-first data persistence!

### Incremental Delivery

1. Setup + Foundational → Database ready
2. Add User Story 1 → Test instant load → Deploy (MVP - instant app loads!)
3. Add User Story 2 → Test background refresh → Deploy (seamless updates!)
4. Add User Story 3 → Test history queries → Deploy (historical data!)
5. Add User Story 4 → Test gap filling → Deploy (future-ready!)
6. Polish → Remove demo code → Final release

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No new routes needed - existing StatsPanel loading state serves as first-visit experience (per research.md)
- Only client-side code can access IndexedDB - wrap in `typeof window !== "undefined"` checks
- Cloudflare Workers compatibility: use lazy initialization pattern (per research.md Section 8)
- Demo removal (FR-017) is final task to ensure no hidden dependencies on demo code
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
