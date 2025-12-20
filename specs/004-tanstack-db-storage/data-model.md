# Data Model: Local-First Data Storage

**Feature**: 004-tanstack-db-storage  
**Created**: 2025-01-27

## Overview

This document defines the data entities, schemas, and relationships for the TanStack DB local-first storage implementation. All entities are designed for IndexedDB persistence via TanStack DB collections.

---

## Entity Definitions

### 1. ISSPosition

Represents a single ISS position measurement at a specific point in time.

**Schema**:
```typescript
import { z } from "zod";

export const ISSPositionSchema = z.object({
  /** Unique identifier (timestamp string) */
  id: z.string(),
  /** Latitude in degrees (-90 to 90) */
  latitude: z.number().min(-90).max(90),
  /** Longitude in degrees (-180 to 180) */
  longitude: z.number().min(-180).max(180),
  /** Unix timestamp in seconds */
  timestamp: z.number().positive(),
  /** Altitude above Earth's surface in kilometers */
  altitude: z.number().positive(),
  /** Orbital velocity in kilometers per hour */
  velocity: z.number().positive(),
  /** Current lighting condition or source indicator */
  visibility: z.string(),
});

export type ISSPosition = z.infer<typeof ISSPositionSchema>;
```

**Key Field**: `id` (timestamp as string)  
**Index Fields**: `timestamp`  
**Storage Estimate**: ~200 bytes per record  
**Retention**: 30 days rolling window

**Source Notes**:
- `visibility: "synthetic"` indicates record generated from orbital calculations
- `visibility: "daylight" | "eclipsed" | "orbiting"` from API responses

---

### 2. Astronaut

Represents an astronaut currently or previously aboard the ISS.

**Schema**:
```typescript
export const AstronautSchema = z.object({
  /** Unique identifier (slugified name) */
  id: z.string(),
  /** Full name of astronaut */
  name: z.string(),
  /** Spacecraft currently aboard */
  craft: z.string(),
  /** Wikipedia portrait URL */
  image: z.string().url().optional(),
  /** Mission role */
  role: z.string().optional(),
  /** Space agency affiliation */
  agency: z.string().optional(),
  /** Launch date ISO string (YYYY-MM-DD) */
  launchDate: z.string().optional(),
  /** Expected return date ISO string */
  endDate: z.string().optional(),
  /** Timestamp when record was fetched */
  fetchedAt: z.number().positive(),
});

export type Astronaut = z.infer<typeof AstronautSchema>;
```

**Key Field**: `id` (slugified name: `sunita-williams`)  
**Index Fields**: `fetchedAt`  
**Storage Estimate**: ~500 bytes per record  
**Retention**: Keep all (small dataset, ~10 records)

---

### 3. TLERecord

Represents Two-Line Element orbital data with fetch metadata.

**Schema**:
```typescript
export const TLERecordSchema = z.object({
  /** Unique identifier (tle-timestamp) */
  id: z.string(),
  /** First TLE line */
  line1: z.string(),
  /** Second TLE line */
  line2: z.string(),
  /** Unix timestamp when TLE was fetched */
  fetchedAt: z.number().positive(),
  /** Source of TLE data */
  source: z.enum(["celestrak", "ariss", "fallback"]),
});

export type TLERecord = z.infer<typeof TLERecordSchema>;
```

**Key Field**: `id` (`tle-${fetchedAt}`)  
**Index Fields**: `fetchedAt`  
**Storage Estimate**: ~300 bytes per record  
**Retention**: Keep last 7 records (1 week at hourly refresh)

---

### 4. StorageMetadata

System metadata for storage management and initialization state.

**Schema**:
```typescript
export const StorageMetadataSchema = z.object({
  /** Singleton key */
  id: z.literal("storage-meta"),
  /** Whether first-visit initialization is complete */
  initialized: z.boolean(),
  /** Timestamp of last successful data fetch */
  lastFetchAt: z.number().positive().optional(),
  /** Timestamp of last retention cleanup */
  lastCleanupAt: z.number().positive().optional(),
  /** Schema version for migrations */
  schemaVersion: z.number().positive(),
  /** Total position records count (approximate) */
  positionCount: z.number().nonnegative().optional(),
});

export type StorageMetadata = z.infer<typeof StorageMetadataSchema>;
```

**Key Field**: `id` (singleton: `"storage-meta"`)  
**Storage Estimate**: ~100 bytes  
**Purpose**: Track initialization state, cleanup timing, schema version

---

### 5. TimelineEvent (Foundation Only)

Represents a future event that can be associated with ISS position data. This is schema foundation only - no UI is implemented in this feature.

**Schema**:
```typescript
export const TimelineEventSchema = z.object({
  /** Unique identifier */
  id: z.string(),
  /** Event type */
  type: z.enum(['launch', 'docking', 'eva', 'crew_change', 'custom']),
  /** Unix timestamp of event */
  timestamp: z.number().positive(),
  /** Event title */
  title: z.string(),
  /** Optional description */
  description: z.string().optional(),
  /** Links to ISSPosition.id at closest timestamp */
  associatedPositionId: z.string().optional(),
  /** When this event was created/imported */
  createdAt: z.number().positive(),
});

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
```

