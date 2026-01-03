# Offline Persistence Testing - TanStack DB Migration

**Subtask**: 8.1 - Verify data persists correctly and app works offline
**Date**: 2026-01-03
**Test Environment**: Chrome/Firefox DevTools (Network & Application tabs)

---

## Test Objectives

Verify that the TanStack DB migration successfully provides:
1. ✅ Data persists across browser sessions
2. ✅ App loads instantly with cached data
3. ✅ Offline mode shows cached data
4. ✅ Sync resumes when back online

---

## Test Setup

### Prerequisites
- Development server running (`npm run dev`)
- Browser with DevTools (Chrome, Firefox, or Edge)
- Clean browser state (or documented baseline)

### Initial State Verification
1. Open browser DevTools (F12)
2. Navigate to Application → IndexedDB
3. Verify `ephemeris-iss` database exists with tables:
   - `positions`
   - `crew`
   - `tle`
   - `briefings`

---

## Test Scenarios

### Test 1: Initial Data Load and Sync

**Objective**: Verify sync manager fetches and stores data on first load

**Steps**:
1. Clear IndexedDB: Application → IndexedDB → ephemeris-iss → Delete database
2. Navigate to `http://localhost:3000/iss`
3. Open DevTools Console and Network tab
4. Observe sync activity in console

**Expected Results**:
- ✅ Sync manager starts automatically (logged to console)
- ✅ Position sync requests every 5 seconds
- ✅ Crew sync request within 1 second
- ✅ TLE sync request within 1 second
- ✅ Data appears in IndexedDB tables
- ✅ UI updates with ISS position, crew count

**Verification**:
```
Console log should show:
- "[ISSLayout] Migration completed successfully" (if migrating)
- Sync results from position-sync.ts
- Sync results from crew-sync.ts
- Sync results from tle-sync.ts
```

---

### Test 2: Data Persistence Across Sessions

**Objective**: Verify data remains in IndexedDB after browser refresh

**Steps**:
1. Complete Test 1 to populate data
2. Verify data exists in IndexedDB (Application → IndexedDB → ephemeris-iss)
3. Count records in `positions` table (should have 2+ records)
4. Note the latest position timestamp
5. **Hard refresh**: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
6. Check IndexedDB again

**Expected Results**:
- ✅ All data remains in IndexedDB after refresh
- ✅ Position count increases (new syncs added)
- ✅ Latest position timestamp is more recent
- ✅ Crew data unchanged (1 hour interval)
- ✅ TLE data unchanged (1 hour interval)

**Verification**:
```
IndexedDB → ephemeris-iss → positions:
- Records from previous session preserved
- New records added from sync after refresh

UI:
- ISS position loads instantly (from cache)
- No loading spinner on page load
```

---

### Test 3: Offline Mode with Cached Data

**Objective**: Verify app works offline using only cached data

**Steps**:
1. Complete Test 1 to populate data
2. Verify data in all IndexedDB tables
3. **Enable offline mode**:
   - DevTools → Network tab → Throttling dropdown → Offline
4. Hard refresh the page (Ctrl+Shift+R)
5. Navigate to different pages: /iss, /iss/map, /iss/crew, /iss/passes

**Expected Results**:
- ✅ Page loads successfully (no network errors block render)
- ✅ ISS position displays from cache (last known position)
- ✅ Map shows ISS location from cache
- ✅ Crew page shows astronauts from cache
- ✅ Passes page calculates using cached TLE data
- ✅ No sync requests in Network tab (offline)
- ✅ UI indicates data is from cache (no fresh updates)

**Verification**:
```
Network tab:
- No successful API requests (all fail or none attempted)

Application → IndexedDB:
- Data remains accessible
- useLiveQuery hooks read from IndexedDB

UI:
- StatsPanel shows position
- CrewCard shows astronaut list
- PassesList shows upcoming passes
- No "loading..." states blocking content
```

---

### Test 4: Sync Resumes After Coming Back Online

**Objective**: Verify sync manager resumes when network returns

**Steps**:
1. Start with app in offline mode (from Test 3)
2. Open DevTools Console
3. **Disable offline mode**:
   - DevTools → Network tab → Throttling dropdown → No throttling
4. Observe console and Network tab
5. Wait 5-10 seconds

**Expected Results**:
- ✅ Sync requests resume immediately
- ✅ Position sync fetches new data (5 second interval)
- ✅ New positions inserted into IndexedDB
- ✅ UI updates with fresh ISS position
- ✅ Network tab shows successful API requests
- ✅ No errors in console

**Verification**:
```
Console:
- "Sync completed" messages resume
- No errors from failed sync attempts

Network tab:
- GET requests to ISS position API (every 5s)
- Successful responses (200 status)

IndexedDB:
- New position records added with current timestamps
```

---

### Test 5: Tab Visibility Handling

**Objective**: Verify sync pauses when tab is hidden

