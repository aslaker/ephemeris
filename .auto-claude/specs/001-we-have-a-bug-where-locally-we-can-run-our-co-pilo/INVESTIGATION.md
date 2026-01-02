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
