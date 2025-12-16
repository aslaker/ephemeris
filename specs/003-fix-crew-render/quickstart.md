# Quickstart: Fix Crew Data Rendering Regression

**Feature**: 003-fix-crew-render  
**Created**: 2024-12-15

## Problem Summary

The crew page (`/iss/crew`) shows "NO_CREW_DATA" instead of the actual crew manifest because the CORS proxy (allorigins.win) is returning 502 errors.

## Root Cause

```typescript
// src/lib/iss/api.ts - Line 148-151
catch (e) {
  console.warn("Crew data fetch failed:", e);
  return [];  // ❌ Silent failure - shows empty state instead of error
}
```

## Quick Fix Steps

### Step 1: Convert to Server Function

Create a server function to bypass CORS entirely:

```typescript
// src/lib/iss/api.ts

import { createServerFn } from "@tanstack/react-start";

// Server function - runs server-side, no CORS issues
const fetchCrewFromApi = createServerFn({ method: "GET" }).handler(async () => {
  const response = await fetch("http://api.open-notify.org/astros.json");
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
});
```

### Step 2: Update fetchCrewData

Replace the proxy-based fetch with the server function:

```typescript
export const fetchCrewData = async (): Promise<Astronaut[]> => {
  return Sentry.startSpan({ name: "Fetching Crew Data" }, async () => {
    const basicData = await fetchCrewFromApi();
    
    if (basicData.message !== "success") {
      throw new Error("API returned error status");
    }
    
    const issCrew = (basicData.people || []).filter(
      (p: { craft: string }) => p.craft === "ISS"
    );
    
    // ... enrichment logic unchanged ...
    
    return enrichedCrew;
  });
};
```

### Step 3: Remove Silent Error Handling

Let errors propagate so TanStack Query shows the error state:

```typescript
// ❌ REMOVE THIS:
catch (e) {
  console.warn("Crew data fetch failed:", e);
  return [];
}

// ✅ Let errors propagate naturally
// TanStack Query will handle them and set isError: true
```

## Verification

1. Navigate to `/iss/crew`
2. Should see crew cards (success) or error message (if API down)
3. Should NOT see "NO_CREW_DATA" when API is working

## Files Changed

| File | Change |
|------|--------|
| `src/lib/iss/api.ts` | Add server function, remove silent catch |

## Testing Commands

```bash
# Run dev server
bun run dev

# Test API directly
curl http://api.open-notify.org/astros.json
```