**Steps**:
1. Start with app running normally (online, sync active)
2. Open DevTools Console
3. Switch to a different browser tab or minimize window
4. Wait 15+ seconds
5. Switch back to the ISS tab
6. Observe console and Network tab

**Expected Results**:
- ✅ Sync pauses when tab is hidden (visible in console logs)
- ✅ No API requests while tab is hidden (check Network tab timestamps)
- ✅ Sync resumes immediately when tab becomes visible
- ✅ Fresh data fetched on resume
- ✅ UI updates with current position

**Verification**:
```
Console:
- May see visibility change events logged
- Sync activity stops when hidden
- Sync activity resumes when visible

Network tab:
- Gap in API request timestamps during hidden period
- Requests resume when tab active
```

---

### Test 6: Migration from Legacy Data

**Objective**: Verify existing Dexie data migrates to new collections

**Prerequisites**:
- Only run this test if you have legacy data from before the migration
- If starting fresh, skip this test

**Steps**:
1. Clear localStorage migration flag:
   - DevTools → Application → Local Storage
   - Delete key: `ephemeris-migration-complete`
2. Ensure old Dexie data exists in IndexedDB
3. Hard refresh the page
4. Observe migration progress UI and console

**Expected Results**:
- ✅ Migration UI appears ("INITIALIZING_DATA_LAYER")
- ✅ Console logs successful migration with counts
- ✅ All legacy data transferred to new collections
- ✅ Migration flag set in localStorage
- ✅ Sync manager starts after migration
- ✅ App continues normally

**Verification**:
```
Console:
"[ISSLayout] Migration completed successfully: X positions, Y crew, Z TLE, W briefings"

IndexedDB:
- ephemeris-iss database contains migrated data
- Record counts match legacy tables

LocalStorage:
- ephemeris-migration-complete: true
```

---

### Test 7: Long-term Data Retention

**Objective**: Verify cleanup jobs maintain reasonable data volume

**Steps**:
1. Let app run for 30+ minutes (or simulate with manual data)
2. Check IndexedDB position record count
3. Verify old positions are cleaned up
4. Verify TLE data is not duplicated

**Expected Results**:
- ✅ Position records older than retention period removed
- ✅ TLE data limited to latest record (or configurable retention)
- ✅ Crew data updated periodically (1 hour interval)
- ✅ Database size remains reasonable (<50MB for normal use)

**Verification**:
```
IndexedDB → ephemeris-iss → positions:
- Records within retention window (check timestamp)
- No excessive accumulation

Storage quota:
Application → Storage → Usage
- Reasonable total storage (<50MB)
```

---

## Test Results Summary

### ✅ PASSED Tests
- [ ] Test 1: Initial Data Load and Sync
- [ ] Test 2: Data Persistence Across Sessions
- [ ] Test 3: Offline Mode with Cached Data
- [ ] Test 4: Sync Resumes After Coming Back Online
- [ ] Test 5: Tab Visibility Handling
- [ ] Test 6: Migration from Legacy Data (if applicable)
- [ ] Test 7: Long-term Data Retention

### ❌ FAILED Tests
_(Document any failures here)_

### ⚠️ ISSUES FOUND
_(Document any issues, edge cases, or concerns)_

---

## Performance Observations

### Load Times
- **Initial load** (empty cache): ___ ms
- **Cached load** (with data): ___ ms
- **Offline load**: ___ ms

### Sync Performance
- **Position sync latency**: ___ ms (target: <500ms)
- **Crew sync latency**: ___ ms
- **TLE sync latency**: ___ ms

### Storage Usage
- **Positions**: ___ records, ___ KB
- **Crew**: ___ records, ___ KB
- **TLE**: ___ records, ___ KB
- **Briefings**: ___ records, ___ KB
- **Total**: ___ KB

---

## Acceptance Criteria Verification

Based on subtask 8.1 acceptance criteria:

1. ✅ **Data persists across browser sessions**
   - Status: [ ] PASS / [ ] FAIL
   - Notes: _________________________________

2. ✅ **App loads instantly with cached data**
   - Status: [ ] PASS / [ ] FAIL
   - Notes: _________________________________

3. ✅ **Offline mode shows cached data**
   - Status: [ ] PASS / [ ] FAIL
   - Notes: _________________________________

4. ✅ **Sync resumes when back online**
   - Status: [ ] PASS / [ ] FAIL
   - Notes: _________________________________

---

## Browser Compatibility

Test in multiple browsers to ensure cross-browser compatibility:

- [ ] Chrome/Chromium ___
- [ ] Firefox ___
- [ ] Safari (if available) ___
- [ ] Edge ___

---

## Conclusion

**Overall Status**: [ ] PASS / [ ] FAIL

**Summary**:
_Document overall assessment of offline persistence functionality_

**Issues to Address**:
_List any blocking issues that need fixes before marking complete_

**Recommendations**:
_Suggest any improvements or follow-up work_

---

## Tester Notes

_Add any additional observations, edge cases discovered, or questions that arose during testing_
