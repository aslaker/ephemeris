# TanStack DB Research Documentation

**Task**: 003-tanstack-db-migration
**Subtask**: 1.1 - Research TanStack DB collection patterns
**Date**: 2026-01-02

## Overview

This document captures the research findings for migrating from TanStack Query + Dexie to unified TanStack DB collections with Dexie adapter for reactive, consistent data management.

---

## 1. Collection Creation Patterns

### Basic Collection Structure

TanStack DB collections combine two packages:
- `@tanstack/react-db` - Core collection and query framework
- `@tanstack/query-db-collection` - TanStack Query integration

**Standard Pattern**:

```typescript
import { createCollection } from "@tanstack/react-db"
import { queryCollectionOptions } from "@tanstack/query-db-collection"
import { z } from "zod"

const ISSPositionSchema = z.object({
  id: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  timestamp: z.number(),
  altitude: z.number(),
  velocity: z.number(),
  visibility: z.string(),
})

const positionsCollection = createCollection(
  queryCollectionOptions({
    queryKey: ["iss", "positions"],
    queryFn: async () => {
      const response = await fetch("/api/iss/positions")
      return response.json()
    },
    queryClient,
    getKey: (item) => item.id,
    schema: ISSPositionSchema,
  })
)
```

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `queryKey` | `string[]` | TanStack Query key identifying cached data |
| `queryFn` | `() => Promise<T[]>` | Async function fetching data from source |
| `queryClient` | `QueryClient` | TanStack Query client instance |
| `getKey` | `(item: T) => string` | Function extracting unique ID from items |

### Optional Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `schema` | `ZodSchema` | Validates item structure and enables type inference |
| `enabled` | `boolean` | Controls automatic query execution |
| `refetchInterval` | `number` | Sets polling frequency (milliseconds) |
| `staleTime` | `number` | Defines data freshness duration (milliseconds) |
| `meta` | `object` | Custom context passed to queryFn |

---

## 2. Dexie Adapter Configuration

### Installation

The project already has these dependencies installed:
```json
{
  "@tanstack/query-db-collection": "^0.2.0",
  "@tanstack/react-db": "^0.1.1"
}
```

**Third-party Dexie Adapter**:
```bash
npm install tanstack-dexie-db-collection
```

### Dexie Collection Pattern

The `tanstack-dexie-db-collection` package provides `dexieCollectionOptions()` for IndexedDB persistence:

```typescript
import { createCollection } from "@tanstack/react-db"
import { dexieCollectionOptions } from "tanstack-dexie-db-collection"
import { z } from "zod"

const todoSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean(),
})

const todosCollection = createCollection(
  dexieCollectionOptions({
    id: "todos",
    schema: todoSchema,
    getKey: (item) => item.id,
  })
)
```

### Dexie Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | **required** | Unique collection identifier (also table name) |
| `getKey` | `function` | **required** | Extracts unique key from items |
| `schema` | `ZodSchema` | **required** | Enables type inference and validation |
| `dbName` | `string` | `'app-db'` | Database name in IndexedDB |
| `tableName` | `string` | `id` value | Dexie table name (defaults to id) |
| `syncBatchSize` | `number` | `1000` | Items loaded per batch during sync |
| `rowUpdateMode` | `'partial' \| 'full'` | `'partial'` | Update strategy (partial merge vs full replace) |
| `ackTimeoutMs` | `number` | `2000` | Acknowledgment tracking window |
| `awaitTimeoutMs` | `number` | `10000` | ID waiting period timeout |

### Data Transformation with Codec

Transform data between storage and in-memory formats:

```typescript
codec: {
  parse: (stored) => ({
    ...stored,
    date: new Date(stored.date)
  }),
  serialize: (item) => ({
    ...item,
    date: item.date.toISOString()
  })
}
```

### Lazy Initialization Pattern

For Cloudflare Workers compatibility (matches existing `db.ts` pattern):

