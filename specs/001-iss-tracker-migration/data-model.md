# Data Model: ISS Tracker Migration

**Feature**: 001-iss-tracker-migration  
**Created**: December 13, 2025

## Overview

The ISS Tracker does not use a database **in this phase**. All data is fetched from external APIs and held in client-side state via TanStack Query. This document defines the data structures and their relationships.

> **Future Direction**: The architecture is designed to migrate to TanStack DB for persistence. All API data flows through TanStack Query with well-defined query keys, making the transition to a local-first persistence layer straightforward.

---

## Core Entities

### 1. ISSPosition

Real-time position and telemetry data for the International Space Station.

```typescript
interface ISSPosition {
  id: string;            // Unique ID for TanStack DB (timestamp-based)
  latitude: number;      // -90 to 90 degrees
  longitude: number;     // -180 to 180 degrees
  timestamp: number;     // Unix timestamp (seconds)
  altitude: number;      // Kilometers above Earth's surface
  velocity: number;      // Kilometers per hour
  visibility: string;    // "daylight" | "eclipsed" | "orbiting"
}
```

**ID Generation**: `id = timestamp.toString()` (unique per fetch, enables history)

**Zod Schema** (for future TanStack DB):
```typescript
const ISSPositionSchema = z.object({
  id: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timestamp: z.number().positive(),
  altitude: z.number().positive(),
  velocity: z.number().positive(),
  visibility: z.string(),
})
```

**Source**: Primary: Where The ISS At API, Fallback: Open Notify API via proxy

**Validation Rules**:
- `latitude` must be between -90 and 90
- `longitude` must be between -180 and 180
- `timestamp` must be a positive integer
- `altitude` typically ~400-420 km
- `velocity` typically ~27,500-28,000 km/h

---

### 2. TLEData

Two-Line Element set for orbital calculations.

```typescript
type TLEData = [string, string];  // [line1, line2]
```

**Source**: Primary: CelesTrak, Fallback: ARISS, Final fallback: Hardcoded

**Format**:
- Line 1: Starts with `1 25544U` (ISS catalog number)
- Line 2: Starts with `2 25544`

**Example**:
```
1 25544U 98067A   24140.59865741  .00016717  00000+0  30076-3 0  9995
2 25544  51.6396 235.1195 0005470 216.5982 256.4024 15.49818898442371
```

---

### 3. Astronaut

Crew member information for ISS personnel.

```typescript
interface Astronaut {
  id: string;             // Unique ID for TanStack DB (slugified name)
  name: string;           // Full name
  craft: string;          // "ISS" (filtered)
  image?: string;         // Wikipedia image URL
  role?: string;          // "Commander" | "Pilot" | "Flight Engineer" | "Mission Specialist"
  agency?: string;        // "NASA" | "Roscosmos" | "ESA" | "JAXA" | "CSA"
  launchDate?: string;    // ISO date string (YYYY-MM-DD)
  endDate?: string;       // ISO date string (estimated return)
}
```

**ID Generation**: `id = slugify(name)` e.g., `"sunita-williams"`

**Zod Schema** (for future TanStack DB):
```typescript
const AstronautSchema = z.object({
  id: z.string(),
  name: z.string(),
  craft: z.string(),
  image: z.string().url().optional(),
  role: z.string().optional(),
  agency: z.string().optional(),
  launchDate: z.string().optional(),
  endDate: z.string().optional(),
})
```

**Source**: Open Notify API (basic), enriched with local mission database

**Validation Rules**:
- `id` and `name` are required
- `craft` must equal "ISS" for display
- Dates should be valid ISO 8601 format when present

---

### 4. CrewData

Aggregated crew response from API.

```typescript
interface CrewData {
  message: string;        // "success" | "error"
  number: number;         // Count of crew members
  people: Astronaut[];    // Array of astronauts (filtered to ISS only)
}
```

---

### 5. LatLng

Simple geographic coordinate pair.

```typescript
interface LatLng {
  lat: number;   // Latitude in degrees
  lng: number;   // Longitude in degrees
}
```

**Used For**: User location, orbital path points

---

### 6. PassPrediction

Next visible ISS flyover for a given observer location.

```typescript
interface PassPrediction {
  id: string;                                   // Unique ID for TanStack DB (from startTime)
  startTime: Date;                              // When pass begins
  endTime: Date;                                // When pass ends
  maxElevation: number;                         // Peak elevation in degrees
  duration: number;                             // Duration in minutes
  path: { lat: number; lng: number; alt: number }[];  // Flyover arc coordinates
}
```

**ID Generation**: `id = generateEntityId.pass(startTime)` → `pass-${startTime.getTime()}`

**Calculation**: Generated client-side using satellite.js from TLE data

**Validation Rules**:
- `maxElevation` must be > 10° for visibility
- `duration` typically 2-6 minutes
- `path` array should have sufficient points for smooth arc display

---

### 7. OrbitalParameters

Keplerian orbital elements derived from TLE.

```typescript
interface OrbitalParameters {
  inclination: number;    // Degrees (ISS: ~51.6°)
  eccentricity: number;   // Dimensionless (~0.0005)
  meanMotion: number;     // Revolutions per day (~15.5)
  period: number;         // Minutes per orbit (~92)
  apogee: number;         // Km above Earth (highest point)
  perigee: number;        // Km above Earth (lowest point)
}
```

