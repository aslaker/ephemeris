# TanStack DB Research: Collection API, Dexie Adapter, and Live Query Patterns

**Subtask**: 1.1 - Research TanStack DB collection patterns
**Created**: 2026-01-02
**Status**: Complete

## Overview

This document captures research findings for migrating from TanStack Query + Dexie to unified TanStack DB collections. It covers:
1. Collection creation patterns with `queryCollectionOptions`
2. Dexie adapter configuration for IndexedDB persistence
3. `useLiveQuery` hook patterns for reactive queries
4. Sync handler patterns for API data integration

---

## 1. Collection Creation Patterns

### Basic Collection Setup

TanStack DB collections are created using `createCollection` with `queryCollectionOptions`. The pattern integrates seamlessly with existing TanStack Query infrastructure:

```typescript
import { QueryClient } from "@tanstack/query-core"
import { createCollection } from "@tanstack/db"
import { queryCollectionOptions } from "@tanstack/query-db-collection"

const queryClient = new QueryClient()

const todosCollection = createCollection(
  queryCollectionOptions({
    queryKey: ["todos"],              // Same queryKey as TanStack Query
    queryFn: async () => {             // Same queryFn as TanStack Query
      const response = await fetch("/api/todos")
      return response.json()
    },
    queryClient,                       // Shared query client instance
    getKey: (item) => item.id,        // Extract unique key from each item
  })
)
```

### Required Collection Options

| Option | Type | Description |
|--------|------|-------------|
| `queryKey` | `string[]` | Unique identifier for the query cache (same as TanStack Query) |
| `queryFn` | `() => Promise<T[]>` | Function that fetches array of items from API |
| `queryClient` | `QueryClient` | Shared TanStack Query client instance |
| `getKey` | `(item: T) => string` | Extract unique identifier from each item |
| `schema` | `ZodSchema<T>` (optional) | Zod schema for runtime validation |

### Key Design Principles

1. **Array Return Type**: Collections expect `queryFn` to return `T[]` (array of items)
2. **Unique ID Required**: Every entity needs an `id` field for `getKey: (item) => item.id`
3. **Same Query Keys**: Use identical `queryKey` as existing TanStack Query for migration compatibility
4. **Lazy Initialization**: Collections should be initialized lazily for Cloudflare Workers compatibility

### Migration-Friendly Pattern

The current codebase already follows TanStack DB-compatible patterns (from `specs/001-iss-tracker-migration/research.md`):

```typescript
// ✅ CURRENT: TanStack Query (migration-ready)
export const issQueries = {
  crew: () => ({
    queryKey: ['iss', 'crew'] as const,   // ✅ Already collection-ready
    queryFn: fetchCrewData,                // ✅ Returns Astronaut[]
    staleTime: 1000 * 60 * 60,
  }),
}

// 🔄 FUTURE: TanStack DB Collection
const issCrewCollection = createCollection(
  queryCollectionOptions({
    queryKey: ['iss', 'crew'],             // Same key!
    queryFn: fetchCrewData,                 // Same function!
    queryClient,
    getKey: (astronaut) => astronaut.id,   // Each astronaut has unique id
  })
)
```

---

## 2. Dexie Adapter Configuration

### Community Package: tanstack-dexie-db-collection

A community-maintained Dexie.js adapter exists for TanStack DB:

