# Quickstart: Local-First Data Storage

**Feature**: 004-tanstack-db-storage  
**Created**: 2025-01-27

## Prerequisites

- Node.js 18+ / Bun
- Existing ephemeris development setup
- TanStack packages already installed (see `package.json`)

## Quick Reference

### Key Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/iss/db.ts` | CREATE | Dexie database setup with typed tables |
| `src/lib/iss/storage.ts` | CREATE | Retention policy, cleanup helpers |
| `src/lib/iss/queries.ts` | MODIFY | Add Dexie persistence side effect in queryFn |
| `src/hooks/iss/useISSData.ts` | CREATE | Cache-first hook (load Dexie → Query) |
| `src/routes/iss/index.tsx` | MODIFY | Use new hook for instant cached data |
| `src/routes/iss/crew.tsx` | MODIFY | Use new hook for instant cached data |
| `src/db-collections/index.ts` | MODIFY | Remove demo `messagesCollection` (cleanup) |

**Note**: No new routes needed. The existing "ESTABLISHING UPLINK" loading state in `StatsPanel.tsx` serves as the first-visit experience.

### Dependencies (Already Installed)

```json
{
  "@tanstack/react-query": "^5.66.5",
  "zod": "^4.1.11"
}
```

**NEW DEPENDENCY REQUIRED**:
```bash
npm install dexie
```

**Note**: `@tanstack/query-db-collection` is NOT needed - it's for two-way sync with mutations. We're read-only.

---

## Step-by-Step Implementation

### Step 1: Install Dexie

```bash
npm install dexie
```

### Step 2: Create Dexie Database

Create `src/lib/iss/db.ts`:

```typescript
import Dexie, { type EntityTable } from 'dexie';
import type { ISSPosition, Astronaut } from './types';

// Extended type for Astronaut with fetch timestamp
export interface StoredAstronaut extends Astronaut {
  fetchedAt: number;
}

// Extended type for TLE with fetch metadata
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

// Define schema with indexes
db.version(1).stores({
  positions: 'id, timestamp',  // id primary key, timestamp indexed for range queries
  crew: 'id, fetchedAt',
  tle: 'id, fetchedAt',
});

export { db };

// Helper to get latest position from cache
export async function getCachedPosition(): Promise<ISSPosition | undefined> {
  return db.positions.orderBy('timestamp').last();
}

// Helper to get cached crew
export async function getCachedCrew(): Promise<StoredAstronaut[]> {
  return db.crew.toArray();
}

// Helper to get latest TLE
export async function getCachedTLE(): Promise<StoredTLE | undefined> {
  return db.tle.orderBy('fetchedAt').last();
}
```

### Step 3: Add Dexie Persistence to Queries

Modify `src/lib/iss/queries.ts` to persist as a side effect:

```typescript
import { queryOptions } from "@tanstack/react-query";
import { fetchCrewData, fetchISSPosition, fetchTLE } from "./api";
import { db } from "./db";

export const issQueries = {
  currentPosition: () =>
    queryOptions({
      queryKey: ["iss", "position", "current"] as const,
      queryFn: async () => {
        const position = await fetchISSPosition();
        
        // Side effect: persist to IndexedDB
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
        
        // Side effect: persist to IndexedDB with fetch timestamp
        if (typeof window !== "undefined") {
          const fetchedAt = Date.now();
          await db.crew.bulkPut(
            crew.map(astronaut => ({ ...astronaut, fetchedAt }))
          );
        }
        
        return crew;
      },
      staleTime: 1000 * 60 * 60,
    }),

  tle: () =>
    queryOptions({
      queryKey: ["iss", "tle"] as const,
      queryFn: async () => {
        const tle = await fetchTLE();
        
        // Side effect: persist to IndexedDB
        if (typeof window !== "undefined") {
          await db.tle.put({
            id: `tle-${Date.now()}`,
            line1: tle[0],
            line2: tle[1],
            fetchedAt: Date.now(),
            source: 'celestrak', // or detect from API
          });
        }
        
        return tle;
      },
      staleTime: 1000 * 60 * 60,
    }),
};
```

### Step 4: Create Cache-First Hook

