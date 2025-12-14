# Research: ISS Tracker Migration

**Feature**: 001-iss-tracker-migration  
**Created**: December 13, 2025

## Research Summary

This document captures decisions made during the planning phase for migrating the ISS Tracker to ephemeris.

---

## 1. TanStack Start Routing Pattern

**Decision**: Use file-based nested routes under `src/routes/iss/`

**Rationale**: 
- TanStack Start uses file-based routing where each file in `routes/` becomes a route
- Nested routes are achieved through folder structure (`iss/index.tsx`, `iss/map.tsx`, `iss/crew.tsx`)
- This matches the existing ephemeris pattern (see `routes/demo/` folder)
- Route layout can be shared via an `iss/_layout.tsx` or by wrapping in a common component

**Alternatives Considered**:
- Single route with internal tabs: Rejected because spec requires distinct URLs (`/iss`, `/iss/map`, `/iss/crew`)
- Route group with `(iss)` folder: Not necessary; direct folder works

---

## 2. Tailwind v4 Compatibility

**Decision**: Add ISS Matrix theme colors using CSS custom properties in `:root` and `@theme inline` blocks

**Rationale**:
- Tailwind v4 uses `@theme inline` for custom theme values (seen in existing `styles.css`)
- Matrix theme requires custom colors: `--matrix-bg`, `--matrix-text`, `--matrix-dim`, `--matrix-alert`
- CSS animations (scanlines, CRT flicker, glitch) can be defined in `@keyframes` blocks
- Using CSS properties allows scoping the theme to the ISS section only

**Implementation**:
```css
/* ISS Matrix Theme */
.iss-theme {
  --matrix-bg: #0a0a0a;
  --matrix-text: #00ff41;
  --matrix-dim: #004d14;
  --matrix-alert: #ff3333;
}

@theme inline {
  --color-matrix-bg: var(--matrix-bg);
  --color-matrix-text: var(--matrix-text);
  --color-matrix-dim: var(--matrix-dim);
  --color-matrix-alert: var(--matrix-alert);
}
```

**Alternatives Considered**:
- Separate CSS file for ISS: Rejected to maintain single source of truth for Tailwind config
- Inline styles: Rejected for maintainability

---

## 3. Component Migration Strategy

**Decision**: Selective shadcn adoption - form inputs from shadcn, custom display components

**Rationale**:
- Spec explicitly states: "use shadcn for form inputs (Input, Button) with Matrix theme styling"
- Display components (StatsPanel, MatrixText, crew cards) must be "custom-built to preserve exact visual design"
- The existing ISS Tracker components are well-structured and can be adapted directly
- MatrixText animation effect is unique and not available in shadcn

**Components to Create**:
| Component | Source | Strategy |
|-----------|--------|----------|
| ISSLayout | New | Wrap routes with Matrix theme, header, footer |
| StatsPanel | Migrate | Direct port with Tailwind v4 classes |
| MatrixText | Migrate | Direct port (animation logic) |
| FlyoverControl | Migrate | Direct port, use shadcn Button for CTA |
| OrbitalSolver | Migrate | Direct port (modal with calculations) |
| CrewCard | Extract from Crew.tsx | Separate component for reuse |

---

## 4. Sentry Instrumentation Pattern

**Decision**: Wrap external API calls in `Sentry.startSpan` as specified in `.cursorrules`

**Rationale**:
- Ephemeris uses `@sentry/tanstackstart-react` (already configured in `router.tsx`)
- The `.cursorrules` file provides the exact pattern to follow
- Need to instrument: ISS position fetch, TLE fetch, crew data fetch

**Implementation Pattern**:
```typescript
import * as Sentry from '@sentry/tanstackstart-react'

export const fetchISSPosition = async (): Promise<ISSPosition> => {
  return Sentry.startSpan({ name: 'Fetching ISS Position' }, async () => {
    const response = await fetch(WTIA_API);
    // ... rest of implementation
  });
};
```

---

## 5. External Dependencies

**Decision**: Add three.js, react-globe.gl, satellite.js as dependencies

**Rationale**:
- These are already used in the source ISS Tracker project
- react-globe.gl requires three.js as a peer dependency
- satellite.js is needed for TLE parsing and orbital calculations
- All are mature, well-maintained libraries

**Package Additions**:
```json
{
  "dependencies": {
    "three": "0.170.0",
    "react-globe.gl": "^2.37.0", 
    "satellite.js": "5.0.0"
  }
}
```

---

## 6. Web Audio API Pattern

**Decision**: Migrate TerminalAudio class with lazy initialization pattern

**Rationale**:
- Web Audio API requires user gesture to initialize (browser security)
- The existing pattern handles this with `resume()` method on first interaction
- Mute state persisted to localStorage
- Sound effects enhance the Matrix terminal experience

**Key Behaviors to Preserve**:
- Audio context created lazily on first init
- Startup sound plays on "INITIALIZE_UPLINK" click
- Hover/click sounds on interactive elements
- Data update sound when position refreshes

---

## 7. react-globe.gl Integration

**Decision**: Use Globe component with custom point, ring, and path layers

**Rationale**:
- react-globe.gl provides a React wrapper for three-globe
- It supports the required features: pointsData, ringsData, pathsData
- Performance is acceptable for real-time 5-second updates
- The library handles WebGL context and camera controls

