# Data Model: AI Pass Briefing

**Feature Branch**: `006-ai-pass-briefing`  
**Date**: 2024-12-17  
**Status**: Complete

## Overview

This document defines the data entities, their relationships, validation rules, and state transitions for the AI Pass Briefing feature.

---

## Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  UserLocation   │────▶│   PassPrediction │────▶│   PassBriefing  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       ▼                       │
        │              ┌─────────────────┐              │
        └─────────────▶│WeatherConditions│◀─────────────┘
                       └─────────────────┘
```

**Relationships**:
- UserLocation → PassPrediction: 1-to-many (one location generates multiple pass predictions)
- PassPrediction → PassBriefing: 1-to-1 (each pass can have one briefing)
- UserLocation → WeatherConditions: 1-to-many (weather fetched for user location)
- PassBriefing references WeatherConditions: Optional enhancement to briefing content

---

## Entities

### 1. UserLocation

**Purpose**: Persisted observer location for pass calculations and weather lookups.

**Storage**: TanStack Store (memory) + localStorage (persistence)

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| id | string | Yes | Unique identifier | Auto-generated UUID |
| coordinates | object | Yes | Geographic position | Valid lat/lng |
| coordinates.lat | number | Yes | Latitude | -90 to 90 |
| coordinates.lng | number | Yes | Longitude | -180 to 180 |
| displayName | string | No | Human-readable location name | Max 100 chars |
| source | enum | Yes | How location was obtained | 'geolocation' \| 'manual' \| 'search' |
| lastUpdated | number | Yes | Unix timestamp of last update | Positive integer |

**Zod Schema**:
```typescript
const UserLocationSchema = z.object({
  id: z.string().uuid(),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  displayName: z.string().max(100).nullable(),
  source: z.enum(['geolocation', 'manual', 'search']),
  lastUpdated: z.number().positive(),
});
```

---

### 2. PassPrediction

**Purpose**: Predicted ISS visibility window for observer location.

**Storage**: TanStack Query cache (derived from orbital calculations)

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| id | string | Yes | Unique identifier | 'pass-{startTime.getTime()}' |
| startTime | Date | Yes | When ISS rises above 10° | Future date |
| endTime | Date | Yes | When ISS drops below 10° | After startTime |
| maxElevation | number | Yes | Peak elevation angle | 10 to 90 degrees |
| duration | number | Yes | Pass duration in minutes | Positive, derived |
| path | OrbitalPoint[] | Yes | Trajectory points | Min 2 points |
| quality | enum | Yes | Viewing quality rating | 'excellent' \| 'good' \| 'fair' \| 'poor' |

**Quality Rating Derivation**:
- excellent: maxElevation >= 60°
- good: maxElevation >= 40°
- fair: maxElevation >= 25°
- poor: maxElevation < 25°

**Zod Schema**:
```typescript
const PassPredictionSchema = z.object({
  id: z.string().startsWith('pass-'),
  startTime: z.date(),
  endTime: z.date(),
  maxElevation: z.number().min(10).max(90),
  duration: z.number().positive(),
  path: z.array(OrbitalPointSchema).min(2),
  quality: z.enum(['excellent', 'good', 'fair', 'poor']),
});
```

---

### 3. PassBriefing

**Purpose**: AI-generated narrative briefing for a specific pass.

**Storage**: TanStack DB Collection via `@tanstack/query-db-collection`

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| id | string | Yes | Same as PassPrediction.id | Match passId |
| passId | string | Yes | Reference to source pass | Valid pass ID |
| summary | string | Yes | One-line summary | Max 200 chars |
| narrative | string | Yes | Full briefing text | Max 2000 chars |
| viewingWindow | object | Yes | Best viewing time info | See sub-fields |
| viewingWindow.optimalStart | Date | Yes | Best time to start watching | Within pass window |
| viewingWindow.description | string | Yes | Plain-English timing | Max 150 chars |
| elevation | object | Yes | Elevation details | See sub-fields |
| elevation.max | number | Yes | Maximum elevation degrees | 10-90 |
| elevation.direction | string | Yes | Cardinal direction at peak | e.g., "Northwest" |
| brightness | object | Yes | Visibility brightness info | See sub-fields |
| brightness.magnitude | number | No | Apparent magnitude | -4 to 2 |
| brightness.description | string | Yes | Comparison description | e.g., "Brighter than Venus" |
| conditions | object | No | Weather conditions if available | Optional |
| conditions.cloudCover | number | No | Cloud cover percentage | 0-100 |
| conditions.visibility | number | No | Visibility in km | Positive |
| conditions.recommendation | string | No | Weather-based advice | Max 200 chars |
| tips | string[] | Yes | Viewing tips array | 1-5 items |
| generatedAt | number | Yes | Generation timestamp | Unix timestamp |
| weatherIncluded | boolean | Yes | Whether weather was available | true/false |

**Zod Schema**:
```typescript
const PassBriefingSchema = z.object({
  id: z.string(),
  passId: z.string(),
  summary: z.string().max(200),
  narrative: z.string().max(2000),
  viewingWindow: z.object({
    optimalStart: z.date(),
    description: z.string().max(150),
  }),
  elevation: z.object({
    max: z.number().min(10).max(90),
    direction: z.string(),
  }),
  brightness: z.object({
    magnitude: z.number().min(-4).max(2).optional(),
    description: z.string(),
  }),
  conditions: z.object({
    cloudCover: z.number().min(0).max(100),
    visibility: z.number().positive(),
    recommendation: z.string().max(200),
  }).optional(),
  tips: z.array(z.string()).min(1).max(5),
  generatedAt: z.number().positive(),
  weatherIncluded: z.boolean(),
});
```

---

### 4. WeatherConditions

**Purpose**: Point-in-time weather data for observation location.

**Storage**: TanStack Query cache (short-lived, from API)

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| timestamp | Date | Yes | Weather data time | Within 24h of pass |
| cloudCover | number | Yes | Cloud cover percentage | 0-100 |
| visibility | number | Yes | Visibility in meters | Positive |
| isFavorable | boolean | Yes | Good viewing conditions | Derived |

**Favorability Derivation**:
- isFavorable = cloudCover < 50 && visibility > 10000

**Zod Schema**:
```typescript
const WeatherConditionsSchema = z.object({
  timestamp: z.date(),
  cloudCover: z.number().min(0).max(100),
  visibility: z.number().positive(),
  isFavorable: z.boolean(),
});
```

---

### 5. PassDateRange

**Purpose**: User-selected date range for pass listing.

**Storage**: URL search params (shareable state)

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| startDate | Date | Yes | Range start | Today or future |
| endDate | Date | Yes | Range end | Within 14 days of start |
| days | number | Yes | Duration in days | 1-14, derived |

**Zod Schema**:
```typescript
const PassDateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  days: z.number().min(1).max(14),
}).refine((data) => data.endDate > data.startDate, {
  message: "End date must be after start date",
});
```

---

## State Transitions

### PassBriefing Lifecycle

```
┌──────────────┐
│   NOT_EXIST  │ ─── User selects pass ───▶ ┌───────────────┐
└──────────────┘                            │   GENERATING  │
                                            └───────────────┘
                                                    │
                    ┌───────────────────────────────┼───────────────────────────────┐
                    │                               │                               │
                    ▼                               ▼                               ▼
            ┌───────────────┐             ┌───────────────┐             ┌───────────────┐
            │   GENERATED   │             │  GEN_NO_WEATHER│             │     ERROR     │
            │ (with weather)│             │ (weather N/A)  │             │  (AI failed)  │
            └───────────────┘             └───────────────┘             └───────────────┘
                    │                               │                               │
                    │                               │                               │
                    └───────────────┬───────────────┘                               │
                                    │                                               │
                                    ▼                                               │
                            ┌───────────────┐                                       │
                            │    CACHED     │ ◀─────────────────────────────────────┘
                            │ (in IndexedDB)│      (retry stores on success)
                            └───────────────┘
                                    │
                                    │ User clicks "Refresh"
                                    ▼
                            ┌───────────────┐
                            │  REFRESHING   │ ─── same flow as GENERATING
                            └───────────────┘