Create `src/hooks/iss/useISSData.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { issQueries } from "@/lib/iss/queries";
import { getCachedPosition, getCachedCrew, type StoredAstronaut } from "@/lib/iss/db";
import type { ISSPosition, Astronaut } from "@/lib/iss/types";

/**
 * Hook that loads cached data first, then does background refresh
 */
export function useISSPosition() {
  const [cachedPosition, setCachedPosition] = useState<ISSPosition | null>(null);
  const [loadingCache, setLoadingCache] = useState(true);

  // Load from Dexie on mount (instant)
  useEffect(() => {
    getCachedPosition()
      .then(pos => pos && setCachedPosition(pos))
      .catch(e => console.warn("Failed to load cached position:", e))
      .finally(() => setLoadingCache(false));
  }, []);

  // TanStack Query for network fetch + background refresh
  const query = useQuery(issQueries.currentPosition());

  // Return cached while query is loading, then switch to fresh data
  return {
    data: query.data ?? cachedPosition,
    isLoading: query.isLoading && loadingCache,
    fromCache: !query.data && !!cachedPosition,
    isFetching: query.isFetching,
    error: query.error,
  };
}

/**
 * Hook for crew data with cache-first loading
 */
export function useISSCrew() {
  const [cachedCrew, setCachedCrew] = useState<Astronaut[]>([]);
  const [loadingCache, setLoadingCache] = useState(true);

  useEffect(() => {
    getCachedCrew()
      .then(crew => crew.length > 0 && setCachedCrew(crew))
      .catch(e => console.warn("Failed to load cached crew:", e))
      .finally(() => setLoadingCache(false));
  }, []);

  const query = useQuery(issQueries.crew());

  return {
    data: query.data ?? cachedCrew,
    isLoading: query.isLoading && loadingCache,
    fromCache: !query.data && cachedCrew.length > 0,
    isFetching: query.isFetching,
    error: query.error,
  };
}
```

### Step 5: Use Cache-First Hooks in Routes

Modify `src/routes/iss/index.tsx`:

```typescript
// Replace this:
const { data, isLoading, isError } = useQuery(issQueries.currentPosition());

// With this:
import { useISSPosition } from "@/hooks/iss/useISSData";

const { data, isLoading, fromCache } = useISSPosition();

// The component now:
// - Shows cached data instantly on return visits (fromCache = true)
// - Shows "ESTABLISHING UPLINK" only on true first visit (no cache)
// - Updates seamlessly when fresh data arrives via refetchInterval
```

**No new routes needed!** The existing `StatsPanel` loading state handles first-visit UX.

---

## Testing

### Manual Test Checklist

1. **First Visit**
   - Clear localStorage and IndexedDB
   - Visit `/iss`
   - Should redirect to `/iss/initialize`
   - Should show pre-fetching progress
   - Click "ENGAGE" → transition to main app

2. **Cached Data Load**
   - Open DevTools → Application → IndexedDB
   - Verify `iss-positions` table has records
   - Refresh page → data appears instantly

3. **Background Refresh**
   - Watch Network tab
   - Position updates every 5s without UI loading state
   - New records appear in IndexedDB

4. **Offline Mode**
   - Enable offline in DevTools
   - Refresh page → cached data still displays
   - No errors in console

---

## Common Patterns

### Reading from Cache First

```typescript
async function getPositionWithFallback(): Promise<ISSPosition | null> {
  // Try cache first
  const collection = await getPositionCollection();
  const cached = await collection
    .query()
    .orderBy("timestamp", "desc")
    .limit(1)
    .execute();

  if (cached.length > 0) {
    return cached[0];
  }

  // Fallback to API
  try {
    return await fetchISSPosition();
  } catch {
    return null;
  }
}
```

### Validation on Read

```typescript
async function getValidatedPosition(id: string): Promise<ISSPosition | null> {
  const collection = await getPositionCollection();
  const raw = await collection.get(id);
  
  if (!raw) return null;
  
  const result = ISSPositionSchema.safeParse(raw);
  if (result.success) {
    return result.data;
  }
  
  // Corrupted - remove
  await collection.delete(id);
  return null;
}
```

### Batch Insert

```typescript
async function storePositions(positions: ISSPosition[]): Promise<void> {
  const collection = await getPositionCollection();
  
  for (const position of positions) {
    await collection.insert(position);
  }
}
```

---

## Troubleshooting

### "Collection not initialized" Error

**Cause**: Accessing collection in server context or before lazy init.

**Fix**: Always use getter functions, check `typeof window !== "undefined"`:

```typescript
if (typeof window !== "undefined") {
  const collection = await getPositionCollection();
  // Use collection...
}
```

### Data Not Persisting

**Cause**: IndexedDB quota exceeded or incognito mode.

**Fix**: 
1. Check DevTools → Application → Storage for quota
2. Run cleanup to free space
3. Test in normal browsing mode

### Slow Queries

**Cause**: Missing indexes or large dataset.

**Fix**: 
1. Add index on frequently queried fields
2. Run retention cleanup
3. Use pagination with `limit()`

---

## Next Steps

After implementing basic storage:

1. Add retention cleanup scheduler
2. Implement gap filling for historical data
3. Add position history visualization
4. Remove demo chat code (final cleanup)

See `tasks.md` for detailed implementation tasks.




