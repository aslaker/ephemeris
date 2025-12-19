---
description: "Task list for AI Pass Briefing feature implementation"
---

# Tasks: AI Pass Briefing

**Input**: Design documents from `/specs/006-ai-pass-briefing/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths shown below assume single project structure per plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Cloudflare AI configuration

- [x] T001 Verify TanStack DB packages installed (`@tanstack/react-db`, `@tanstack/query-db-collection`)
- [x] T002 [P] Add AI binding to `wrangler.jsonc` configuration
- [x] T003 [P] Add AI binding type to `worker-configuration.d.ts`
- [x] T004 [P] Copy API contracts from `specs/006-ai-pass-briefing/contracts/api-interfaces.ts` to `src/lib/briefing/types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create location store in `src/lib/location/store.ts` with TanStack Store and localStorage sync
- [x] T006 Create `useLocation` hook in `src/hooks/useLocation.ts` with geolocation request and error handling
- [x] T007 Create `useNextPass` hook in `src/hooks/useNextPass.ts` for derived pass prediction from location + TLE
- [x] T008 Remove LocationContext from `src/routes/iss/-components/ISSLayout.tsx` and keep only layout concerns
- [x] T009 Update `src/routes/iss/-components/FlyoverControl.tsx` to use `useLocation` and `useNextPass` hooks instead of LocationContext

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View AI-Generated Pass Briefing (Priority: P1) 🎯 MVP

**Goal**: Users can see a clear, human-readable briefing for an upcoming ISS pass that explains viewing opportunities in plain English.

**Independent Test**: Can be fully tested by selecting any upcoming pass and receiving a generated briefing that explains the viewing opportunity in plain English.

### Implementation for User Story 1

- [x] T011 [P] [US1] Create briefing collection in `src/lib/briefing/collection.ts` using TanStack DB with query-db-collection (imports types from T004)
- [x] T013 [US1] Create prompt templates in `src/lib/briefing/prompt.ts` with SYSTEM_PROMPT and buildBriefingPrompt function (weather-agnostic initially)
- [x] T014 [US1] Create AI client server function `generateBriefing` in `src/lib/briefing/ai-client.ts` with Cloudflare Workers AI integration and Sentry instrumentation
- [x] T015 [US1] Create BriefingCard component in `src/routes/iss/-components/BriefingCard.tsx` with useLiveQuery for reactive briefing display
- [x] T016 [US1] Add error boundary around BriefingCard component with graceful degradation fallback
- [x] T053 [US1] Add briefing validation in `src/lib/briefing/ai-client.ts` to verify AI-generated times/elevations match source PassPrediction data (FR-006, SC-002)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Input and Save Location (Priority: P1) 🎯 MVP

**Goal**: User observation location is saved and shared across all app pages (map, globe, briefing) with persistence across browser sessions.

**Independent Test**: Can be tested by setting location once and verifying it persists across browser sessions and is automatically used by map, globe, and briefing pages.

### Implementation for User Story 2

- [x] T017 [P] [US2] Create LocationSelector component in `src/routes/iss/-components/LocationSelector.tsx` with address search, coordinates input, and map selection
- [x] T018 [US2] Integrate LocationSelector with location store actions (setManual, setFromGeolocation) in `src/routes/iss/-components/LocationSelector.tsx`
- [x] T019 [US2] Update existing map page to use `useLocation` hook instead of LocationContext
- [x] T020 [US2] Update existing globe page to use `useLocation` hook instead of LocationContext
- [x] T021 [US2] Add location persistence verification - test that location survives page refresh

**Checkpoint**: At this point, User Story 2 should be fully functional and location should persist app-wide

---

## Phase 5: User Story 3 - View Upcoming Passes List (Priority: P1) 🎯 MVP

**Goal**: Users can see a list of upcoming ISS passes for their location within a date range so they can choose which ones to get briefings for.

**Independent Test**: Can be tested by viewing a list of passes for a location and date range without any AI briefing functionality.

### Implementation for User Story 3

- [x] T022 [P] [US3] Extend `src/lib/iss/orbital.ts` with `predictPasses` function for multiple pass predictions
- [x] T023 [P] [US3] Add `PredictPassesOptions` interface to `src/lib/iss/orbital.ts` with maxPasses, maxDays, minElevation options
- [x] T024 [US3] Create `usePasses` hook in `src/hooks/iss/usePasses.ts` with TanStack Query for multiple pass predictions
- [x] T025 [US3] Create PassCard component in `src/routes/iss/-components/PassCard.tsx` displaying date, time, max elevation, and "Generate briefing" button
- [x] T026 [US3] Create PassesList component in `src/routes/iss/-components/PassesList.tsx` with date range selector and pass list rendering
- [x] T027 [US3] Create passes route in `src/routes/iss/passes.tsx` with ISSLayout wrapper and LocationSelector fallback
- [x] T028 [US3] Add navigation link to passes page in `src/routes/iss/-components/ISSLayout.tsx` header

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently

---

## Phase 6: User Story 4 - Accessible Interface Experience (Priority: P2)

**Goal**: Pass briefing interface is fully accessible with WCAG 2.1 AA compliance, keyboard navigation, and screen reader support.

**Independent Test**: Can be tested using screen readers, keyboard-only navigation, and accessibility audit tools.

