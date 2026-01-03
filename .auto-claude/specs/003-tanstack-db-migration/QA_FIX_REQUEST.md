# QA Fix Request

**Status**: REJECTED ❌
**Date**: 2026-01-02T21:00:00Z
**QA Session**: 1

---

## Summary

The TanStack DB migration is **functionally complete** and meets all acceptance criteria, but there are **9 critical TypeScript errors** that must be fixed before QA approval.

**Good News**: The build succeeds, the code works correctly, and the implementation is excellent. The TypeScript errors are straightforward type annotation fixes.

**Estimated Fix Time**: 15-30 minutes

---

## Critical Issues to Fix

### 1. Missing Type Annotation in cleanup.ts

**Problem**: Parameter 'tle' implicitly has an 'any' type

**Location**: `src/lib/iss/collections/cleanup.ts:94`

**Current Code**:
```typescript
const deleteIds = toDelete.map((tle) => tle.id);
```

**Required Fix**:
```typescript
import type { StoredTLE } from './tle';
const deleteIds = toDelete.map((tle: StoredTLE) => tle.id);
```

**Verification**: TypeScript error on line 94 should disappear

---

### 2. Missing Type Annotations in gap-filling.ts (2 errors)

**Problem**: Parameters 'a' and 'b' implicitly have 'any' type

**Location**: `src/lib/iss/collections/gap-filling.ts:180`

**Current Code**:
```typescript
positions.sort((a, b) => a.timestamp - b.timestamp);
```

**Required Fix**:
```typescript
import type { ISSPosition } from '@/lib/iss/types';
positions.sort((a: ISSPosition, b: ISSPosition) => a.timestamp - b.timestamp);
```

**Verification**: TypeScript errors on line 180 should disappear (2 errors resolved)

---

### 3. Incorrect Zod Type Inference in validation.ts (3 errors)

**Problem**: Using `_type` property which doesn't exist on Zod schemas. Zod uses `z.infer<>` for type inference, not `._type`.

**Location**: `src/lib/iss/collections/validation.ts:19-21`

**Current Code**:
```typescript
export type StoredAstronaut = typeof StoredAstronautSchema._type;
export type StoredTLE = typeof StoredTLESchema._type;
export type PassBriefing = typeof PassBriefingSchema._type;
```

**Required Fix**:
```typescript
import { z } from 'zod';
export type StoredAstronaut = z.infer<typeof StoredAstronautSchema>;
export type StoredTLE = z.infer<typeof StoredTLESchema>;
export type PassBriefing = z.infer<typeof PassBriefingSchema>;
```

**Note**: This is the correct way to infer TypeScript types from Zod schemas. The `_type` property doesn't exist.

**Verification**: TypeScript errors on lines 19, 20, 21 should disappear (3 errors resolved)

---

### 4. Broken Export Chain in sync/index.ts (3 errors)

**Problem**: Trying to export `DEFAULT_*_SYNC_INTERVAL` constants from `sync-manager.ts`, but `sync-manager.ts` doesn't export them (it only imports them for internal use).

**Location**: `src/lib/iss/sync/index.ts:16-18`

**Current Code**:
```typescript
export {
  createSyncManager,
  getDefaultSyncManager,
  resetDefaultSyncManager,
  DEFAULT_POSITION_SYNC_INTERVAL,  // ❌ Not exported from sync-manager.ts
  DEFAULT_CREW_SYNC_INTERVAL,       // ❌ Not exported from sync-manager.ts
  DEFAULT_TLE_SYNC_INTERVAL,        // ❌ Not exported from sync-manager.ts
} from "./sync-manager";
```

**Required Fix** (Option 1 - Recommended):

Replace lines 12-19 with:
```typescript
// =============================================================================
// SYNC MANAGER
// =============================================================================

export {
  createSyncManager,
  getDefaultSyncManager,
  resetDefaultSyncManager,
} from "./sync-manager";

export type { SyncConfig, SyncManager } from "./sync-manager";

// Export constants from their source files
export { DEFAULT_POSITION_SYNC_INTERVAL } from "./position-sync";
export { DEFAULT_CREW_SYNC_INTERVAL } from "./crew-sync";
export { DEFAULT_TLE_SYNC_INTERVAL } from "./tle-sync";
```