**Key Field**: `id`  
**Index Fields**: `timestamp`, `type`  
**Storage Estimate**: ~300 bytes per record  
**Retention**: Keep all (manual management)

*Note: This is schema foundation only per FR-011. Event creation UI is out of scope for this feature.*

---

## Database Configuration

### Simple Dexie Setup

The implementation uses Dexie directly for IndexedDB persistence - no complex TanStack DB abstractions needed.

```typescript
// src/lib/iss/db.ts

import Dexie, { type EntityTable } from 'dexie';
import type { ISSPosition, Astronaut } from './types';

// Extended types for stored data
export interface StoredAstronaut extends Astronaut {
  fetchedAt: number;
}

export interface StoredTLE {
  id: string;
  line1: string;
  line2: string;
  fetchedAt: number;
  source: 'celestrak' | 'ariss' | 'fallback';
}

// Define the database with typed tables
const db = new Dexie('ephemeris-iss') as Dexie & {
  positions: EntityTable<ISSPosition, 'id'>;
  crew: EntityTable<StoredAstronaut, 'id'>;
  tle: EntityTable<StoredTLE, 'id'>;
};

// Schema version 1: Initial tables with indexes
db.version(1).stores({
  positions: 'id, timestamp',  // Primary key: id, Index: timestamp
  crew: 'id, fetchedAt',       // Primary key: id, Index: fetchedAt
  tle: 'id, fetchedAt',        // Primary key: id, Index: fetchedAt
});

export { db };
```

### Persistence in Query Functions

```typescript
// src/lib/iss/queries.ts

import { queryOptions } from "@tanstack/react-query";
import { fetchISSPosition, fetchCrewData, fetchTLE } from "./api";
import { db } from "./db";

export const issQueries = {
  currentPosition: () =>
    queryOptions({
      queryKey: ["iss", "position", "current"] as const,
      queryFn: async () => {
        const position = await fetchISSPosition();
        
        // Side effect: persist to Dexie
        if (typeof window !== "undefined") {
          await db.positions.put(position);
        }
        
        return position;
      },
      refetchInterval: 5000,
      staleTime: 0,
    }),

  crew: () =>
    queryOptions({
      queryKey: ["iss", "crew"] as const,
      queryFn: async () => {
        const crew = await fetchCrewData();
        
        if (typeof window !== "undefined") {
          const fetchedAt = Date.now();
          await db.crew.bulkPut(
            crew.map(a => ({ ...a, fetchedAt }))
          );
        }
        
        return crew;
      },
      staleTime: 1000 * 60 * 60,
    }),
};
```

### Cache Loading Helpers

```typescript
// src/lib/iss/db.ts (continued)

// Get latest position from cache
export async function getCachedPosition(): Promise<ISSPosition | undefined> {
  return db.positions.orderBy('timestamp').last();
}

// Get all cached crew
export async function getCachedCrew(): Promise<StoredAstronaut[]> {
  return db.crew.toArray();
}

// Get latest TLE
export async function getCachedTLE(): Promise<StoredTLE | undefined> {
  return db.tle.orderBy('fetchedAt').last();
}

// Get positions in time range (for history/scrubbing)
export async function getPositionsInRange(
  startTimestamp: number,
  endTimestamp: number
): Promise<ISSPosition[]> {
  return db.positions
    .where('timestamp')
    .between(startTimestamp, endTimestamp)
    .toArray();
}
```

---

## Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                       IndexedDB Storage                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐      ┌─────────────────┐                   │
│  │  iss-positions  │      │    iss-crew     │                   │
│  │  ───────────────│      │  ───────────────│                   │
│  │  id (PK)        │      │  id (PK)        │                   │
│  │  timestamp (IX) │      │  fetchedAt (IX) │                   │
│  │  latitude       │      │  name           │                   │
│  │  longitude      │      │  role           │                   │
│  │  altitude       │      │  agency         │                   │
│  │  velocity       │      │  image          │                   │
│  │  visibility     │      │  launchDate     │                   │
│  └────────┬────────┘      │  endDate        │                   │
│           │               └─────────────────┘                   │
│           │                                                      │
│           │ Uses TLE for                                         │
│           │ synthetic fill                                       │
│           ▼                                                      │
│  ┌─────────────────┐      ┌─────────────────┐                   │
│  │    iss-tle      │      │    iss-meta     │                   │
│  │  ───────────────│      │  ───────────────│                   │
│  │  id (PK)        │      │  id (PK)        │                   │
│  │  fetchedAt (IX) │      │  initialized    │                   │
│  │  line1          │      │  lastFetchAt    │                   │
│  │  line2          │      │  lastCleanupAt  │                   │
│  │  source         │      │  schemaVersion  │                   │
│  └─────────────────┘      │  positionCount  │                   │
│                           └─────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## State Transitions

### Position Record States