**Configuration Needed**:
- Globe background: `//unpkg.com/three-globe/example/img/night-sky.png`
- Earth texture: `//unpkg.com/three-globe/example/img/earth-night.jpg`
- Atmosphere color: Matrix green (#00FF41)
- Custom point styling for ISS marker and user location

---

## 8. Data Fetching with TanStack Query (TanStack DB Ready)

**Decision**: Wrap ALL external API calls with TanStack Query; structure data for future `queryCollectionOptions` migration

**Rationale**:
- TanStack Query is already configured in ephemeris (`@tanstack/react-query`)
- `@tanstack/query-db-collection` is already installed in ephemeris
- TanStack DB's `queryCollectionOptions` uses identical `queryKey` and `queryFn` interface
- Existing patterns in `src/db-collections/` and `src/hooks/demo.useChat.ts` demonstrate the target architecture

**Critical Requirements for TanStack DB Compatibility**:

1. **Every entity needs a unique `id` field** - Required for `getKey: (item) => item.id`
2. **Collection queries must return arrays** - TanStack DB collections expect `queryFn` to return `T[]`
3. **Singleton data (like current position) uses different pattern** - Not a collection, use `useLiveQuery` with single-item lookup
4. **Zod schemas for validation** - Match existing ephemeris pattern in `src/db-collections/index.ts`

**Architecture for TanStack DB Readiness**:

```typescript
// src/lib/iss/queries.ts
// Phase 1: TanStack Query only (current implementation)

export const issQueries = {
  // COLLECTION: Returns array of positions (for history)
  positionHistory: () => ({
    queryKey: ['iss', 'positions'] as const,
    queryFn: fetchISSPositionHistory,  // Returns ISSPosition[]
    refetchInterval: 5000,
  }),
  
  // SINGLETON: Current position (latest only)
  currentPosition: () => ({
    queryKey: ['iss', 'position', 'current'] as const,
    queryFn: fetchISSPosition,  // Returns ISSPosition
    refetchInterval: 5000,
  }),
  
  // COLLECTION: TLE data with timestamps
  tle: () => ({
    queryKey: ['iss', 'tle'] as const,
    queryFn: fetchTLE,
    staleTime: 1000 * 60 * 60,
  }),
  
  // COLLECTION: Crew members
  crew: () => ({
    queryKey: ['iss', 'crew'] as const,
    queryFn: fetchCrewData,  // Returns Astronaut[]
    staleTime: 1000 * 60 * 60,
  }),
};
```

```typescript
// Future Phase 2: TanStack DB migration
// src/db-collections/iss.ts

import { createCollection } from '@tanstack/db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { z } from 'zod'

const ISSPositionSchema = z.object({
  id: z.string(),  // Generated: `${timestamp}` or UUID
  latitude: z.number(),
  longitude: z.number(),
  timestamp: z.number(),
  altitude: z.number(),
  velocity: z.number(),
  visibility: z.string(),
})

export const issPositionsCollection = createCollection(
  queryCollectionOptions({
    queryKey: ['iss', 'positions'],  // Same key as Phase 1!
    queryFn: fetchISSPositionHistory,
    queryClient,
    getKey: (position) => position.id,
    schema: ISSPositionSchema,
  })
)

// Components stay the same - just swap useQuery for useLiveQuery
```

**Query Configuration**:
| Query Key | Returns | Refetch | Future Collection |
|-----------|---------|---------|-------------------|
| `['iss', 'position', 'current']` | `ISSPosition` | 5s | Derived from `issPositionsCollection` |
| `['iss', 'positions']` | `ISSPosition[]` | 5s | `issPositionsCollection` |
| `['iss', 'tle']` | `TLEData` | 1 hour | `issTleCollection` |
| `['iss', 'crew']` | `Astronaut[]` | 1 hour | `issCrewCollection` |

**ID Strategy for Entities**:
| Entity | ID Field | Generation Strategy |
|--------|----------|---------------------|
| ISSPosition | `id: string` | `timestamp.toString()` or UUID |
| Astronaut | `id: string` | Slugified name: `sunita-williams` |
| TLEData | `id: string` | `tle-${fetchTimestamp}` |
| PassPrediction | `id: string` | `pass-${startTime.getTime()}` |

---

## 9. Share Tech Mono Font

**Decision**: Load from Google Fonts in the ISS layout component

**Rationale**:
- The Matrix terminal aesthetic uses Share Tech Mono font
- Loading via Google Fonts is simple and reliable
- Font can be scoped to `.iss-theme` elements only

**Implementation**:
```html
<link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" rel="stylesheet">
```

Apply via CSS:
```css
.iss-theme {
  font-family: 'Share Tech Mono', monospace;
}
```

---

## 10. LocationContext Migration

**Decision**: Create a React Context for user location and pass prediction state

**Rationale**:
- Multiple components need access to: userLocation, nextPass, isPredicting, error
- Context avoids prop drilling across Dashboard, Map, and FlyoverControl
- The existing implementation is clean and can be migrated directly
- Works with TanStack Query for TLE data dependency

---

## Open Questions (Resolved)

All NEEDS CLARIFICATION items from the initial technical context have been resolved through analysis of both codebases.
