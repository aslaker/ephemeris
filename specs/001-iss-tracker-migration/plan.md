# Implementation Plan: ISS Tracker Migration

**Branch**: `001-iss-tracker-migration` | **Date**: December 13, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-iss-tracker-migration/spec.md`

## Summary

Migrate the ISS Tracker application from a standalone Google AI Studio-generated project into the ephemeris TanStack Start application. The migration preserves the Matrix terminal aesthetic, real-time ISS tracking functionality, and orbital calculations while adapting to the existing TanStack Start architecture, Tailwind v4 styling, and adding Sentry instrumentation for observability.

**Data Architecture**: All external API calls are wrapped with TanStack Query using a query factory pattern (`issQueries`). This positions the codebase for future TanStack DB migration:
- All entities have `id` fields required for TanStack DB's `getKey` function
- Query keys match future `queryCollectionOptions` keys
- Follows patterns in existing `src/db-collections/` and `src/hooks/demo.useChat.ts`

## Technical Context

**Language/Version**: TypeScript 5.7+, React 19  
**Primary Dependencies**: TanStack Start, TanStack Query, TanStack Router, react-globe.gl, satellite.js, three.js, lucide-react  
**Storage**: N/A (all data fetched from external APIs)  
**Testing**: Vitest (existing in ephemeris)  
**Target Platform**: Web (modern browsers: Chrome, Firefox, Safari, Edge), responsive down to 375px  
**Project Type**: Web application (TanStack Start fullstack)  
**Performance Goals**: Globe interactive within 3s, position updates display within 1s of fetch  
**Constraints**: No breaking changes to existing ephemeris functionality, Tailwind v4 syntax required  
**Scale/Scope**: 3 nested routes under `/iss`, ~15 components, 5 utility modules

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Component Architecture ✅
- **Functional Components Only**: All migrated components are functional with hooks
- **Single Responsibility**: Components split by purpose (StatsPanel, MatrixText, CrewCard, etc.)
- **Composition Over Configuration**: Complex UIs built from small focused components
- **Colocation**: Components in `src/routes/iss/-components/`, co-located with routes
- **Naming Clarity**: Component names describe what they render (StatsPanel, FlyoverControl)
- **Props Interface**: All props typed with TypeScript interfaces in `contracts/api-interfaces.ts`

### II. Data Flow & State Management ✅
- **TanStack Query for Server State**: All API data fetched via TanStack Query hooks
- **Query Key Conventions**: Keys follow `[entity, ...identifiers]` pattern (e.g., `['iss', 'position', 'current']`)
- **TanStack Store**: Not required for this feature; local state via `useState` sufficient
- **URL as State**: Routes handle view state (`/iss`, `/iss/map`, `/iss/crew`)
- **Centralized Data Fetching**: Components fetch own data via `useQuery(issQueries.xxx())`

### III. Routing & Navigation ✅
- **File-Based Routing**: Routes in `src/routes/iss/` following TanStack Start convention
- **Route Loaders**: Evaluated - not used for this feature. **Justification**: ISS position data updates every 5 seconds and is not "critical data required before render" per constitution intent. The globe visualization benefits from showing a loading state while initial data fetches, rather than blocking navigation. TanStack Query's `staleTime: 0` ensures fresh data on each visit without loader overhead.
- **Type-Safe Links**: All navigation uses TanStack Router `Link` component
- **Server Functions**: API calls are client-side; no server functions needed for external APIs
- **Layout Components**: `ISSLayout.tsx` provides shared Matrix theme wrapper

### IV. Performance Optimization ✅
- **Memoization with Purpose**: Apply only if profiling shows re-render issues
- **Code Splitting**: Globe component can use `React.lazy()` due to large three.js bundle
- **Avoid Premature Optimization**: Performance targets defined (3s interactive, 1s updates)
- **Effect Cleanup**: All subscriptions (audio, geolocation) will include cleanup functions

### V. Code Quality & Testing ✅
- **TypeScript Strict Mode**: All types defined in `contracts/api-interfaces.ts`
- **Biome for Linting/Formatting**: Existing ephemeris configuration applies
- **Component Tests**: StatsPanel, MatrixText SHOULD have interaction tests
- **Integration Tests**: Full ISS tracker flow SHOULD be tested
- **Vitest as Test Runner**: Using existing ephemeris Vitest setup

### VI. Observability & Error Handling ✅
- **Sentry Integration**: API calls wrapped with `Sentry.startSpan` per `.cursorrules`
- **Instrumented Server Functions**: External fetches (ISS position, TLE, crew) instrumented
- **Error Boundaries**: ISSLayout SHOULD include error boundary for globe/API failures
- **Graceful Degradation**: Fallback APIs defined (WTIA → Open Notify, CelesTrak → ARISS → hardcoded TLE)

**Status**: PASSED - All 6 constitutional principles addressed. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-iss-tracker-migration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-interfaces.ts
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── routes/
│   └── iss/
│       ├── index.tsx          # 3D Globe view (main dashboard)
│       ├── map.tsx            # 2D Map view
│       ├── crew.tsx           # Crew manifest view
│       └── -components/       # ISS-specific components (route-scoped)
│           ├── StatsPanel.tsx
│           ├── MatrixText.tsx
│           ├── FlyoverControl.tsx
│           ├── OrbitalSolver.tsx
│           ├── CrewCard.tsx
│           ├── ScanlineOverlay.tsx  # CRT scanline effect overlay
│           └── ISSLayout.tsx  # Shared layout with Matrix theme
├── lib/
│   └── iss/
│       ├── api.ts             # API fetching with Sentry spans
│       ├── queries.ts         # TanStack Query definitions (DB-ready)
│       ├── audio.ts           # Terminal audio engine
│       ├── orbital.ts         # Orbital calculation utilities
│       └── types.ts           # ISS-specific type definitions
└── styles.css                 # Extended with ISS Matrix theme variables
```

**Structure Decision**: Using TanStack Start's file-based routing with nested routes under `/iss`. Components are co-located with routes in a `-components` folder (dash prefix is TanStack convention for non-route files). Shared utilities go in `src/lib/iss/` to keep them separate from existing ephemeris code.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | - | - |

No complexity violations identified. The migration follows existing patterns in both projects.
