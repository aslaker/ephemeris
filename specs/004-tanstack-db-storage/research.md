# Research: Local-First Data Storage

**Feature**: 004-tanstack-db-storage  
**Created**: 2025-01-27

## Research Summary

This document captures decisions made during the planning phase for implementing TanStack DB local-first storage for the ISS Tracker application.

---

## 0. Existing Initialize Experience (No New Page Needed)

**Decision**: Use existing loading state in `StatsPanel.tsx`, NOT a new initialize page

**Rationale**:
- The app already shows "ACQUIRING_SIGNAL..." and "ESTABLISHING UPLINK" in `StatsPanel.tsx` during loading
- This provides the user feedback during first-visit data fetching
- Adding a separate route would complicate the UX unnecessarily
- First-visit experience can be handled by checking IndexedDB for cached data

**Existing Code** (`src/routes/iss/-components/StatsPanel.tsx`):
```typescript
if (isLoading || !data) {
  return (
    <div className="h-full w-full flex items-center justify-center p-2">
      <div className="text-center animate-pulse">
        <p className="text-sm">ACQUIRING_SIGNAL...</p>
        <p className="text-[10px] text-matrix-dim mt-1">
          ESTABLISHING UPLINK
        </p>
      </div>
    </div>
  );
}
```

**Implementation**:
- On first visit: TanStack Query fetches from API, persists to IndexedDB
- On subsequent visits: Load from IndexedDB immediately (instant), background refresh via TanStack Query
- No separate `/iss/initialize` route needed

---

## 1. IndexedDB Storage Limits and Retention Policy

**Decision**: Implement rolling 30-day retention window with ~50MB soft target

**Rationale**:
- **Chrome/Chromium**: Origin can use up to 60% of total disk space
- **Firefox**: Best-effort mode allows lesser of 10% disk or 10GB; persistent mode up to 50%
- **Safari**: Origin gets up to 60% of total disk space in browser apps
- For a typical 250GB disk, even 10% = 25GB - far exceeding our needs
- ISS position every 5s = 17,280 records/day × ~200 bytes = ~3.5MB/day
- 30 days = ~100MB worst case, well within all browser limits

**Implementation**:
```typescript
const RETENTION_CONFIG = {
  maxAgeDays: 30,
  maxRecords: 600_000,  // ~35 days buffer
  cleanupBatchSize: 10_000,
  cleanupIntervalMs: 60_000,  // Every minute during activity
};
```

**Alternatives Considered**:
- User-configurable retention: Rejected to keep UX simple for "fun app"
- Aggressive 7-day retention: Rejected, 30 days enables better flight path scrubbing
- No retention (manual cleanup): Rejected, would degrade performance over time

---

## 2. Architecture Decision: Simple TanStack Query + Dexie

**Decision**: Use regular TanStack Query with Dexie persistence as a side effect (Option B)

**Why NOT use `@tanstack/query-db-collection`**:
- `queryCollectionOptions` is designed for **two-way sync** (read + write back to server)
- It provides **optimistic mutations** with rollback - not needed for read-only data
- ISS data is **read-only** from external APIs - we don't mutate it back to a server
- Adds complexity without benefit for this use case

**Architecture Overview**:
```
┌─────────────────────────────────────────────────────────────────┐
│                  Simple Data Flow (Option B)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐     fetch      ┌─────────────────────────┐     │
│  │   API       │ ──────────────►│  TanStack Query         │     │
│  │  (Remote)   │                │  (queryOptions)         │     │
│  └─────────────┘                │                         │     │
│                                 │  Side effect in queryFn │     │
│                                 │         │               │     │
│                                 └─────────┼───────────────┘     │
│                                           │                      │
│                                           ▼                      │
│                                 ┌─────────────────────────┐     │
│                                 │   Dexie (IndexedDB)     │     │
│  ┌─────────────┐                │   db.positions.put()    │     │
│  │  Component  │◄───────────────│                         │     │
│  │  (React)    │  On mount:     └─────────────────────────┘     │
│  └─────────────┘  load from Dexie first                         │
│        │                                                         │
│        └── useISSPosition() hook handles cache-first loading    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**How It Works**:
1. **Fetch**: Regular `queryOptions` with `queryFn` that fetches from API
2. **Persist**: Side effect in `queryFn` writes to Dexie after successful fetch
3. **Load**: Custom hook checks Dexie on mount for cached data (instant)
4. **Refresh**: TanStack Query's `refetchInterval` handles background updates

**Required Packages**:
```bash
# Option 1: Use community wrapper
npm install tanstack-dexie-db-collection

# Option 2: Use Dexie directly (simpler, more control)
npm install dexie
```

**Rationale**:
- Keeps existing TanStack Query patterns (familiar API, proven caching)
- Dexie is a thin layer for IndexedDB persistence (no complex abstractions)
- No lifecycle hook complexity - just a simple side effect
- Easier to understand, debug, and maintain

---

## 3. Dexie Database Setup

**Decision**: Use Dexie directly for IndexedDB with typed tables

**Key Pattern**:
```typescript
// src/lib/iss/db.ts
import Dexie, { type EntityTable } from 'dexie';
import type { ISSPosition, Astronaut, TLERecord } from './types';

