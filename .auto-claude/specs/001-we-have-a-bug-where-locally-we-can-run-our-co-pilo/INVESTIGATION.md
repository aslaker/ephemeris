# ISS Copilot Cloudflare Deployment Bug - Investigation Report

**Date:** 2026-01-02
**Status:** Root Cause Identified
**Severity:** High
**Affected URL:** https://ephemeris.observer/iss/copilot

---

## Executive Summary

The ISS Observation Copilot works in local development but fails in production with the error "Cannot read properties of undefined (reading filter)". The root cause has been identified as **unsafe array access in src/lib/iss/api.ts:189** where an external API response is assumed to always be valid.

---

## Symptoms Observed

1. **Primary Error:** Cannot read properties of undefined (reading filter)
2. **Browser Console:** net::ERR_BLOCKED_BY_CLIENT (network request blocked)
3. **React Error:** #418 (hydration mismatch between server and client)

---

## Root Cause Analysis

### Primary Root Cause: Unsafe Array Access on External API Response

**File:** src/lib/iss/api.ts
**Line:** 189

The code at line 189 calls basicData.people.filter() without checking if basicData or basicData.people is defined first.

**Why this fails in production:**

1. fetchCrewFromApi() makes an external HTTP request to http://api.open-notify.org/astros.json
2. In production, this request can fail due to:
   - Ad blockers blocking copilot or AI related URLs (ERR_BLOCKED_BY_CLIENT)
   - Network timeouts or server errors
   - CORS issues specific to Cloudflare Workers
   - Rate limiting by the external API
3. When the request fails, basicData becomes undefined
4. Accessing undefined.people throws Cannot read properties of undefined
5. This error propagates up and causes React hydration mismatch (Error #418)

### Evidence: Complete Filter Call Analysis

| File:Line | Code | Risk | Verdict |
|-----------|------|------|---------|
| knowledge.ts:54 | .map(...).filter(...) | None | SAFE - .map() always returns array |
| prompts.ts:113 | SUGGESTED_PROMPTS.filter(...) | None | SAFE - Constant array |
| store.ts:69 | messages.filter(...) | Very Low | SAFE - TypeScript-enforced Message[] |
| storage.ts:442 | gaps.filter(...) | None | SAFE - Internal function always returns array |
| **api.ts:189** | basicData.people.filter(...) | **HIGH** | **UNSAFE - External API response** |

### Why It Works Locally

- Local development uses a stable network connection
- No ad blockers interfere with API calls
- The Open Notify API responds reliably during development
- Lower network latency reduces chance of timeouts

---

## Secondary Issue: Ad Blocker Interference

**Error:** net::ERR_BLOCKED_BY_CLIENT

Ad blockers may block requests containing keywords like copilot, ai, chat, agent.

This explains why the error is intermittent and environment-specific.

**Mitigation:** Not addressed in this fix - defensive coding handles the blocked request case.

---

## Tertiary Issue: React Hydration Mismatch

**Error:** React Error #418

This is a **cascade effect** of the primary error:
1. Server-side render attempts to fetch crew data
2. API call fails, throwing an error
3. Error boundary catches on client but server rendered differently
4. React detects mismatch = Error #418

**Resolution:** Fixing the primary error resolves hydration issues.

---

## Proposed Fixes

### Fix 1: Defensive Array Access in fetchCrewData (REQUIRED)

**File:** src/lib/iss/api.ts line 189

**Before:**
basicData.people.filter((p) => p.craft === "ISS")

**After:**
const people = basicData?.people ?? [];
const issCrew = people.filter((p) => p.craft === "ISS");

**Pattern from:** src/lib/copilot/store.ts (line 191: if (\!state.conversation) return [])

### Fix 2: Add Try-Catch Error Handling (RECOMMENDED)

Wrap the entire fetch operation with error handling to return empty array on failure and capture to Sentry.

### Fix 3: Improve Agent Error Handling (RECOMMENDED)

**File:** src/lib/copilot/agent.ts

Add additional try-catch around tool execution to handle cases where ISS data is unavailable.

### Fix 4: Defensive Checks in Agent Class (OPTIONAL)

**File:** src/lib/copilot/agent-class.ts

Add binding validation on instantiation to fail fast if AI binding is missing.

---

## Implementation Priority

| Priority | File | Change | Impact |
|----------|------|--------|--------|
| P0 | src/lib/iss/api.ts | Add defensive null check on line 189 | Fixes primary crash |
| P1 | src/lib/copilot/agent.ts | Improve error handling | Better UX on failures |
| P2 | src/lib/copilot/agent-class.ts | Validate bindings | Earlier error detection |
| P3 | src/lib/copilot/knowledge.ts | Add optional chaining | Defense in depth |

---

## Validation Steps

After implementing fixes:

1. **Run Type Check:** npm run type-check
2. **Run Lint:** npm run check
3. **Run Tests:** npm run test
4. **Build:** npm run build
5. **Local Test:** npm run dev then navigate to http://localhost:3000/iss/copilot
6. **Remote Test:** wrangler dev --remote to test with actual Cloudflare bindings
7. **Production Deploy:** npm run deploy then verify at https://ephemeris.observer/iss/copilot

---

## Configuration Notes

### Current Architecture (Verified Correct)

The copilot does **NOT** use Durable Objects as originally assumed in the spec. Instead:

- **AI Binding:** Direct @cloudflare/ai-utils with runWithTools()
- **State Management:** Client-side TanStack Store (src/lib/copilot/store.ts)
- **Server Functions:** TanStack Start createServerFn() pattern

**wrangler.jsonc Configuration (VERIFIED CORRECT):**
ai: { binding: "AI", remote: true }

No changes to wrangler.jsonc are required.

---

## Appendix: Session Discovery Notes

- Copilot uses @cloudflare/ai-utils with runWithTools(), not Durable Objects
- AI binding is correctly configured in wrangler.jsonc
- All Copilot UI components already have proper defensive null checks
- The store layer (store.ts) has proper null handling patterns to follow
- Agent backend validates AI binding and has Sentry breadcrumbs

---

## Conclusion

The root cause of the production failure is **unsafe array access on line 189 of src/lib/iss/api.ts**. The fix is straightforward: add defensive null checking using optional chaining and nullish coalescing (?. and ??). This pattern is already used successfully elsewhere in the codebase (e.g., store.ts).

Once implemented, the hydration error (#418) should resolve automatically as a side effect, and the copilot will gracefully handle network failures instead of crashing.
