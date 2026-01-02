# Investigation: ISS Copilot Cloudflare Deployment Bug

**Investigation Date:** 2026-01-02
**Status:** Root Cause Identified
**Severity:** High (Feature completely broken in production)

## Executive Summary

The ISS Observation Copilot feature fails in production with the error "Cannot read properties of undefined (reading 'filter')". The root cause has been identified as **unsafe array access in `src/lib/iss/api.ts:189`** where `basicData.people.filter()` is called without defensive null checking. When the external Open Notify API call fails (network error, timeout, or ad blocker), `basicData` becomes undefined, causing the crash.

---

## Error Symptoms

### User-Facing Errors
1. **Primary Error:** "Cannot read properties of undefined (reading 'filter')"
2. **Browser Console:** `net::ERR_BLOCKED_BY_CLIENT`
3. **React Error:** #418 (hydration mismatch)

### Error Location Stack
```
TypeError: Cannot read properties of undefined (reading 'filter')
    at fetchCrewData (src/lib/iss/api.ts:189)
    at [Copilot tool execution]
```

---

## Root Cause Analysis

### Primary Root Cause: Unsafe Array Access

**File:** `src/lib/iss/api.ts`
**Line:** 189
**Code:**
```typescript
const issCrew = basicData.people.filter((p) => p.craft === "ISS");
```

**Problem:** The code assumes `basicData` is always a valid object with a `people` array. When `fetchCrewFromApi()` fails, `basicData` becomes undefined, and calling `.people.filter()` on undefined throws the error.

### Why It Fails in Production (but works locally)

| Condition | Local Dev | Production |
|-----------|-----------|------------|
| Ad blockers | Usually disabled | Often enabled - blocks "copilot" URLs |
| Network reliability | Stable localhost | Variable internet conditions |
| API rate limits | Low traffic | Higher traffic may trigger limits |
| Error propagation | Dev tools show full errors | Errors cascade to hydration failures |

### Failure Scenarios

1. **Network Failure** - `fetchCrewFromApi()` throws, `basicData` is undefined
2. **Server Timeout** - Promise rejects, error not caught
3. **Ad Blocker** - `ERR_BLOCKED_BY_CLIENT` prevents request completion
4. **JSON Parse Error** - Invalid response body causes failure
5. **API Rate Limit** - Open Notify API returns error status

---

## Evidence

### Filter Call Analysis

Comprehensive grep analysis found 5 `.filter()` calls in copilot/ISS code:

| File:Line | Risk Level | Reason |
|-----------|------------|--------|
| `knowledge.ts:54` | SAFE | Chained to `.map()` which always returns array |
| `prompts.ts:113` | SAFE | Operates on const array defined in same file |
| `store.ts:69` | SAFE | TypeScript-enforced `Message[]` parameter |
| `storage.ts:442` | SAFE | `detectGaps()` always returns `GapInfo[]` |
| **`api.ts:189`** | **UNSAFE** | External API response - no defensive check |

### API Response Validation Gap

The codebase has validation in `validateOpenNotifyResponse()` (lines 145-161), but:
- Validation is inside `fetchCrewFromApi()`
- If the server function throws before validation, `basicData` is undefined
- No try-catch wrapper around the API call in `fetchCrewData()`

**Bad Pattern (api.ts:187-189):**
```typescript
const basicData = await fetchCrewFromApi();  // Can throw!
const issCrew = basicData.people.filter(...);  // Crashes if basicData undefined
```

**Good Pattern (store.ts:191-193):**
```typescript
const state = conversationStore.state;
if (!state.conversation) return [];  // Defensive check BEFORE accessing
const trimmed = trimContext(state.conversation.messages);
```

### Architecture Clarification

**Initial Assumption:** Copilot uses Durable Objects (CopilotAgent DO)
**Actual Implementation:** Direct AI binding with `@cloudflare/ai-utils runWithTools`

The wrangler.jsonc configuration is **correct** for the actual implementation:
```json
"ai": { "binding": "AI", "remote": true }
```

No Durable Object binding is needed - the spec's mention of `CopilotAgent` DO is not implemented.

---

## Secondary Issues

### ERR_BLOCKED_BY_CLIENT

**Cause:** Browser ad blockers blocking requests containing "copilot" or "AI" patterns