- **Package**: `tanstack-dexie-db-collection`
- **Repository**: [HimanshuKumarDutt094/tanstack-dexie-db-collection](https://github.com/HimanshuKumarDutt094/tanstack-dexie-db-collection)
- **Purpose**: Provides seamless integration between TanStack DB and Dexie.js for IndexedDB persistence

### Key Features

- ✅ Automatic sync between TanStack DB in-memory collections and Dexie IndexedDB tables
- ✅ Reactive updates using Dexie's `liveQuery`
- ✅ Optimistic mutations with acknowledgment tracking
- ✅ Efficient initial syncing with configurable batch sizes
- ✅ Offline-first persistence layer

### Installation

```bash
npm install tanstack-dexie-db-collection
# or
bun add tanstack-dexie-db-collection
```

**Status**: ⚠️ Package NOT yet installed in this project (will be added in Phase 1)

### Existing Dexie Setup

The codebase already has Dexie configured (`src/lib/iss/db.ts`):

```typescript
import Dexie, { type EntityTable } from "dexie";

class EphemerisDatabase extends Dexie {
  positions!: EntityTable<ISSPosition, "id">;
  crew!: EntityTable<StoredAstronaut, "id">;
  tle!: EntityTable<StoredTLE, "id">;
  events!: EntityTable<TimelineEvent, "id">;

  constructor() {
    super("ephemeris-iss");

    // Schema version 1: Initial tables with indexes
    this.version(1).stores({
      positions: "id, timestamp",    // Index on timestamp for range queries
      crew: "id, fetchedAt",         // Index on fetchedAt for freshness
      tle: "id, fetchedAt",          // Index on fetchedAt for freshness
      events: "id, timestamp, type",
    });
  }
}

// Lazy initialization pattern (Cloudflare Workers compatible)
let _db: EphemerisDatabase | null = null;

export function getDb(): EphemerisDatabase {
  if (typeof window === "undefined") {
    throw new Error("Database can only be accessed in browser environment");
  }
  if (!_db) {
    _db = new EphemerisDatabase();
  }
  return _db;
}
```

### Integration Pattern (Expected)

Based on the community adapter patterns, the integration should follow:

```typescript
import { createCollection } from "@tanstack/db"
import { dexieCollectionOptions } from "tanstack-dexie-db-collection"
import { getDb } from "./db"

// Create collection with Dexie persistence
const positionsCollection = createCollection(
  dexieCollectionOptions({
    table: getDb().positions,          // Dexie table
    getKey: (position) => position.id,
    // Additional options for sync behavior
  })
)
```

**Note**: Exact API will be confirmed when implementing subtask 1.2

### Lazy Initialization Strategy

To maintain Cloudflare Workers compatibility, collections should be created lazily:

```typescript
// ❌ BAD: Immediate initialization
export const positionsCollection = createCollection(...)

// ✅ GOOD: Lazy initialization
let _positionsCollection: ReturnType<typeof createCollection> | null = null;

export function getPositionsCollection() {
  if (typeof window === "undefined") {
    throw new Error("Collection can only be accessed in browser");
  }
  if (!_positionsCollection) {
    _positionsCollection = createCollection(...)
  }
  return _positionsCollection;
}
```

---

## 3. useLiveQuery Hook Patterns

### Basic Usage

The `useLiveQuery` hook creates reactive queries that automatically update when collection data changes:

```typescript
import { useLiveQuery } from "@tanstack/db/react"

function TodoList() {
  const { data, isLoading, isError } = useLiveQuery((q) =>
    q.from({ todos: todosCollection })
     .where(({ todos }) => eq(todos.completed, false))
     .select(({ todos }) => ({ id: todos.id, text: todos.text }))
  )

  if (isLoading) return <div>Loading...</div>
  if (isError) return <div>Error loading todos</div>

  return data?.map(todo => <TodoItem key={todo.id} {...todo} />)
}
```

### Return Type

The hook returns an object with:

| Property | Type | Description |
|----------|------|-------------|
| `data` | `T \| undefined` | Query result (undefined while loading) |
| `isLoading` | `boolean` | True during initial load |
| `isError` | `boolean` | True if query failed |
| `error` | `Error \| null` | Error object if failed |
| `status` | `"loading" \| "error" \| "success"` | Overall query status |

### Query Syntax

TanStack DB uses SQL-like query syntax with type safety:

```typescript
useLiveQuery((q) =>
  q.from({ todos: todosCollection })
   .where(({ todos }) => eq(todos.completed, true))
   .orderBy(({ todos }) => [desc(todos.createdAt)])
   .select(({ todos }) => ({ ...todos }))
)
```

**Available Query Operations**:
- `.from()` - Specify collection(s)
- `.where()` - Filter rows (supports `eq`, `gt`, `lt`, `gte`, `lte`, `and`, `or`)
- `.orderBy()` - Sort results (supports `asc`, `desc`)
- `.select()` - Transform/project fields
- `.limit()` - Limit result count
- `.offset()` - Skip rows (pagination)

### Reactive Updates

Live queries automatically re-run when:
- Collection data changes (insert, update, delete)
- Query dependencies change (React dependency array)

```typescript
function UserTodos({ userId }: { userId: string }) {
  const { data } = useLiveQuery(
    (q) =>
      q.from({ todos: todosCollection })
       .where(({ todos }) => eq(todos.userId, userId))
       .select(({ todos }) => ({ ...todos })),
    [userId]  // Re-run query when userId changes
  )

  return ...
}
```

### Comparison with TanStack Query Hooks

| TanStack Query | TanStack DB | Key Difference |
|----------------|-------------|----------------|
| `useQuery()` | `useLiveQuery()` | Live queries are reactive to collection changes |
| `queryKey` for cache | Query function | No query key needed (reactive to data) |
| Manual `refetch()` | Automatic updates | Updates propagate automatically |
| `staleTime` config | Always fresh | Collection updates are instant |

---

## 4. Sync Handler Patterns for API Data

### Mutation Handlers

Collections support mutation handlers to persist changes to backends:

```typescript
const todosCollection = createCollection(
  queryCollectionOptions({
    queryKey: ["todos"],
    queryFn: fetchTodos,
    queryClient,
    getKey: (item) => item.id,

    // Sync handlers for mutations
    onInsert: async (item) => {
      const response = await fetch("/api/todos", {
        method: "POST",
        body: JSON.stringify(item),
      })
      return response.json()
    },

    onUpdate: async (item) => {
      await fetch(`/api/todos/${item.id}`, {
        method: "PUT",
        body: JSON.stringify(item),
      })
    },

    onDelete: async (item) => {
      await fetch(`/api/todos/${item.id}`, {
        method: "DELETE",
      })
    },
  })
)
```

### Mutation Lifecycle

1. **Optimistic Update**: Local change applied immediately to collection
2. **Backend Sync**: Mutation handler (`onInsert`, `onUpdate`, `onDelete`) called
3. **Server Response**: Handler response merged back into collection
4. **Refetch** (optional): Collection can refetch to get server state

### Advanced Pattern: Server-Computed Fields

When the server returns computed fields (like IDs, timestamps), you can manually sync them:

```typescript
const todosCollection = createCollection(
  queryCollectionOptions({
    // ...
    onInsert: async (item) => {
      const response = await fetch("/api/todos", {
        method: "POST",
        body: JSON.stringify(item),
      })
      const serverItem = await response.json()

      // Manually sync server response to avoid refetch
      todosCollection.utils.writeBatch((tx) => {
        tx.writeInsert(serverItem)
      })

      return { refetch: false }  // Skip automatic refetch
    },
  })
)
```

### Background Sync Pattern (For ISS Data)

ISS data doesn't use mutations but needs background polling:

```typescript
// Sync manager pattern for background API polling
class ISSDataSyncManager {
  private intervalIds: Map<string, number> = new Map()

  startPositionSync(collection: Collection<ISSPosition>) {
    const intervalId = setInterval(async () => {
      const position = await fetchISSPosition()
      collection.insert(position)  // Reactively updates all useLiveQuery hooks
    }, 5000)  // 5 second polling

    this.intervalIds.set('position', intervalId)
  }

  startCrewSync(collection: Collection<Astronaut>) {
    const intervalId = setInterval(async () => {
      const crew = await fetchCrewData()
      collection.bulkInsert(crew)  // Replace all crew data
    }, 60 * 60 * 1000)  // 1 hour polling

    this.intervalIds.set('crew', intervalId)
  }

  stopAllSync() {
    this.intervalIds.forEach(id => clearInterval(id))
    this.intervalIds.clear()
  }
}
```

**Key Insight**: Collections don't require mutation handlers for read-only sync. You can directly insert into collections from external sync logic, and all `useLiveQuery` hooks will reactively update.

---

## 5. Implementation Plan Alignment

### Subtask Mapping

| Subtask | Applies Research | Key Patterns |
|---------|------------------|--------------|
| 1.2 - Create positions collection | Section 1 + 2 | Collection creation, Dexie adapter, lazy init |
| 1.3 - Create crew collection | Section 1 + 2 | Collection creation, Dexie adapter |
| 1.4 - Create TLE collection | Section 1 + 2 | Collection creation, Dexie adapter |
| 1.5 - Create briefings collection | Section 1 + 2 | Collection creation, Dexie adapter |
| 1.6 - Collections index | Section 2 | Shared Dexie database instance |
| 2.1-2.3 - Sync handlers | Section 4 | Background sync pattern |
| 2.4 - Sync manager | Section 4 | Polling intervals, lifecycle management |
| 3.1-3.5 - Hook migration | Section 3 | useLiveQuery patterns |

### Shared Dexie Database Strategy

All collections should share a single Dexie database instance:

```typescript
// src/lib/iss/collections/index.ts (future)
import { getDb } from "../db"

const db = getDb()  // Shared instance

export const positionsCollection = createCollection(
  dexieCollectionOptions({ table: db.positions, ... })
)

export const crewCollection = createCollection(
  dexieCollectionOptions({ table: db.crew, ... })
)

export const tleCollection = createCollection(
  dexieCollectionOptions({ table: db.tle, ... })
)
```

### Type Compatibility

Existing types are already TanStack DB compatible:

```typescript
// ✅ From src/lib/iss/db.ts - Already has unique id field
export interface StoredAstronaut extends Astronaut {
  fetchedAt: number;  // ✅ Timestamp for cache freshness
}

export interface StoredTLE {
  id: string;         // ✅ Unique identifier
  line1: string;
  line2: string;
  fetchedAt: number;  // ✅ Timestamp for cache freshness
  source: "celestrak" | "ariss" | "fallback";
}

// ✅ From src/lib/iss/types.ts (via data-model.md)
interface ISSPosition {
  id: string;         // ✅ Unique identifier (timestamp-based)
  latitude: number;
  longitude: number;
  timestamp: number;
  altitude: number;
  velocity: number;
  visibility: string;
}
```

---

## 6. Migration Checklist

### Phase 1: Foundation (Current Phase)
- [x] Research TanStack DB patterns (this document)
- [ ] Install `tanstack-dexie-db-collection` package
- [ ] Create positions collection with Dexie adapter
- [ ] Create crew collection with Dexie adapter
- [ ] Create TLE collection with Dexie adapter
- [ ] Create briefings collection with Dexie adapter
- [ ] Create collections index with shared Dexie database

### Phase 2: Data Layer Migration
- [ ] Create position sync handler (5s polling)
- [ ] Create crew sync handler (1h polling)
- [ ] Create TLE sync handler (1h polling)
- [ ] Create unified sync manager

### Phase 3: Hook Migration
- [ ] Create `useISSPositionDB` with `useLiveQuery`
- [ ] Create `useISSCrewDB` with `useLiveQuery`
- [ ] Create `useISSTLEDB` with `useLiveQuery`
- [ ] Create `usePositionHistoryDB` with collection range query
- [ ] Create `useBriefingDB` hooks

### Benefits Summary

1. **Unified Data Layer**: No more dual TanStack Query + Dexie maintenance
2. **Reactive Updates**: `useLiveQuery` automatically updates UI when data changes
3. **Simpler Hooks**: No manual cache-first logic needed
4. **Better Offline Support**: Collection-based sync patterns handle offline seamlessly
5. **Type Safety**: Zod schemas + TypeScript for runtime + compile-time validation

---

## 7. External Resources

### Official Documentation
- [TanStack DB Overview](https://tanstack.com/db/latest/docs/overview)
- [TanStack DB Quick Start](https://tanstack.com/db/latest/docs/quick-start)
- [Query Collection Docs](https://tanstack.com/db/latest/docs/collections/query-collection)
- [Live Queries Guide](https://tanstack.com/db/latest/docs/guides/live-queries)
- [useLiveQuery React Hook](https://tanstack.com/db/latest/docs/framework/react/reference/functions/useLiveQuery)
- [Creating Collection Options Creator](https://tanstack.com/db/latest/docs/guides/collection-options-creator)
- [Mutations Guide](https://tanstack.com/db/latest/docs/guides/mutations)
- [TanStack DB 0.5 — Query-Driven Sync](https://tanstack.com/blog/tanstack-db-0.5-query-driven-sync)

### Community Resources
- [GitHub - tanstack-dexie-db-collection](https://github.com/HimanshuKumarDutt094/tanstack-dexie-db-collection)
- [Community Resources](https://tanstack.com/db/latest/docs/community/resources)

### Related Articles
- [How to use TanStack DB to build reactive, offline-ready React apps - LogRocket](https://blog.logrocket.com/tanstack-db-ux/)
- [An Interactive Guide to TanStack DB - Frontend at Scale](https://frontendatscale.com/blog/tanstack-db/)
- [How to Build a CRUD App with TanStack Start and TanStackDB - freeCodeCamp](https://www.freecodecamp.org/news/how-to-build-a-crud-app-with-tanstack-start-and-tanstackdb-with-rxdb-integration/)

### Dexie.js Resources
- [Dexie.js Official Site](https://dexie.org/)
- [Get started with Dexie in React](https://dexie.org/docs/Tutorial/React)

---

## Notes

- TanStack DB is currently in **BETA** status
- The `@tanstack/query-db-collection` package (v0.2.0) is already installed
- The `tanstack-dexie-db-collection` package needs to be added
- Existing Dexie database schema (version 1) is compatible with TanStack DB collections
- All existing types already have required `id` fields for collection `getKey` functions

---

**Research Completed**: 2026-01-02
**Next Step**: Proceed with subtask 1.2 - Create positions collection