```
┌──────────────┐     API Response      ┌──────────────┐
│              │ ──────────────────►   │              │
│   (none)     │                       │    live      │
│              │ ◄──────────────────   │ visibility:  │
└──────────────┘     Retention         │ daylight/    │
                     Cleanup           │ eclipsed     │
                                       └──────┬───────┘
                                              │
                          Gap > 24h           │
                     Orbital Calculation      │
                              │               │
                              ▼               │
                       ┌──────────────┐       │
                       │  synthetic   │       │
                       │ visibility:  │       │
                       │ "synthetic"  │ ──────┘
                       └──────────────┘
```

### Initialization State Machine

```
┌────────────────┐
│ UNINITIALIZED  │
│ initialized:   │
│   false        │
└───────┬────────┘
        │
        │ User visits /iss
        │ StatsPanel shows "ESTABLISHING UPLINK"
        │ TanStack Query fetches data
        ▼
┌────────────────┐
│  INITIALIZING  │
│  Fetching      │
│  data via      │
│  TanStack Query│
└───────┬────────┘
        │
        │ Data fetched successfully
        │ Persisted to Dexie
        │ (automatic, no user action)
        ▼
┌────────────────┐
│  INITIALIZED   │
│  initialized:  │
│    true        │
│  Data in DB    │
└────────────────┘
```

---

## Validation Rules

### Position Data

| Field | Rule | Error Handling |
|-------|------|----------------|
| `id` | Non-empty string | Reject record |
| `latitude` | -90 ≤ value ≤ 90 | Reject record |
| `longitude` | -180 ≤ value ≤ 180 | Reject record |
| `timestamp` | Positive integer | Reject record |
| `altitude` | Positive number | Use default 417.5 |
| `velocity` | Positive number | Use default 27600 |

### Corruption Detection

```typescript
function validateAndClean<T>(
  data: unknown,
  schema: z.ZodType<T>
): T | null {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return result.data;
  }
  
  // Log for debugging, return null to trigger cleanup
  console.warn("Data validation failed:", result.error.issues);
  return null;
}
```

---

## Retention Policy

### Position Records

```typescript
const POSITION_RETENTION = {
  maxAgeDays: 30,
  maxRecords: 600_000,  // ~35 days at 5s intervals
  cleanupBatchSize: 10_000,
  cleanupIntervalMs: 60_000,
};

async function cleanupOldPositions() {
  const collection = await getPositionCollection();
  const cutoffTimestamp = Date.now() / 1000 - (POSITION_RETENTION.maxAgeDays * 86400);
  
  // Query positions older than cutoff
  const oldPositions = await collection
    .query()
    .where('timestamp', '<', cutoffTimestamp)
    .limit(POSITION_RETENTION.cleanupBatchSize)
    .execute();
  
  // Delete in batch
  for (const pos of oldPositions) {
    await collection.delete(pos.id);
  }
  
  return oldPositions.length;
}
```

### TLE Records

```typescript
const TLE_RETENTION = {
  maxRecords: 7,  // 1 week at hourly refresh
};

async function cleanupOldTle() {
  const collection = await getTleCollection();
  const allTle = await collection.query().execute();
  
  if (allTle.length <= TLE_RETENTION.maxRecords) return 0;
  
  // Sort by fetchedAt, delete oldest
  const sorted = [...allTle].sort((a, b) => a.fetchedAt - b.fetchedAt);
  const toDelete = sorted.slice(0, allTle.length - TLE_RETENTION.maxRecords);
  
  for (const tle of toDelete) {
    await collection.delete(tle.id);
  }
  
  return toDelete.length;
}
```

---

## Query Patterns

### Get Latest Position

```typescript
async function getLatestPosition(): Promise<ISSPosition | null> {
  const collection = await getPositionCollection();
  const positions = await collection
    .query()
    .orderBy('timestamp', 'desc')
    .limit(1)
    .execute();
  
  return positions[0] ?? null;
}
```

### Get Positions in Time Range

```typescript
async function getPositionsInRange(
  startTimestamp: number,
  endTimestamp: number
): Promise<ISSPosition[]> {
  const collection = await getPositionCollection();
  
  return collection
    .query()
    .where('timestamp', '>=', startTimestamp)
    .where('timestamp', '<=', endTimestamp)
    .orderBy('timestamp', 'asc')
    .execute();
}
```

### Get Current Crew

```typescript
async function getCurrentCrew(): Promise<Astronaut[]> {
  const collection = await getCrewCollection();
  return collection.query().execute();
}
```

### Check Initialization Status

```typescript
async function isInitialized(): Promise<boolean> {
  const collection = await getMetaCollection();
  const meta = await collection.get("storage-meta");
  return meta?.initialized ?? false;
}
```

---

## Migration Strategy

### Schema Version

Current version: `1`

### Future Migrations

```typescript
const CURRENT_SCHEMA_VERSION = 1;

async function runMigrations() {
  const meta = await getMetaCollection();
  const current = await meta.get("storage-meta");
  
  if (!current) {
    // First run - initialize
    await meta.insert({
      id: "storage-meta",
      initialized: false,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    });
    return;
  }
  
  if (current.schemaVersion < CURRENT_SCHEMA_VERSION) {
    // Run migrations based on version
    // For now, just update version number
    await meta.update("storage-meta", {
      schemaVersion: CURRENT_SCHEMA_VERSION,
    });
  }
}
```