**Evidence:**
- Error appears in browser network tab
- Requests to copilot-related endpoints are blocked
- Feature works when ad blocker is disabled

**Mitigation:** This contributes to the primary error - when requests are blocked, `basicData` becomes undefined.

### React Error #418 (Hydration Mismatch)

**Cause:** Cascade effect from primary error

**Explanation:**
1. Server render attempts to fetch crew data
2. Fetch fails, throws error
3. Server renders error state (or crashes)
4. Client receives different HTML than expected
5. Hydration fails with Error #418

**Fix:** Resolving the primary error will resolve hydration issues automatically.

---

## Proposed Fixes

### Fix 1: Defensive Null Check (Required)

**File:** `src/lib/iss/api.ts`
**Line:** 189

**Before:**
```typescript
const issCrew = basicData.people.filter((p) => p.craft === "ISS");
```

**After:**
```typescript
const people = basicData?.people ?? [];
const issCrew = people.filter((p) => p.craft === "ISS");
```

### Fix 2: Try-Catch Wrapper (Recommended)

**File:** `src/lib/iss/api.ts`
**Function:** `fetchCrewData()`

```typescript
export const fetchCrewData = async (): Promise<Astronaut[]> => {
  return Sentry.startSpan({ name: "Fetching Crew Data" }, async () => {
    try {
      const basicData = await fetchCrewFromApi();
      const people = basicData?.people ?? [];
      const issCrew = people.filter((p) => p.craft === "ISS");
      // ... rest of function
    } catch (error) {
      Sentry.captureException(error, {
        tags: { copilot: "crew_fetch_error" },
      });
      return []; // Return empty array instead of crashing
    }
  });
};
```

### Fix 3: Enhanced Error Handling in Agent (Recommended)

**File:** `src/lib/copilot/agent.ts`

Add additional defensive checks and more specific error messages when tool execution fails:

```typescript
// In tool execution, wrap calls with try-catch
try {
  const crewData = await fetchCrewData();
  // Process crew data...
} catch (error) {
  return {
    status: "error",
    error: {
      code: "CREW_DATA_UNAVAILABLE",
      message: "Unable to fetch ISS crew information. Please try again.",
    },
  };
}
```

### Fix 4: Optional - Defensive Checks in Knowledge/Prompts (Low Priority)

While analysis confirmed these are safe, adding optional chaining provides extra defense:

**knowledge.ts:**
```typescript
const scored = (KNOWLEDGE_BASE ?? []).map(...).filter(...);
```

**prompts.ts:**
```typescript
return (SUGGESTED_PROMPTS ?? []).filter(...);
```

---

## Verification Plan

### Unit Tests Required
- [ ] Test `fetchCrewData()` returns empty array when API fails
- [ ] Test `fetchCrewData()` handles undefined `people` property
- [ ] Test copilot agent handles crew data errors gracefully

### Integration Tests Required
- [ ] Test chat flow with simulated API failure
- [ ] Test tool execution returns user-friendly error on failure

### Production Verification
- [ ] Deploy fix to Cloudflare
- [ ] Test at https://ephemeris.observer/iss/copilot
- [ ] Verify with ad blocker enabled and disabled
- [ ] Check Sentry for reduction in filter() errors

---

## Implementation Priority

| Fix | Priority | Effort | Impact |
|-----|----------|--------|--------|
| Fix 1: Defensive null check | **P0 - Critical** | Low | Fixes crash |
| Fix 2: Try-catch wrapper | P1 - High | Low | Improves error handling |
| Fix 3: Agent error handling | P2 - Medium | Medium | Better UX |
| Fix 4: Knowledge/prompts defense | P3 - Low | Low | Extra safety |

---

## Conclusion

The root cause is **confirmed** as `src/lib/iss/api.ts:189` - unsafe access to `basicData.people` without null checking. The fix is straightforward: add defensive null checking using the `?.` operator and nullish coalescing `??` to provide a fallback empty array.

This pattern already exists in the codebase (`src/lib/copilot/store.ts`) and should be applied consistently to all external data access points.

**Estimated Fix Time:** 15-30 minutes
**Risk Level:** Low (minimal code change, follows existing patterns)
**Testing Required:** Unit tests + production verification