```typescript
// Shared Dexie database instance
let _db: Dexie | null = null

function getDb(): Dexie {
  if (typeof window === "undefined") {
    throw new Error("Database can only be accessed in browser environment")
  }

  if (!_db) {
    _db = new Dexie("ephemeris-iss")
    _db.version(1).stores({
      positions: "id, timestamp",
      crew: "id, fetchedAt",
      tle: "id, fetchedAt",
      briefings: "passId, timestamp",
    })
  }

  return _db
}

// Create collection with lazy DB initialization
const positionsCollection = createCollection(
  dexieCollectionOptions({
    id: "positions",
    schema: ISSPositionSchema,
    getKey: (item) => item.id,
    dbName: "ephemeris-iss",
    tableName: "positions",
  })
)
```

### Utility Methods

Access helpers via `collection.utils`:

```typescript
// Direct Dexie table access
const table = positionsCollection.utils.getTable()

// Force live query refresh
positionsCollection.utils.refresh()

// Async refresh with processing guarantee
await positionsCollection.utils.refetch()

// Generate sequential IDs (auto-initializes from max)
const nextId = await positionsCollection.utils.getNextId()

// Bulk insert from server (bootstrap)
await positionsCollection.utils.bulkInsertLocally(items)
```

---

## 3. useLiveQuery Hook Patterns

### Basic Usage

The `useLiveQuery` hook creates reactive queries that auto-update on data changes:

```typescript
import { useLiveQuery } from "@tanstack/react-db"

function PositionDisplay() {
  const { data, status, isLoading } = useLiveQuery((q) =>
    q.from({ position: positionsCollection })
  )

  if (isLoading) return <div>Loading...</div>

  return <div>{data?.latitude}</div>
}
```

### Query Builder Methods

**from()** - Specify source collection(s):
```typescript
q.from({ pos: positionsCollection })
```

**where()** - Filter records:
```typescript
q
  .from({ pos: positionsCollection })
  .where(({ pos }) => eq(pos.visibility, "daylight"))
```

**select()** - Transform results:
```typescript
q
  .from({ pos: positionsCollection })
  .select(({ pos }) => ({
    lat: pos.latitude,
    lng: pos.longitude
  }))
```

**orderBy()** - Sort results:
```typescript
q
  .from({ pos: positionsCollection })
  .orderBy(({ pos }) => pos.timestamp, "desc")
```

**findOne()** - Return single result:
```typescript
q
  .from({ pos: positionsCollection })
  .orderBy(({ pos }) => pos.timestamp, "desc")
  .findOne()
```

### Dependency Array

Like `useEffect`, re-run query when dependencies change:

```typescript
const { data } = useLiveQuery((q) =>
  q
    .from({ pos: positionsCollection })
    .where(({ pos }) => gte(pos.timestamp, startTime))
, [startTime])
```

### Conditional Queries

Disable queries by returning `undefined`:

```typescript
const { data, isEnabled } = useLiveQuery((q) => {
  if (!userId) return undefined

  return q
    .from({ crew: crewCollection })
    .where(({ crew }) => eq(crew.userId, userId))
}, [userId])
```

When disabled: `isEnabled = false` and `data = undefined`

### Return Object Properties

| Property | Type | Description |
|----------|------|-------------|
| `data` | `T[] \| T \| undefined` | Query results (array or single with findOne) |
| `status` | `'success' \| 'error' \| 'disabled'` | Query state |
| `isLoading` | `boolean` | True during initial load |
| `isEnabled` | `boolean` | Whether query is active |
| `error` | `Error \| null` | Error object if query failed |

---

## 4. Sync Handler Patterns for API Data

### Background Sync Architecture

TanStack DB collections can sync with external APIs using background intervals. The pattern involves:

1. **Sync Handler Function** - Fetches from API and inserts into collection
2. **Sync Manager** - Coordinates intervals for multiple data types
3. **Lifecycle Integration** - Start/stop on mount/unmount