**Alternative Fix** (Option 2):

Add re-exports to `src/lib/iss/sync/sync-manager.ts` after the imports:
```typescript
// In sync-manager.ts, after line 13, add:
export { DEFAULT_POSITION_SYNC_INTERVAL } from "./position-sync";
export { DEFAULT_CREW_SYNC_INTERVAL } from "./crew-sync";
export { DEFAULT_TLE_SYNC_INTERVAL } from "./tle-sync";
```

**Recommendation**: Use Option 1 (fix in sync/index.ts) to keep the export organization clear.

**Verification**: TypeScript errors on lines 16, 17, 18 should disappear (3 errors resolved)

---

## Minor Code Cleanup (Optional but Recommended)

### 5. Unused Variables in OrbitalSolver.tsx

**Problem**: `tleLoading` and `tleError` are declared but never used

**Location**: `src/routes/iss/-components/OrbitalSolver.tsx:42`

**Current Code**:
```typescript
const { data: tle, isLoading: tleLoading, error: tleError } = useISSTLEDB();
```

**Required Fix**:
```typescript
const { data: tle } = useISSTLEDB();
```

**Verification**: TypeScript warnings on line 42 should disappear

---

### 6. Unused Variable in index.tsx

**Problem**: `fromCache` is declared but never used

**Location**: `src/routes/iss/index.tsx:104`

**Current Code**:
```typescript
const { data: position, isLoading, fromCache, error } = useISSPositionDB();
```

**Required Fix**:
```typescript
const { data: position, isLoading, error } = useISSPositionDB();
```

**Verification**: TypeScript warning on line 104 should disappear

---

### 7. Unused Variable in map.tsx

**Problem**: `isLoading` is declared but never used

**Location**: `src/routes/iss/map.tsx:128`

**Current Code**:
```typescript
const { data: position, isLoading, error } = useISSPositionDB();
```

**Required Fix**:
```typescript
const { data: position, error } = useISSPositionDB();
```

**Verification**: TypeScript warning on line 128 should disappear

---

## Verification Steps

After implementing all fixes:

1. **Run TypeScript type check**:
   ```bash
   npm run type-check
   ```
   Expected: 0 errors (or only 2 pre-existing errors in `src/lib/copilot/agent.ts`)

2. **Run production build**:
   ```bash
   npm run build
   ```
   Expected: Build succeeds

3. **Verify all imports work**:
   - Check that `StoredTLE` type can be imported in cleanup.ts
   - Check that `ISSPosition` type can be imported in gap-filling.ts
   - Check that Zod type inference works in validation.ts
   - Check that sync constants can be imported from sync/index.ts

4. **Commit changes**:
   ```bash
   git add .
   git commit -m "fix: resolve TypeScript errors in TanStack DB migration (qa-requested)

   - Add type annotations in cleanup.ts and gap-filling.ts
   - Fix Zod type inference in validation.ts (use z.infer<>)
   - Fix export chain for sync interval constants
   - Remove unused variables in component files

   All TypeScript compilation errors resolved."
   ```

---

## After Fixes

Once fixes are complete:

1. ✅ Commit changes with the message above
2. ✅ QA will automatically re-run validation
3. ✅ If type-check passes, QA should approve
4. ✅ Ready for merge to main

---

## Notes

- The migration implementation is **excellent** - this is just type safety cleanup
- All 9 errors are straightforward fixes (no logic changes needed)
- The build already succeeds, so these are type-level improvements
- Pre-existing errors in `copilot/agent.ts` are not your responsibility

**Good work on the migration!** Just need these type annotations fixed and we're good to go. 🚀

---

**QA Session**: 1
**Fix Priority**: High (blocks sign-off)
**Complexity**: Low (type annotations only)
