# Implementation Plan: Fix Crew Data Rendering Regression

**Branch**: `003-fix-crew-render` | **Date**: 2024-12-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-fix-crew-render/spec.md`

## Summary

Restore crew data rendering functionality by fixing the API fetch layer. The regression is caused by the allorigins.win proxy returning 502 errors, which triggers the silent error handler returning an empty array. The fix will implement a robust fallback chain that attempts direct API access before proxy, and surfaces errors properly to the UI.

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: TanStack Start (React 19), TanStack Query, TanStack Router  
**Storage**: N/A (external API data only, local mission database for enrichment)  
**Testing**: Vitest with React Testing Library  
**Target Platform**: Web (Cloudflare Workers deployment)  
**Project Type**: Web application (single source directory)  
**Performance Goals**: Crew manifest loads within 3 seconds  
**Constraints**: CORS restrictions require proxy for Open Notify API in browser  
**Scale/Scope**: Single page with ~12 crew member cards

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| TanStack Query for Server State | ✅ PASS | Already using `issQueries.crew()` with queryOptions |
| Error Boundaries | ⚠️ NEEDS FIX | Error state exists but hidden by silent catch |
| Graceful Degradation | ⚠️ NEEDS FIX | Currently fails silently - should show error UI |
| Sentry Integration | ✅ PASS | `fetchCrewData` wrapped in `Sentry.startSpan` |
| TypeScript Strict Mode | ✅ PASS | Types defined in `types.ts` |
| Functional Components | ✅ PASS | `CrewPage` and `CrewManifest` are functional |

**Pre-Design Gate**: PASS (no blocking violations)

### Post-Design Re-Check

| Principle | Status | Evidence |
|-----------|--------|----------|
| TanStack Query for Server State | ✅ PASS | Using `issQueries.crew()` - no changes needed |
| Error Boundaries | ✅ PASS | Server function will throw, enabling error state |
| Graceful Degradation | ✅ PASS | Error state shows "CREW_DATA_UNAVAILABLE" |
| Sentry Integration | ✅ PASS | Retained `Sentry.startSpan` wrapper |
| Server Functions Instrumented | ✅ PASS | Existing Sentry span covers fetch |
| TypeScript Strict Mode | ✅ PASS | No type changes required |

**Post-Design Gate**: PASS (all violations addressed by design)

## Project Structure

### Documentation (this feature)

```text
specs/003-fix-crew-render/
├── plan.md              # This file
├── research.md          # Proxy alternatives and fallback strategies
├── data-model.md        # Existing data model documentation
├── quickstart.md        # Quick fix guide
├── contracts/           # API interface contracts
│   └── api-interfaces.ts
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Implementation tasks (created by /speckit.tasks)
```

### Source Code (affected files)

```text
src/
├── lib/iss/
│   ├── api.ts           # PRIMARY - fetchCrewData needs fallback chain
│   └── types.ts         # May need error type additions
├── routes/iss/
│   ├── crew.tsx         # Error state already implemented
│   └── -components/
│       └── CrewCard.tsx # No changes expected
```

**Structure Decision**: This is a bug fix affecting the existing TanStack Start web application. Changes are isolated to the API layer (`src/lib/iss/api.ts`), with potential minor updates to error handling in the route component.

## Complexity Tracking

> No constitution violations requiring justification. Fix maintains existing architecture.