```

### State Descriptions

| State | Description | UI Behavior |
|-------|-------------|-------------|
| NOT_EXIST | No briefing generated yet | Show "Generate Briefing" button |
| GENERATING | AI generation in progress | Show loading spinner, disable button |
| GENERATED | Briefing ready with weather | Display full briefing card |
| GEN_NO_WEATHER | Briefing ready, no weather | Display briefing with weather unavailable notice |
| ERROR | Generation failed | Show error message with retry option |
| CACHED | Briefing stored in IndexedDB | Show briefing with "Refresh" option |
| REFRESHING | Regenerating existing briefing | Show loading, preserve old content |

---

## Storage Architecture

### TanStack DB Collection (Briefings)

Briefings use TanStack DB with `@tanstack/query-db-collection` for reactive, cached data:

```typescript
// src/lib/briefing/collection.ts
import { createCollection } from '@tanstack/react-db';
import { queryCollectionOptions } from '@tanstack/query-db-collection';

export const briefingsCollection = createCollection<PassBriefing>(
  queryCollectionOptions({
    getId: (briefing) => briefing.id,
    queryClient,
    // Server function integration
    queryKey: (passId: string) => ['briefing', passId],
    queryFn: async (params) => generateBriefing(params),
  })
);
```

**Why TanStack DB for Briefings**:
- Automatic sync with TanStack Query
- Reactive updates in UI components
- Optimistic mutations with rollback
- Aligns with TanStack-first architecture

### Dexie Database (Telemetry - Unchanged)

Existing ISS telemetry data remains in Dexie (no schema changes needed):

```typescript
// src/lib/iss/db.ts - NO CHANGES REQUIRED
this.version(1).stores({
  positions: "id, timestamp",
  crew: "id, fetchedAt",
  tle: "id, fetchedAt",
  events: "id, timestamp, type",
});
```

**Why Keep Dexie for Telemetry**:
- High-volume time-series data
- Complex range queries (timestamp-based)
- Existing cleanup and retention policies work well
- No need to migrate working code

### TanStack Store (Location) - No Context Required

User location uses TanStack Store with localStorage sync. **This eliminates the existing LocationContext** in ISSLayout.

```typescript
// src/lib/location/store.ts - Persistent shared state
export const locationStore = new Store<LocationState>(loadFromStorage());

// src/hooks/useLocation.ts - Geolocation + transient UI state (error, loading)
export function useLocation() { ... }

// src/hooks/useNextPass.ts - Derived from location + TLE
export function useNextPass() { ... }
```

**Why TanStack Store + Hooks (not Context)**:
- Store for persistent shared state (coordinates)
- Hooks for derived data (nextPass) and transient UI state (error, isRequesting)
- No provider wrapper needed - use hooks anywhere
- Granular subscriptions (only re-render what changed)
- App-wide sharing without prop drilling or context nesting

### Future: Unified Layer

The `tanstack-dexie-db-collection` community adapter can wrap existing Dexie tables in TanStack DB collections when agent features require unified data access. See research.md Section 7 for migration path.

---

## Validation Summary

All entities use Zod schemas for:
1. **Runtime validation** - Parse API responses and user input
2. **Type inference** - Generate TypeScript types from schemas
3. **Error messages** - Provide clear validation failure messages

```typescript
// Type inference pattern
type UserLocation = z.infer<typeof UserLocationSchema>;
type PassPrediction = z.infer<typeof PassPredictionSchema>;
type PassBriefing = z.infer<typeof PassBriefingSchema>;
type WeatherConditions = z.infer<typeof WeatherConditionsSchema>;
```