---

## State Management

### TanStack Query Cache Structure

```typescript
// Query Keys (aligned with research.md and contracts/api-interfaces.ts)
['iss', 'position', 'current']  // ISSPosition - refetches every 5s
['iss', 'tle']                  // TLEData - stale after 1 hour
['iss', 'crew']                 // CrewData - stale after 1 hour
```

### Location Context State

```typescript
interface LocationContextState {
  userLocation: LatLng | null;           // From geolocation or manual input
  nextPass: PassPrediction | null;       // Calculated from TLE + location
  isPredicting: boolean;                 // Loading state for pass calculation
  error: string | null;                  // Geolocation error message
}
```

---

## Entity Relationships

```
┌─────────────────┐
│   ISSPosition   │──── Real-time position displayed on globe/map
└─────────────────┘

┌─────────────────┐
│     TLEData     │──┬─ Used to calculate orbital paths (past/future)
└─────────────────┘  │
                     ├─ Used to derive OrbitalParameters
                     │
                     └─ Combined with LatLng to predict PassPrediction

┌─────────────────┐
│    CrewData     │──── Contains array of Astronaut entities
└─────────────────┘

┌─────────────────┐
│     LatLng      │──── User's observer location (for pass prediction)
└─────────────────┘
```

---

## Local Data: Mission Database

The application includes a local lookup table to enrich crew data with images, roles, and mission dates. This is necessary because the Open Notify API only provides names.

```typescript
const MISSION_DB: Record<string, MissionProfile> = {
  "Sunita Williams": { 
    start: "2024-06-05", 
    role: "Commander", 
    agency: "NASA", 
    image: "https://..." 
  },
  // ... additional entries
};
```

**Update Strategy**: Manual updates when crew changes (approximately every 3-6 months)

---

## Computed/Derived Data

| Derived Value | Source | Computation |
|---------------|--------|-------------|
| Orbital paths | TLEData | `satellite.js` propagation over time range |
| Pass prediction | TLEData + LatLng | `satellite.js` elevation angle calculation |
| Orbital parameters | TLEData | `satellite.js` Keplerian element extraction |
| Time in orbit | Astronaut.launchDate | `Date.now() - launchDate` |
| Mission progress | Astronaut dates | `(now - start) / (end - start) * 100` |

---

## Future: TanStack DB Migration

This section documents the planned persistence layer for future implementation. The architecture follows patterns already established in ephemeris (`src/db-collections/`, `src/hooks/demo.useChat.ts`).

### Planned Collections

| Collection | Query Key | Entity | getKey | Sync Strategy |
|------------|-----------|--------|--------|---------------|
| `issPositionsCollection` | `['iss', 'positions']` | `ISSPosition` | `(p) => p.id` | Background sync every 5s, keep last 24h |
| `issTleCollection` | `['iss', 'tle']` | `TLERecord` | `(t) => t.id` | Sync hourly, keep last 7 days |
| `issCrewCollection` | `['iss', 'crew']` | `Astronaut` | `(a) => a.id` | Sync hourly, full replacement |
| `issPassHistoryCollection` | `['iss', 'passes']` | `PassPrediction` | `(p) => p.id` | Local only |

### Collection Implementation Pattern

```typescript
// src/db-collections/iss.ts (future)
import { createCollection } from '@tanstack/db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { z } from 'zod'
import { queryClient } from '@/integrations/tanstack-query/root-provider'
import { fetchCrewData } from '@/lib/iss/api'

const AstronautSchema = z.object({
  id: z.string(),
  name: z.string(),
  craft: z.string(),
  image: z.string().optional(),
  role: z.string().optional(),
  agency: z.string().optional(),
  launchDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const issCrewCollection = createCollection(
  queryCollectionOptions({
    queryKey: ['iss', 'crew'],  // Same key used in TanStack Query!
    queryFn: fetchCrewData,     // Same function used in TanStack Query!
    queryClient,
    getKey: (astronaut) => astronaut.id,
    schema: AstronautSchema,
  })
)
```

### Component Migration Pattern

```typescript
// Phase 1: TanStack Query (current implementation)
function CrewList() {
  const { data: crew } = useQuery(issQueries.crew())
  return crew?.map(a => <CrewCard key={a.id} astronaut={a} />)
}

// Phase 2: TanStack DB (future implementation)
function CrewList() {
  const { data: crew } = useLiveQuery((q) =>
    q.from({ a: issCrewCollection }).select(({ a }) => ({ ...a }))
  )
  return crew?.map(a => <CrewCard key={a.id} astronaut={a} />)
}
```

### Migration Benefits

1. **Offline Support**: View last known ISS position when offline
2. **Historical Data**: Track ISS position history, view past flyovers
3. **Reduced API Calls**: Sync in background, serve from local DB
4. **Cross-Tab Sync**: TanStack DB handles multi-tab state automatically
5. **Optimistic Updates**: Instant UI feedback with automatic rollback

### Out of Scope for Current Phase

- Collection schema creation (`src/db-collections/iss.ts`)
- Background sync workers
- Offline indicators in UI
- Historical data visualization
- `useLiveQuery` component refactoring
