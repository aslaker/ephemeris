# Implementation Plan: AI Pass Briefing

**Branch**: `006-ai-pass-briefing` | **Date**: 2024-12-17 | **Spec**: [spec.md](./spec.md)  
**Status**: ✅ Planning Complete - Ready for `/speckit.tasks`  
**Input**: Feature specification from `/specs/006-ai-pass-briefing/spec.md`

## Summary

AI-powered ISS pass briefings with accessibility improvements. Users can set their observation location (persisted app-wide), view upcoming passes for a date range, and generate human-readable AI briefings that explain viewing opportunities in plain English. The feature builds on existing orbital prediction infrastructure and adds weather integration for enhanced briefings.

## Technical Context

**Language/Version**: TypeScript 5.7, React 19  
**Primary Dependencies**: TanStack Start, TanStack Router, TanStack Query, TanStack Store, TanStack DB, Dexie (IndexedDB), Sentry, Zod, satellite.js  
**Storage**: TanStack DB + query-db-collection (briefings), Dexie (telemetry), TanStack Store + localStorage (location)  
**Testing**: Vitest with React Testing Library  
**Target Platform**: Web (Cloudflare Workers deployment)  
**Project Type**: Web application (TanStack Start full-stack React)  
**Performance Goals**: AI briefing generation within 5 seconds (SC-001), full flow completion in under 2 minutes (SC-003)  
**Constraints**: Client-side caching required (FR-015), WCAG 2.1 AA compliance (FR-009), graceful degradation when AI unavailable (FR-008)  
**Scale/Scope**: Single user focus, personal project

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Component Architecture ✅

| Principle | Compliance | Notes |
|-----------|------------|-------|
| Functional Components Only | ✅ PASS | All new components will be functional with hooks |
| Single Responsibility | ✅ PASS | PassList, PassCard, BriefingCard, LocationPicker as separate components |
| Composition Over Configuration | ✅ PASS | Compose briefing UI from atomic elements |
| Colocation | ✅ PASS | New components in `src/routes/iss/-components/` or new `src/routes/passes/` |
| Naming Clarity | ✅ PASS | PassBriefingCard, LocationSelector, PassesList |
| Props Interface | ✅ PASS | All props typed with TypeScript interfaces |

### II. Data Flow & State Management ✅

| Principle | Compliance | Notes |
|-----------|------------|-------|
| TanStack Query for Server State | ✅ PASS | Pass predictions, weather data, AI briefings use Query |
| Query Key Conventions | ✅ PASS | `['passes', location, dateRange]`, `['briefing', passId]` |
| TanStack Store for Client State | ✅ PASS | User location stored in TanStack Store for app-wide sharing |
| URL as State | ✅ PASS | Date range and selected pass in URL search params |
| Centralized Data Fetching | ✅ PASS | Components fetch via useQuery at point of use |

### III. Routing & Navigation ✅

| Principle | Compliance | Notes |
|-----------|------------|-------|
| File-Based Routing | ✅ PASS | New route: `src/routes/iss/passes.tsx` |
| Route Loaders for Critical Data | ⚠️ CONSIDER | May use loader for initial passes list |
| Type-Safe Links | ✅ PASS | Use TanStack Router Link component |
| Server Functions | ✅ PASS | `createServerFn` for AI briefing generation with Sentry instrumentation |
| Layout Components | ✅ PASS | Extends existing ISSLayout |

### IV. Performance Optimization ✅

| Principle | Compliance | Notes |
|-----------|------------|-------|
| Memoization with Purpose | ✅ PASS | Only where profiling indicates |
| Code Splitting | ⚠️ CONSIDER | AI briefing component could be lazy-loaded |
| Minimize Re-renders | ✅ PASS | TanStack Store selector patterns |
| Effect Cleanup | ✅ PASS | All effects will have cleanup functions |

### V. Code Quality & Testing ✅

