# Research: Fix Crew Data Rendering Regression

**Feature**: 003-fix-crew-render  
**Created**: 2024-12-15

## Root Cause Analysis

### Finding: Proxy Service Failure

**Decision**: The regression is caused by the allorigins.win CORS proxy returning 502 errors.

**Evidence**:
```bash
$ curl -s "https://api.allorigins.win/raw?url=http%3A%2F%2Fapi.open-notify.org%2Fastros.json"
error code: 502
```

**Current Code Behavior** (`src/lib/iss/api.ts`):
```typescript
catch (e) {
  console.warn("Crew data fetch failed:", e);
  return [];  // Silent failure returns empty array
}
```

This causes the UI to render the "NO_CREW_DATA" empty state instead of the error state.

**Rationale**: The silent error handling was likely intended for graceful degradation but actually hides failures from users and makes debugging difficult.

---

## Research Tasks

### 1. CORS Proxy Alternatives

**Decision**: Implement a fallback chain with multiple proxy options.

**Alternatives Considered**:

| Proxy Service | Reliability | Speed | Notes |
|--------------|-------------|-------|-------|
| allorigins.win | ⚠️ Unstable | Fast | Currently failing with 502 |
| cors-anywhere.herokuapp.com | ❌ Deprecated | N/A | Requires manual activation |
| corsproxy.io | ✅ Active | Fast | Good alternative |
| Server-side fetch | ✅ Best | Fast | TanStack Start server function |

**Rationale**: Server-side fetch via TanStack Start `createServerFn` is the most reliable approach as it eliminates CORS entirely. External proxies are inherently unreliable.

### 2. Direct API Access Feasibility

**Decision**: Open Notify API works without proxy when called server-side.

**Evidence**:
```bash
$ curl -s "http://api.open-notify.org/astros.json" | jq '.message'
"success"
```

**API Response Structure** (confirmed working):
```json
{
  "people": [
    { "craft": "ISS", "name": "Oleg Kononenko" },
    { "craft": "ISS", "name": "Nikolai Chub" },
    ...
  ],
  "number": 12,
  "message": "success"
}
```

**Rationale**: The API itself is functioning correctly. The issue is purely client-side CORS when the proxy fails.

### 3. Error Handling Best Practices

**Decision**: Throw errors instead of returning empty arrays to let TanStack Query handle error state.

**Current Problem**:
- `fetchCrewData` catches errors and returns `[]`
- TanStack Query sees a successful response with empty data
- UI shows "NO_CREW_DATA" (empty state) instead of "CREW_DATA_UNAVAILABLE" (error state)

**Correct Approach**:
- Let errors propagate from `fetchCrewData`
- TanStack Query's `isError` will be true
- UI correctly shows the error state

**Rationale**: TanStack Query is designed to handle errors. The error boundary pattern in the constitution requires surfacing errors, not hiding them.

---

## Implementation Strategy

### Recommended Approach: Server-Side Fetch with Server Function

1. Create a TanStack Start server function for crew data fetching
2. Move `fetchCrewData` logic to server-side where CORS doesn't apply
3. Remove proxy dependency entirely
4. Let errors propagate for proper error state handling

### Fallback Chain (if server function not viable)

```
1. Try server function (TanStack Start)
2. Fallback: Try direct API (may fail due to CORS)  
3. Fallback: Try corsproxy.io
4. Fallback: Try allorigins.win
5. Error: Throw to trigger error state
```

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Open Notify API changes format | Low | High | Type validation on response |
| All proxies fail simultaneously | Medium | High | Server-side fetch eliminates dependency |
| Server function adds complexity | Low | Low | Minimal change, follows constitution patterns |

---

## Conclusion

The fix should:
1. **Primary**: Convert to server-side fetch via `createServerFn` (eliminates CORS issue)
2. **Secondary**: Remove silent error handling - let errors propagate
3. **Observability**: Errors already captured by Sentry via `startSpan` wrapper

This approach aligns with the constitution's requirements for graceful degradation (show error state, not empty state) and proper observability.
