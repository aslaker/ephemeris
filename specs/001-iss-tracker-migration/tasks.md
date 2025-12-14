# Tasks: ISS Tracker Migration

**Input**: Design documents from `/specs/001-iss-tracker-migration/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not explicitly requested - test tasks omitted (add later if needed)

**Organization**: Tasks grouped by user story for independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, etc.)
- Paths relative to repository root (`/Users/adamslaker/projects/personal/ephemeris`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and basic structure

- [X] T001 Install dependencies: `bun add three@0.170.0 react-globe.gl@^2.37.0 satellite.js@5.0.0` and `bun add -D @types/three`
- [X] T002 Create ISS route directory structure: `mkdir -p src/routes/iss/-components`
- [X] T003 [P] Create ISS utilities directory structure: `mkdir -p src/lib/iss`
- [X] T004 [P] Add Share Tech Mono font link to src/routes/__root.tsx head section

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create type definitions in src/lib/iss/types.ts (copy from contracts/api-interfaces.ts, export runtime types)
- [X] T006 [P] Add ISS Matrix theme CSS variables and animations to src/styles.css (per quickstart.md Step 3)
- [X] T007 [P] Implement TerminalAudio class in src/lib/iss/audio.ts (hover, click, data update, startup sounds with lazy init)
- [X] T008 Implement API layer with Sentry spans in src/lib/iss/api.ts (fetchISSPosition, fetchTLE, fetchCrewData with fallbacks). Verify fallback chains: WTIA→OpenNotify for position, CelesTrak→ARISS→hardcoded for TLE
- [X] T009 Create TanStack Query factory in src/lib/iss/queries.ts (issQueries.currentPosition, issQueries.tle, issQueries.crew)
- [X] T010 [P] Implement orbital calculation utilities in src/lib/iss/orbital.ts (calculateOrbitPath, predictNextPass, calculateOrbitalParameters using satellite.js)
- [X] T011 [P] Create MISSION_DB lookup table for crew enrichment in src/lib/iss/mission-db.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 + 2 - View ISS Live Position & Telemetry (Priority: P1) 🎯 MVP

**Goal**: Display ISS on interactive 3D globe with real-time telemetry data panel

**Why Combined**: These user stories are experienced together - the globe (US1) and stats panel (US2) are displayed simultaneously on the dashboard

**Independent Test**: Navigate to `/iss`, verify globe renders with ISS marker, position updates every 5s, and telemetry panel shows lat/lon/alt/velocity/period/timestamp

### Implementation for User Story 1 + 2

- [X] T012 [P] [US1+2] Create MatrixText animated text component in src/routes/iss/-components/MatrixText.tsx
- [X] T013 [P] [US1+2] Create StatsPanel telemetry display component in src/routes/iss/-components/StatsPanel.tsx
- [X] T014 [US1+2] Create ISSLayout wrapper component with Matrix theme in src/routes/iss/-components/ISSLayout.tsx (includes LocationContext provider)
- [X] T015 [US1+2] Implement main dashboard route with 3D Globe in src/routes/iss/index.tsx (react-globe.gl with ISS marker, orbital paths, auto-refresh)
- [X] T016 [US1+2] Add loading states to globe and stats panel (skeleton/loading indicators)
- [X] T017 [US1+2] Add error boundary and "SIGNAL_LOST" error state to ISSLayout

**Checkpoint**: User Story 1 + 2 complete - Core ISS tracker is functional with globe and telemetry

---

## Phase 4: User Story 7 - Experience Terminal UI Aesthetic (Priority: P2)

**Goal**: Complete Matrix terminal visual design with animations and audio feedback

**Independent Test**: Visit `/iss` for first time, see initialization screen, click "INITIALIZE_UPLINK", observe CRT turn-on effect, verify scanlines and flicker effects active

### Implementation for User Story 7

- [X] T018 [US7] Add initialization screen state to ISSLayout with "INITIALIZE_UPLINK" button in src/routes/iss/-components/ISSLayout.tsx
- [X] T019 [US7] Implement CRT turn-on animation trigger on initialize in src/routes/iss/-components/ISSLayout.tsx
- [X] T020 [P] [US7] Add scanline overlay component in src/routes/iss/-components/ScanlineOverlay.tsx
- [X] T021 [US7] Integrate TerminalAudio with initialization and UI interactions (hover/click sounds)
- [X] T022 [US7] Add mute toggle control to ISSLayout header

**Checkpoint**: User Story 7 complete - Full Matrix terminal aesthetic applied

---

## Phase 5: User Story 3 - View ISS Crew Manifest (Priority: P2)

**Goal**: Display grid of astronaut cards with enriched mission data

**Independent Test**: Navigate to `/iss/crew`, verify astronaut cards display with names, photos (if available), roles, agencies, time in orbit progress

### Implementation for User Story 3

- [X] T023 [P] [US3] Create CrewCard component with Matrix styling in src/routes/iss/-components/CrewCard.tsx
- [X] T024 [US3] Implement crew manifest route in src/routes/iss/crew.tsx (grid of CrewCards with loading skeletons)
- [X] T025 [US3] Add "Time in Orbit" progress calculation and display in CrewCard

**Checkpoint**: User Story 3 complete - Crew manifest fully functional

---

## Phase 6: User Story 4 - View ISS Position on 2D Map (Priority: P2)

**Goal**: Alternative 2D map visualization with orbital path overlay

**Independent Test**: Navigate to `/iss/map`, verify ISS marker on 2D projection, orbital paths handle anti-meridian crossing, position updates

### Implementation for User Story 4

- [X] T026 [US4] Implement 2D map route in src/routes/iss/map.tsx (canvas/SVG projection with world map)
- [X] T027 [US4] Add orbital path rendering with anti-meridian handling (split paths at ±180° longitude)
- [X] T028 [US4] Add ISS marker and position update animation

**Checkpoint**: User Story 4 complete - 2D map alternative available

---

## Phase 7: User Story 5 - Predict Next ISS Flyover (Priority: P3)

**Goal**: Calculate and display next visible ISS pass for user's location

**Independent Test**: Click "Acquire Location" or enter coordinates manually, verify next pass prediction appears with countdown timer, flyover arc displayed on globe/map

### Implementation for User Story 5

- [X] T029 [US5] Extend LocationContext with requestLocation and manualLocation actions in src/routes/iss/-components/ISSLayout.tsx
- [X] T030 [US5] Create FlyoverControl component in src/routes/iss/-components/FlyoverControl.tsx (location input, countdown timer)
- [X] T031 [US5] Add user location marker to globe in src/routes/iss/index.tsx
- [X] T032 [US5] Add flyover arc path (gold color) to globe when pass predicted in src/routes/iss/index.tsx
- [X] T033 [US5] Add flyover arc to 2D map in src/routes/iss/map.tsx
- [X] T034 [US5] Handle geolocation errors with specific messages (PERMISSION_DENIED, NO_VISIBLE_PASS)

**Checkpoint**: User Story 5 complete - Flyover prediction functional

---

## Phase 8: User Story 6 - View Orbital Parameters (Priority: P3)

**Goal**: Modal displaying Keplerian orbital elements from TLE data

**Independent Test**: Click "ORBIT_DATA" button on dashboard, verify modal opens with inclination, eccentricity, mean motion, perigee, apogee, period values

### Implementation for User Story 6

- [X] T035 [US6] Create OrbitalSolver modal component in src/routes/iss/-components/OrbitalSolver.tsx
- [X] T036 [US6] Add "ORBIT_DATA" button to dashboard in src/routes/iss/index.tsx
- [X] T037 [US6] Integrate OrbitalSolver with TLE data from queries

**Checkpoint**: User Story 6 complete - Orbital parameters viewable

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, cleanup, and cross-story improvements

- [X] T038 [P] Verify all routes accessible from header navigation
- [ ] T039 [P] Verify responsive layout on 375px viewport
- [ ] T040 [P] Verify Sentry spans appearing in Sentry dashboard for API calls
- [ ] T041 Run quickstart.md verification checklist (all items must pass)
- [X] T042 [P] Code cleanup: remove unused imports, fix any linting errors
- [ ] T043 Final integration test: full user journey through all features
- [ ] T044 [P] Verify cross-browser compatibility: Chrome, Firefox, Safari, Edge (SC-007)
- [ ] T045 [P] Verify audio unlock works correctly after user interaction (SC-009)
- [ ] T046 Run existing ephemeris routes/tests to verify no breaking changes (SC-010)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1+2 (Phase 3)**: Depends on Foundational - Core MVP
- **User Story 7 (Phase 4)**: Depends on Phase 3 (enhances existing UI)
- **User Stories 3, 4 (Phases 5-6)**: Can proceed in parallel after Phase 3
- **User Stories 5, 6 (Phases 7-8)**: Can proceed in parallel after Phase 3
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

```
                    ┌─────────────────────────────────────┐
                    │     Phase 2: Foundational           │
                    │   (types, api, queries, orbital,    │
                    │    styles, audio, mission-db)       │
                    └──────────────────┬──────────────────┘
                                       │
                                       ▼
                    ┌─────────────────────────────────────┐
                    │  Phase 3: US1+2 (Globe + Telemetry) │
                    │         🎯 MVP CHECKPOINT           │
                    └──────────────────┬──────────────────┘
                                       │
               ┌───────────────────────┼───────────────────────┐
               │                       │                       │
               ▼                       ▼                       ▼
    ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
    │ Phase 4: US7     │   │ Phase 5: US3     │   │ Phase 6: US4     │
    │ (Terminal UI)    │   │ (Crew)           │   │ (2D Map)         │
    └──────────────────┘   └──────────────────┘   └──────────────────┘
               │                       │                       │
               └───────────────────────┼───────────────────────┘
                                       │
               ┌───────────────────────┴───────────────────────┐
               │                                               │
               ▼                                               ▼
    ┌──────────────────┐                           ┌──────────────────┐
    │ Phase 7: US5     │                           │ Phase 8: US6     │
    │ (Flyover)        │                           │ (Orbital Params) │
    └──────────────────┘                           └──────────────────┘