### Sync Handler Example

```typescript
// src/lib/iss/sync/position-sync.ts
import { positionsCollection } from "@/lib/iss/collections/positions"
import { fetchISSPosition } from "@/lib/iss/api"

export async function syncPosition() {
  try {
    const position = await fetchISSPosition()

    // Insert into collection (triggers useLiveQuery updates)
    await positionsCollection.insert(position)

    return { success: true, data: position }
  } catch (error) {
    console.error("Position sync failed:", error)
    return { success: false, error }
  }
}

export function startPositionSync(intervalMs: number = 5000) {
  // Initial sync
  syncPosition()

  // Background sync
  const intervalId = setInterval(syncPosition, intervalMs)

  return () => clearInterval(intervalId)
}
```

### Sync Manager Pattern

Coordinate multiple sync handlers:

```typescript
// src/lib/iss/sync/sync-manager.ts
import { syncPosition } from "./position-sync"
import { syncCrew } from "./crew-sync"
import { syncTLE } from "./tle-sync"

class SyncManager {
  private intervals: Map<string, NodeJS.Timeout> = new Map()

  start() {
    // Position: 5 second interval
    const posInterval = setInterval(syncPosition, 5000)
    this.intervals.set("position", posInterval)

    // Crew: 1 hour interval
    const crewInterval = setInterval(syncCrew, 60 * 60 * 1000)
    this.intervals.set("crew", crewInterval)

    // TLE: 1 hour interval
    const tleInterval = setInterval(syncTLE, 60 * 60 * 1000)
    this.intervals.set("tle", tleInterval)

    // Initial sync for all
    syncPosition()
    syncCrew()
    syncTLE()
  }

  stop() {
    for (const interval of this.intervals.values()) {
      clearInterval(interval)
    }
    this.intervals.clear()
  }

  pause() {
    this.stop()
  }

  resume() {
    this.start()
  }
}

export const syncManager = new SyncManager()
```

### React Integration

Initialize sync in layout component:

```typescript
// src/routes/iss/-components/ISSLayout.tsx
import { useEffect } from "react"
import { syncManager } from "@/lib/iss/sync/sync-manager"

export function ISSLayout() {
  useEffect(() => {
    syncManager.start()

    // Handle visibility change (pause when tab hidden)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        syncManager.pause()
      } else {
        syncManager.resume()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      syncManager.stop()
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  return <div>{/* Layout content */}</div>
}
```

### Bulk Insert Pattern

For collections that fetch multiple items:

```typescript
// src/lib/iss/sync/crew-sync.ts
import { crewCollection } from "@/lib/iss/collections/crew"
import { fetchCrewData } from "@/lib/iss/api"

export async function syncCrew() {
  try {
    const crew = await fetchCrewData()

    // Bulk insert (replaces existing)
    await crewCollection.deleteAll()
    await crewCollection.insertMany(
      crew.map(astronaut => ({
        ...astronaut,
        fetchedAt: Date.now(),
      }))
    )

    return { success: true, count: crew.length }
  } catch (error) {
    console.error("Crew sync failed:", error)
    return { success: false, error }
  }
}
```

### Error Handling Best Practices

```typescript
export async function syncWithRetry(
  syncFn: () => Promise<any>,
  maxRetries: number = 3,
  backoffMs: number = 1000
) {
  let attempt = 0

  while (attempt < maxRetries) {
    try {
      return await syncFn()
    } catch (error) {
      attempt++

      if (attempt >= maxRetries) {
        throw error
      }

      // Exponential backoff
      await new Promise(resolve =>
        setTimeout(resolve, backoffMs * Math.pow(2, attempt))
      )
    }
  }
}
```

---

## 5. Migration Strategy for Ephemeris

### Current State (TanStack Query + Dexie)