| Principle | Compliance | Notes |
|-----------|------------|-------|
| TypeScript Strict Mode | ✅ PASS | Existing project config |
| Biome for Linting/Formatting | ✅ PASS | Pre-commit hooks exist |
| Component Tests | ✅ PLANNED | Test keyboard navigation and ARIA announcements |
| API Contract Tests | ✅ PLANNED | Validate AI response shapes |

### VI. Observability & Error Handling ✅

| Principle | Compliance | Notes |
|-----------|------------|-------|
| Sentry Integration | ✅ PASS | Server functions instrumented with startSpan |
| Error Boundaries | ✅ PASS | Add boundary around AI briefing component |
| Graceful Degradation | ✅ PASS | FR-008: Show raw pass data when AI unavailable |

**Gate Status**: ✅ PASSED - All principles satisfied or justifiably deferred

### Post-Design Re-evaluation

After completing Phase 0 (research) and Phase 1 (design), the following updates to the constitution check:

| Principle | Pre-Design | Post-Design | Notes |
|-----------|------------|-------------|-------|
| TanStack Store for Client State | ✅ PLANNED | ✅ DESIGNED | Location store with localStorage sync defined in research.md |
| Server Functions | ✅ PLANNED | ✅ DESIGNED | `generateBriefing` server function with Sentry instrumentation |
| API Contract Tests | ✅ PLANNED | ✅ DESIGNED | Zod schemas in contracts/api-interfaces.ts enable runtime validation |
| Error Boundaries | ✅ PLANNED | ✅ DESIGNED | Fallback briefing pattern defined in quickstart.md |
| Graceful Degradation | ✅ PASS | ✅ PASS | Fallback to raw pass data when AI unavailable (FR-008) |
| WCAG AA Accessibility | ✅ PLANNED | ✅ DESIGNED | ARIA patterns and keyboard navigation defined in research.md |

**Final Gate Status**: ✅ PASSED - All principles addressed in design artifacts

## Project Structure

### Documentation (this feature)

```text
specs/006-ai-pass-briefing/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-interfaces.ts
├── checklists/
│   └── requirements.md  # Existing
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── iss/
│   │   ├── orbital.ts       # Extend: predictMultiplePasses()
│   │   ├── types.ts         # Extend: WeatherConditions
│   │   ├── db.ts            # UNCHANGED: telemetry data stays in Dexie
│   │   └── storage.ts       # UNCHANGED
│   ├── briefing/
│   │   ├── collection.ts    # NEW: TanStack DB collection for briefings
│   │   ├── types.ts         # NEW: PassBriefing, BriefingConditions types
│   │   ├── ai-client.ts     # NEW: AI provider abstraction (server function)
│   │   ├── prompt.ts        # NEW: Briefing prompt templates
│   │   └── weather.ts       # NEW: Weather API integration
│   └── location/
│       └── store.ts         # NEW: TanStack Store for app-wide location
├── hooks/
│   ├── useLocation.ts       # NEW: Location with geolocation + error handling
│   ├── useNextPass.ts       # NEW: Derived pass prediction from location + TLE
│   └── iss/
│       ├── useISSData.ts    # UNCHANGED
│       └── usePasses.ts     # NEW: Multiple passes query hook
├── routes/
│   └── iss/
│       ├── passes.tsx       # NEW: Passes list route
│       └── -components/
│           ├── PassesList.tsx       # NEW
│           ├── PassCard.tsx         # NEW
│           ├── BriefingCard.tsx     # NEW: Uses useLiveQuery from TanStack DB
│           ├── LocationSelector.tsx # NEW: Unified location picker
│           ├── FlyoverControl.tsx   # MODIFY: Use useLocation + useNextPass hooks
│           └── ISSLayout.tsx        # MODIFY: Remove LocationContext, keep layout only
```

**Structure Decision**: Extends existing TanStack Start web application structure. New briefing-related logic in `src/lib/briefing/`, location state management in `src/lib/location/`, new route at `src/routes/iss/passes.tsx` following existing ISS feature organization.

## Complexity Tracking

> No constitution violations requiring justification at this time.