// Define the database with typed tables
const db = new Dexie('ephemeris-iss') as Dexie & {
  positions: EntityTable<ISSPosition, 'id'>;
  crew: EntityTable<Astronaut, 'id'>;
  tle: EntityTable<TLERecord, 'id'>;
};

// Define schema with indexes
db.version(1).stores({
  positions: 'id, timestamp',  // id is primary key, timestamp indexed
  crew: 'id, fetchedAt',
  tle: 'id, fetchedAt',
});

export { db };
```

**Persisting in queryFn**:
```typescript
// src/lib/iss/queries.ts
import { queryOptions } from "@tanstack/react-query";
import { fetchISSPosition } from "./api";
import { db } from "./db";

export const issQueries = {
  currentPosition: () =>
    queryOptions({
      queryKey: ["iss", "position", "current"],
      queryFn: async () => {
        const position = await fetchISSPosition();
        
        // Side effect: persist to Dexie
        if (typeof window !== "undefined") {
          await db.positions.put(position); // upsert by id
        }
        
        return position;
      },
      refetchInterval: 5000,
      staleTime: 0,
    }),
};
```

**Alternatives Considered**:
- `tanstack-dexie-db-collection`: Adds TanStack DB abstraction we don't need
- `localStorageCollectionOptions`: Limited to ~5MB, not suitable for position history
- `PersistQueryClient`: Persists entire query cache blob, not granular per-entity
- Raw IndexedDB: Too low-level, Dexie provides nice async/await API

---

## 4. Position Gap Handling Strategy

**Decision**: Visual interpolation for ≤24h gaps, orbital calculations for >24h gaps

**Rationale**:
- API only provides current position (no historical endpoint)
- Visual interpolation sufficient for smooth animations on recent gaps
- Orbital calculations via satellite.js already implemented in `src/lib/iss/orbital.ts`
- 24-hour threshold balances accuracy vs computational cost
- `calculateOrbitPath()` function already exists and is tested

**Implementation Pattern**:
```typescript
async function fillPositionGaps(
  lastStoredTimestamp: number,
  currentTimestamp: number,
  tle: TLEData
): Promise<ISSPosition[]> {
  const gapHours = (currentTimestamp - lastStoredTimestamp) / 3600;
  
  if (gapHours <= 24) {
    // Visual interpolation handled at display layer
    return [];
  }
  
  // Generate synthetic positions from orbital calculations
  const gapMinutes = gapHours * 60;
  const orbitalPoints = calculateOrbitPath(
    tle[0], tle[1], 
    -gapMinutes, // Start from past
    0,           // End at now
    5            // 5-minute steps for large gaps
  );
  
  return orbitalPoints.map((point, idx) => ({
    id: `synthetic-${lastStoredTimestamp + idx * 300}`,
    latitude: point.lat,
    longitude: point.lng,
    altitude: point.alt,
    timestamp: lastStoredTimestamp + idx * 300,
    velocity: 27600, // Average
    visibility: "synthetic",
  }));
}
```

---

## 5. First-Visit Experience (Using Existing Loading State)

**Decision**: Use existing `StatsPanel` loading state, no separate initialize page

**Rationale**:
- The app already has "ACQUIRING_SIGNAL..." / "ESTABLISHING UPLINK" loading UI
- Spec requirement FR-027 is satisfied by this existing experience
- Adding a separate page overcomplicates the UX
- Seamless transition: loading state → data displayed (no extra click)

**Flow**:
```
1. User visits /iss
2. Check Dexie for cached data
3. If cached data exists:
   - Display immediately (instant)
   - TanStack Query fetches fresh data in background
   - UI updates seamlessly when new data arrives
4. If NO cached data (first visit):
   - StatsPanel shows "ACQUIRING_SIGNAL..." / "ESTABLISHING UPLINK"
   - TanStack Query fetches from API
   - onInsert hook persists to Dexie
   - UI updates when data arrives