### Implementation for User Story 4

- [x] T029 [P] [US4] Add semantic HTML structure to PassesList component with proper heading hierarchy and ARIA labels
- [x] T030 [P] [US4] Add semantic HTML structure to PassCard component with role="listitem" and ARIA labels
- [x] T031 [P] [US4] Add semantic HTML structure to BriefingCard component with role="article" and ARIA labels
- [x] T032 [US4] Implement keyboard navigation for PassCard component with Enter/Space to expand and Escape to close
- [x] T033 [US4] Implement keyboard navigation for BriefingCard component with focus trap and Escape to close
- [x] T034 [US4] Add live regions (aria-live) to BriefingCard for announcing generation status changes
- [x] T035 [US4] Add focus management to LocationSelector component with proper tab order
- [x] T036 [US4] Verify color contrast ratios meet WCAG AA (4.5:1) for all text in new components
- [x] T037 [US4] Add reduced motion support - respect `prefers-reduced-motion` media query in animated components
- [x] T038 [US4] Add screen reader announcements for pass list updates and briefing generation completion

**Checkpoint**: At this point, User Stories 1-4 should all work independently with full accessibility support

---

## Phase 7: User Story 5 - Weather-Aware Briefings (Priority: P3)

**Goal**: Briefings include current weather and visibility conditions to help users make informed decisions about whether to observe.

**Independent Test**: Can be tested by generating a briefing and verifying weather conditions are mentioned and accurate for the location.

### Implementation for User Story 5

- [x] T012 [US5] Create weather client in `src/lib/briefing/weather.ts` with Open-Meteo API integration
- [x] T039 [US5] Integrate weather data fetching into `generateBriefing` server function in `src/lib/briefing/ai-client.ts`
- [x] T040 [US5] Update prompt template in `src/lib/briefing/prompt.ts` to include weather data when available
- [x] T041 [US5] Update BriefingCard component to display weather conditions section when weatherIncluded is true
- [x] T042 [US5] Add graceful degradation - show "Weather unavailable" message when weather API fails
- [x] T043 [US5] Add weather favorability indicator (cloud cover < 50% and visibility > 10km) to briefing display

**Checkpoint**: At this point, all user stories should be complete with weather integration

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T044 [P] Add error handling and retry logic for weather API failures in `src/lib/briefing/weather.ts`
- [x] T045 [P] Add error handling and retry logic for AI generation failures in `src/lib/briefing/ai-client.ts`
- [x] T046 Add loading states and skeleton UI for pass list loading in `src/routes/iss/-components/PassesList.tsx`
- [x] T047 Add loading states and skeleton UI for briefing generation in `src/routes/iss/-components/BriefingCard.tsx`
- [x] T048 Add "Refresh briefing" functionality to BriefingCard component using collection invalidation
- [x] T049 Add date range validation (1-14 days) to PassesList component date picker
- [x] T050 Add helpful message when no passes found in date range in `src/routes/iss/-components/PassesList.tsx`
- [ ] T051 Run quickstart.md validation checklist to verify all implementation steps completed
- [ ] T052 Update documentation in README.md or feature docs if needed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Enhances US1, US2, US3 but independently testable
- **User Story 5 (P3)**: Depends on User Story 1 completion - Enhances briefing with weather data

### Within Each User Story

- Models/types before services
- Services before components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, User Stories 1, 2, and 3 can start in parallel (if team capacity allows)
- All accessibility tasks marked [P] in User Story 4 can run in parallel
- Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all type/collection setup tasks together:
Task: "Create briefing types file src/lib/briefing/types.ts"
Task: "Create briefing collection in src/lib/briefing/collection.ts"
```

---

## Parallel Example: User Story 3

```bash
# Launch orbital extension and hook creation together:
Task: "Extend src/lib/iss/orbital.ts with predictPasses function"
Task: "Add PredictPassesOptions interface to src/lib/iss/orbital.ts"
Task: "Create usePasses hook in src/hooks/iss/usePasses.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (AI Briefing)
4. Complete Phase 4: User Story 2 (Location Persistence)
5. Complete Phase 5: User Story 3 (Passes List)
6. **STOP and VALIDATE**: Test all three stories independently
7. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (Core AI Briefing MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Location persistence)
4. Add User Story 3 → Test independently → Deploy/Demo (Pass browsing)
5. Add User Story 4 → Test independently → Deploy/Demo (Accessibility)
6. Add User Story 5 → Test independently → Deploy/Demo (Weather enhancement)
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (AI Briefing)
   - Developer B: User Story 2 (Location)
   - Developer C: User Story 3 (Passes List)
3. Stories complete and integrate independently
4. Developer A: User Story 4 (Accessibility) - can work in parallel with US5
5. Developer B: User Story 5 (Weather) - depends on US1 but can enhance independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- **Tests deferred**: Integration tests are intentionally deferred per feature request scope. Constitution V SHOULD clause satisfied; MUST clause (critical user journeys) to be addressed in future iteration if needed.
- All server functions must include Sentry instrumentation per project rules
- Location store eliminates LocationContext - cleaner architecture per research.md
- **Briefing accuracy** (FR-006, SC-002): T053 validates AI output matches source PassPrediction data