```

### Within Each User Story

- Foundation utilities before components
- Base components before route pages
- Core features before enhancements
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 2 Parallel Tasks**:
```
T006 (styles) + T007 (audio) + T010 (orbital) + T011 (mission-db)
```

**Phase 3 Parallel Tasks**:
```
T012 (MatrixText) + T013 (StatsPanel)
```

**Phases 5-6-7-8 can all proceed in parallel** after Phase 3 MVP checkpoint

---

## Implementation Strategy

### MVP First (User Story 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 + 2
4. **STOP and VALIDATE**: Test at `/iss` - globe with position and telemetry
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1+2 (Globe + Telemetry) → **MVP Ready** ✅
3. Add US7 (Terminal UI Polish) → Enhanced experience
4. Add US3 (Crew) + US4 (2D Map) → Feature complete for P2
5. Add US5 (Flyover) + US6 (Orbital) → Full feature set
6. Polish → Production ready

### Suggested MVP Scope

**Phase 1 + 2 + 3 = MVP**
- Total: 17 tasks (T001-T017)
- Delivers: Working ISS tracker with 3D globe and telemetry
- Independent value: Users can see real-time ISS position

**Full Implementation**
- Total: 46 tasks (T001-T046)
- Includes all user stories and verification tasks

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Dependencies: three.js for WebGL, satellite.js for orbital math, react-globe.gl for 3D
- All entities have `id` field for future TanStack DB compatibility