5. All subsequent visits: instant from cache + background refresh
```

**Implementation** (in queries or custom hook):
```typescript
// Hook that checks cache before/alongside network fetch
export function useISSPosition() {
  const [cachedPosition, setCachedPosition] = useState<ISSPosition | null>(null);
  
  // Load from Dexie on mount
  useEffect(() => {
    async function loadCached() {
      const collection = await getPositionDexieCollection();
      const positions = await collection
        .query()
        .orderBy('timestamp', 'desc')
        .limit(1)
        .execute();
      if (positions[0]) {
        setCachedPosition(positions[0]);
      }
    }
    loadCached();
  }, []);
  
  // TanStack Query for network fetch + background refresh
  const query = useQuery(issQueries.currentPosition());
  
  // Return cached if query still loading
  return {
    data: query.data ?? cachedPosition,
    isLoading: query.isLoading && !cachedPosition,
    fromCache: !query.data && !!cachedPosition,
    ...query,
  };
}
```

---

## 6. Data Corruption Detection and Recovery

**Decision**: Validate on read with Zod schema, remove corrupted records silently

**Rationale**:
- Zod schemas already define expected data structure
- `safeParse` returns success/error without throwing
- Corrupted records removed from IndexedDB automatically
- Background refresh replaces missing data transparently
- No user intervention required (spec FR-025, FR-026)

**Implementation**:
```typescript
async function readWithValidation<T>(
  collection: Collection<T>,
  schema: z.ZodType<T>,
  key: string
): Promise<T | null> {
  const raw = await collection.get(key);
  if (!raw) return null;
  
  const result = schema.safeParse(raw);
  if (result.success) {
    return result.data;
  }
  
  // Corrupted data - remove and log
  console.warn(`Corrupted record removed: ${key}`);
  await collection.delete(key);
  return null;
}
```

---

## 7. Animation and Position Update Smoothness

**Decision**: CSS transitions for position updates, requestAnimationFrame for globe

**Rationale**:
- Globe component (react-globe.gl) handles its own animation loop
- Position marker updates use smooth transitions (CSS or GSAP-lite)
- Avoid re-rendering entire globe on each position update
- Use `useMemo` to prevent unnecessary recalculations
- Position interpolation done in display layer, not storage layer

**Key Patterns**:
```typescript
// Smooth ISS marker position updates
const issMarkerStyle = {
  transition: 'transform 0.5s ease-out',
};

// Globe pointsData should be memoized
const issPoint = useMemo(() => [{
  lat: position.latitude,
  lng: position.longitude,
  alt: 0.1,
  color: '#00ff41',
}], [position.latitude, position.longitude]);
```

---

## 8. Cloudflare Workers Compatibility

**Decision**: Lazy initialization with dynamic imports, client-side only DB access

**Rationale**:
- Cloudflare Workers prohibit async I/O, timeouts, random values in global scope
- Existing pattern in `src/db-collections/index.ts` shows solution
- Dynamic `import()` defers module loading to runtime
- Collections initialized only in browser context (`typeof window !== 'undefined'`)
- Server functions cannot access IndexedDB (client-only)

**Pattern from Existing Code**:
```typescript
// Type import only - no runtime code execution
import type { Collection } from "@tanstack/react-db";

let _collection: Collection<T> | null = null;

// Getter function called in useEffect/handlers
export async function getCollection(): Promise<Collection<T>> {
  if (_collection) return _collection;
  
  // Dynamic import to avoid loading in Workers global scope
  const { createCollection, localOnlyCollectionOptions } = await import(
    "@tanstack/react-db"
  );
  
  _collection = createCollection(/* options */);
  return _collection;
}
```

---

## 9. Demo Code Cleanup Strategy

**Decision**: Remove demo chat code as final implementation task

**Rationale**:
- Spec FR-017 requires removing all demo chat examples after ISS implementation
- Demo code served as reference pattern, no longer needed in production
- Clean removal verifies no hidden dependencies

**Files to Remove**:
| File | Purpose |
|------|---------|
| `src/routes/demo/db-chat.tsx` | Demo chat route |
| `src/routes/demo/db-chat-api.ts` | Demo chat API |
| `src/hooks/demo.useChat.ts` | Demo chat hooks |
| `src/components/demo.chat-area.tsx` | Demo chat component |
| `src/components/demo.messages.tsx` | Demo messages component |
| `src/db-collections/index.ts` | Remove `messagesCollection` only |

**Verification**: After removal, ensure no TypeScript errors or broken imports.

---

## 10. Historical Data Query Efficiency

**Decision**: Time-based indexing on `timestamp` field for efficient range queries

**Rationale**:
- Spec SC-009 requires retrieving 1000+ positions in <500ms
- IndexedDB supports indexes on object store fields
- Time-range queries are primary access pattern for flight path scrubbing
- Dexie provides efficient compound indexes if needed

**Index Strategy**:
```typescript
// Position collection with timestamp index
const positionTableSchema = {
  stores: {
    issPositions: 'id, timestamp',  // id is primary, timestamp indexed
  },
};

// Efficient range query
async function getPositionsInRange(startMs: number, endMs: number) {
  const db = await getDatabase();
  return db.issPositions
    .where('timestamp')
    .between(startMs / 1000, endMs / 1000)
    .toArray();
}
```

---

## Open Questions (Resolved)

All NEEDS CLARIFICATION items from the spec have been addressed:

| Question | Resolution |
|----------|------------|
| IndexedDB storage limits | Researched: 10%-60% of disk depending on browser |
| Retention policy design | 30-day rolling window, ~100MB max |
| Gap filling threshold | 24 hours (spec clarification) |
| First-visit experience | "Initialize Uplink" page with pre-fetching |
| Corruption handling | Detect on read, remove silently, background refresh |