```typescript
// Direct Dexie access
import { db } from "@/lib/iss/db"

const position = await db.positions.orderBy("timestamp").last()
```

```typescript
// TanStack Query for API fetching
const { data: position } = useQuery({
  queryKey: ["iss", "position"],
  queryFn: fetchISSPosition,
  refetchInterval: 5000,
})
```

### Target State (TanStack DB Collections)

```typescript
// Collection definition
export const positionsCollection = createCollection(
  dexieCollectionOptions({
    id: "positions",
    schema: ISSPositionSchema,
    getKey: (item) => item.id,
    dbName: "ephemeris-iss",
    tableName: "positions",
  })
)
```

```typescript
// Component using useLiveQuery
function StatsPanel() {
  const { data: position } = useLiveQuery((q) =>
    q
      .from({ pos: positionsCollection })
      .orderBy(({ pos }) => pos.timestamp, "desc")
      .findOne()
  )

  return <div>{position?.latitude}</div>
}
```

### Migration Checklist

- [x] Research TanStack DB patterns (this document)
- [ ] Create collection definitions for positions, crew, TLE, briefings
- [ ] Implement sync handlers with background intervals
- [ ] Create useLiveQuery hooks replacing TanStack Query hooks
- [ ] Update components to use new hooks
- [ ] Migrate storage utilities to collection operations
- [ ] Remove legacy Dexie database and TanStack Query code
- [ ] Test offline persistence and performance

---

## 6. Key Insights for Implementation

### Advantages of TanStack DB

1. **Unified Data Layer** - Single source of truth replacing Query + Dexie dual system
2. **Reactive Updates** - `useLiveQuery` auto-updates components on data changes
3. **Offline-First** - IndexedDB persistence with automatic syncing
4. **Type Safety** - Full TypeScript support with Zod schema validation
5. **Optimistic Updates** - Instant UI feedback with rollback on error
6. **Cross-Tab Sync** - Multi-tab state synchronization handled automatically

### Challenges to Address

1. **Third-Party Adapter** - `tanstack-dexie-db-collection` is community-maintained, not official
2. **Migration Complexity** - Existing data needs migration from Dexie to collections
3. **Learning Curve** - Query builder syntax different from direct Dexie queries
4. **Bundle Size** - Additional dependency increases bundle size slightly

### Recommended Approach

1. **Phase 1: Foundation** - Create collections with Dexie adapter
2. **Phase 2: Data Layer** - Implement sync handlers and managers
3. **Phase 3: Hook Migration** - Replace Query hooks with useLiveQuery
4. **Phase 4: Component Updates** - Update all consumers
5. **Phase 5: Utilities** - Migrate storage utilities to collection operations
6. **Phase 6: Data Migration** - Transfer existing IndexedDB data
7. **Phase 7: Cleanup** - Remove legacy code
8. **Phase 8: Testing** - Verify offline persistence and performance

---

## References

- [TanStack DB Overview](https://tanstack.com/db/latest/docs/overview)
- [Query Collection Documentation](https://tanstack.com/db/latest/docs/collections/query-collection)
- [Live Queries Guide](https://tanstack.com/db/latest/docs/guides/live-queries)
- [TanStack DB React Adapter](https://tanstack.com/db/latest/docs/framework/react/overview)
- [Dexie Adapter GitHub](https://github.com/HimanshuKumarDutt094/tanstack-dexie-db-collection)
- [Community Resources](https://tanstack.com/db/latest/docs/community/resources)
- [Medium: TanStack DB + Query Guide](https://medium.com/@dipiash/tanstack-db-query-step-by-step-guide-to-combining-parameter-based-loading-and-normalized-storage-f1e7eb3ff55e)

---

## Acceptance Criteria Met

- ✅ Document collection creation patterns
- ✅ Document Dexie adapter configuration
- ✅ Document useLiveQuery hook patterns
- ✅ Document sync handler patterns for API data
