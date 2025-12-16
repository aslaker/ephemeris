# Implementation Plan: Local-First Data Storage

**Branch**: `004-tanstack-db-storage` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-tanstack-db-storage/spec.md`

## Summary

Implement local-first ISS data persistence using a simple approach:
- **Regular TanStack Query** (`queryOptions`) for fetching with `refetchInterval`
- **Dexie** (via `tanstack-dexie-db-collection`) for IndexedDB persistence as a side effect

When TanStack Query fetches data, a side effect in the `queryFn` persists to IndexedDB. On app reload, a custom hook loads cached data instantly from Dexie while TanStack Query refreshes in the background. Position gaps use visual interpolation (≤24h) or orbital calculations (>24h).

**Note**: `@tanstack/query-db-collection` is NOT needed - it's designed for two-way sync with optimistic mutations. This is read-only data.

## Technical Context

**Language/Version**: TypeScript 5.7.2, React 19.2.0  
**Primary Dependencies**: TanStack Query 5.66.5, Dexie (via tanstack-dexie-db-collection)  
**Storage**: IndexedDB via Dexie  
**Testing**: Vitest with React Testing Library  
**Target Platform**: Web (Cloudflare Workers deployment, client-side IndexedDB)  
**Project Type**: Web application (TanStack Start)  
**Performance Goals**: <100ms cached data display, 60fps position animations  
**Constraints**: Cloudflare Workers prohibit async I/O in global scope (lazy initialization required)  
**Scale/Scope**: 30+ days position history, ~5MB IndexedDB storage

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance | Notes |
|-----------|------------|-------|
| **I. Component Architecture** | ✅ Pass | New components will be functional, single responsibility |
| **II. Data Flow** | ✅ Pass | Using TanStack Query for server state + TanStack DB for persistent client cache |
| **III. Routing** | ✅ Pass | "Initialize Uplink" page follows file-based routing conventions |
| **IV. Performance** | ✅ Pass | IndexedDB for instant loads, animation transitions for smooth UX |
| **V. Code Quality** | ✅ Pass | TypeScript strict mode, Biome checks, Vitest tests |
| **VI. Observability** | ✅ Pass | Sentry integration for error tracking, background refresh failures |

**Gate Status**: PASSED - No violations, proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/004-tanstack-db-storage/
├── plan.md              # This file
├── research.md          # Phase 0 output - IndexedDB limits, TanStack DB patterns
├── data-model.md        # Phase 1 output - ISS data collection schemas
├── quickstart.md        # Phase 1 output - Implementation getting started
├── contracts/           # Phase 1 output - API interfaces
│   └── api-interfaces.ts
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── iss/
│       ├── types.ts          # Existing types (already has id fields)
│       ├── api.ts            # Existing API layer
│       ├── queries.ts        # MODIFY: add Dexie persistence side effect in queryFn
│       ├── orbital.ts        # Existing orbital calculations
│       ├── db.ts             # NEW: Dexie database setup and collections
│       └── storage.ts        # NEW: Retention policy, cleanup, cache loading helpers
├── hooks/
│   └── iss/
│       └── useISSData.ts     # NEW: Hook that loads from Dexie first, then Query
├── routes/
│   └── iss/
│       └── index.tsx         # MODIFY: use new hook for cache-first loading
│       └── crew.tsx          # MODIFY: use new hook for cache-first loading
└── db-collections/
    └── index.ts              # MODIFY: remove demo messagesCollection (cleanup task)
```

**Structure Decision**: Simple extension of existing ISS tracker. The key integration is adding Dexie persistence as a side effect in `queries.ts` queryFn, plus a custom hook that checks Dexie on mount. **No new routes needed** - existing "ESTABLISHING UPLINK" loading state in StatsPanel serves as the first-visit experience, fulfilling the spirit of FR-027-029 without requiring a separate Initialize page.

**New Dependency Required**:
```bash
npm install tanstack-dexie-db-collection
# or just use dexie directly:
npm install dexie
```

## Complexity Tracking

> No constitution violations requiring justification.

---

## Phase 1 Constitution Re-Check

*Post-design verification that all decisions align with constitution principles.*

| Principle | Compliance | Design Decision |
|-----------|------------|-----------------|
| **I. Component Architecture** | ✅ Pass | Initialize page is single-responsibility functional component |
| **II. Data Flow** | ✅ Pass | TanStack Query + TanStack DB integration follows prescribed patterns |
| **III. Routing** | ✅ Pass | File-based `/iss/initialize.tsx` route, type-safe navigation |
| **IV. Performance** | ✅ Pass | Lazy collection init, retention cleanup, memoized queries |
| **V. Code Quality** | ✅ Pass | Zod schemas, TypeScript strict mode, testable interfaces |
| **VI. Observability** | ✅ Pass | Error handling with Sentry integration in API layer |

**Post-Design Gate Status**: PASSED - Ready for task breakdown.

---

## Generated Artifacts

| Artifact | Location | Description |
|----------|----------|-------------|
| Implementation Plan | `specs/004-tanstack-db-storage/plan.md` | This document |
| Research | `specs/004-tanstack-db-storage/research.md` | IndexedDB limits, TanStack DB patterns, gap filling strategy |
| Data Model | `specs/004-tanstack-db-storage/data-model.md` | Entity schemas, relationships, retention policies |
| API Contracts | `specs/004-tanstack-db-storage/contracts/api-interfaces.ts` | TypeScript interfaces for storage layer |
| Quickstart | `specs/004-tanstack-db-storage/quickstart.md` | Implementation getting started guide |
| Agent Context | `.cursor/rules/specify-rules.mdc` | Updated with TanStack DB tech stack |

---

## Next Steps

Run `/speckit.tasks` to generate detailed implementation tasks based on this plan.
