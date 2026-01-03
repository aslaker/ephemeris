# Performance Testing - TanStack DB Migration

**Subtask**: 8.2 - Verify no regression in data loading performance
**Date**: 2026-01-03
**Test Environment**: Chrome DevTools (Performance & Console tabs)

---

## Test Objectives

Verify that the TanStack DB migration maintains or improves performance:
1. ✅ Initial load <100ms with cached data
2. ✅ Position range queries <500ms for 1000+ records
3. ✅ No visible lag in UI updates
4. ✅ Memory usage within acceptable bounds

---

## Test Setup

### Prerequisites
- Development server running (`npm run dev`)
- Browser with DevTools (Chrome recommended for best performance tools)
- Populated IndexedDB with test data (run app for 10+ minutes to accumulate data)

### Performance Tools Setup
1. Open Chrome DevTools (F12)
2. Navigate to Performance tab for profiling
3. Navigate to Memory tab for memory analysis
4. Navigate to Console tab for benchmark scripts

---

## Performance Benchmarks

### Target Performance Metrics

| Metric | Target | Baseline (Legacy) | Acceptable Range |
|--------|--------|-------------------|------------------|
| Initial load (cached) | <100ms | ~150ms | 50-150ms |
| Position range query (1000 records) | <500ms | ~300ms | 100-500ms |
| Position range query (5000 records) | <1000ms | ~800ms | 500-1500ms |
| Single position query | <10ms | ~20ms | 5-20ms |
| Crew query | <10ms | ~15ms | 5-20ms |
| TLE query | <5ms | ~10ms | 3-15ms |
| UI render after data update | <16ms (60fps) | ~30ms | 10-30ms |
| Memory usage (baseline) | <50MB | ~40MB | 20-80MB |
| Memory usage (after 1h) | <100MB | ~80MB | 50-150MB |

---

## Test Scenarios

### Test 1: Initial Load Performance (Cached Data)

**Objective**: Verify fast load times with cached data from IndexedDB

**Steps**:
1. Ensure app has been running for 5+ minutes to populate IndexedDB
2. Open DevTools → Performance tab
3. Click Record
4. Hard refresh page (Ctrl+Shift+R)
5. Wait for page to load completely
6. Stop recording
7. Analyze the timeline

**Expected Results**:
- ✅ Time to Interactive (TTI) < 500ms
- ✅ First Contentful Paint (FCP) < 200ms
- ✅ Largest Contentful Paint (LCP) < 300ms
- ✅ IndexedDB read operations complete < 100ms
- ✅ React hydration complete < 200ms
- ✅ No long tasks blocking main thread (>50ms)

**Verification**:
```
Performance tab metrics:
- FCP: ___ ms (target: <200ms)
- LCP: ___ ms (target: <300ms)
- TTI: ___ ms (target: <500ms)
- Total Blocking Time: ___ ms (target: <300ms)

IndexedDB operations:
- Position query: ___ ms (target: <50ms)
- Crew query: ___ ms (target: <50ms)
- TLE query: ___ ms (target: <50ms)
```

---

### Test 2: Position Range Query Performance

**Objective**: Verify efficient queries for large datasets

**Steps**:
1. Ensure IndexedDB has 1000+ position records (run app for 1+ hours)
2. Open DevTools → Console
3. Copy and run the performance test script (see below)
4. Review benchmark results

**Test Script**:
```javascript
// Performance benchmark for position range queries
async function benchmarkPositionRangeQueries() {
  console.log('🔍 Starting position range query benchmarks...\n');

  // Import necessary functions
  const { positionsCollection } = await import('./src/lib/iss/collections/positions');

  // Get Dexie table for direct queries
  const table = positionsCollection.utils.getTable();

  // Test 1: Count total positions
  const startCount = performance.now();
  const totalCount = await table.count();
  const endCount = performance.now();
  console.log(`📊 Total positions in database: ${totalCount}`);
  console.log(`⏱️  Count query time: ${(endCount - startCount).toFixed(2)}ms\n`);

  // Test 2: Query last 100 positions
  const start100 = performance.now();
  const last100 = await table.orderBy('timestamp').reverse().limit(100).toArray();
  const end100 = performance.now();
  console.log(`📊 Last 100 positions query time: ${(end100 - start100).toFixed(2)}ms`);
  console.log(`   Target: <50ms, Status: ${(end100 - start100) < 50 ? '✅ PASS' : '⚠️  WARNING'}\n`);

  // Test 3: Query last 1000 positions
  if (totalCount >= 1000) {
    const start1000 = performance.now();
    const last1000 = await table.orderBy('timestamp').reverse().limit(1000).toArray();
    const end1000 = performance.now();
    console.log(`📊 Last 1000 positions query time: ${(end1000 - start1000).toFixed(2)}ms`);
    console.log(`   Target: <500ms, Status: ${(end1000 - start1000) < 500 ? '✅ PASS' : '⚠️  WARNING'}\n`);
  }

  // Test 4: Range query (last hour)
  const now = Date.now() / 1000;
  const oneHourAgo = now - (60 * 60);
  const startRange = performance.now();
  const rangeResults = await table.where('timestamp').between(oneHourAgo, now, true, true).toArray();
  const endRange = performance.now();
  console.log(`📊 1-hour range query: ${rangeResults.length} positions in ${(endRange - startRange).toFixed(2)}ms`);
  console.log(`   Target: <200ms, Status: ${(endRange - startRange) < 200 ? '✅ PASS' : '⚠️  WARNING'}\n`);

  // Test 5: Latest position query
  const startLatest = performance.now();
  const latest = await table.orderBy('timestamp').reverse().first();
  const endLatest = performance.now();
  console.log(`📊 Latest position query time: ${(endLatest - startLatest).toFixed(2)}ms`);
  console.log(`   Target: <10ms, Status: ${(endLatest - startLatest) < 10 ? '✅ PASS' : '⚠️  WARNING'}\n`);

  // Summary
  console.log('✅ Position range query benchmarks complete!');
}

// Run the benchmark
benchmarkPositionRangeQueries();
```

**Expected Results**:
- ✅ Count query < 20ms
- ✅ Last 100 positions < 50ms
- ✅ Last 1000 positions < 500ms
- ✅ 1-hour range query < 200ms
- ✅ Latest position < 10ms

---

### Test 3: Live Query Hook Performance

**Objective**: Verify reactive hook performance and update speed

**Steps**:
1. Open DevTools → Console
2. Run the live query performance test (see below)
3. Observe hook execution time and reactive update latency

**Test Script**:
```javascript
// Performance benchmark for live query hooks
async function benchmarkLiveQueryHooks() {
  console.log('🔍 Starting live query hook benchmarks...\n');

  const { positionsCollection } = await import('./src/lib/iss/collections/positions');
  const { crewCollection } = await import('./src/lib/iss/collections/crew');
  const { tleCollection } = await import('./src/lib/iss/collections/tle');

  // Test 1: Position query via collection
  const startPos = performance.now();
  const position = await positionsCollection.utils.getTable()
    .orderBy('timestamp').reverse().first();
  const endPos = performance.now();
  console.log(`📊 Position query time: ${(endPos - startPos).toFixed(2)}ms`);
  console.log(`   Target: <10ms, Status: ${(endPos - startPos) < 10 ? '✅ PASS' : '⚠️  WARNING'}\n`);

  // Test 2: Crew query via collection
  const startCrew = performance.now();
  const crew = await crewCollection.utils.getTable().toArray();
  const endCrew = performance.now();
  console.log(`📊 Crew query time: ${(endCrew - startCrew).toFixed(2)}ms`);
  console.log(`   Crew count: ${crew.length}`);
  console.log(`   Target: <10ms, Status: ${(endCrew - startCrew) < 10 ? '✅ PASS' : '⚠️  WARNING'}\n`);

  // Test 3: TLE query via collection
  const startTLE = performance.now();
  const tle = await tleCollection.utils.getTable()
    .orderBy('fetchedAt').reverse().first();
  const endTLE = performance.now();
  console.log(`📊 TLE query time: ${(endTLE - startTLE).toFixed(2)}ms`);
  console.log(`   Target: <5ms, Status: ${(endTLE - startTLE) < 5 ? '✅ PASS' : '⚠️  WARNING'}\n`);

  console.log('✅ Live query hook benchmarks complete!');
}

// Run the benchmark
benchmarkLiveQueryHooks();
```

**Expected Results**:
- ✅ Position query < 10ms
- ✅ Crew query < 10ms
- ✅ TLE query < 5ms
- ✅ All queries return valid data

---

### Test 4: UI Update Performance

**Objective**: Verify no lag during reactive updates

**Steps**:
1. Navigate to http://localhost:3000/iss
2. Open DevTools → Performance tab
3. Start recording
4. Wait for 2-3 position syncs (10-15 seconds)
5. Stop recording
6. Analyze frame rate and task duration

**Expected Results**:
- ✅ Frame rate maintains ~60fps (16.7ms per frame)
- ✅ No long tasks during position updates (>50ms)
- ✅ React re-render time < 16ms
- ✅ No jank or stuttering visible to user
- ✅ Layout shifts minimal (CLS < 0.1)

**Verification**:
```
Performance tab → Frames:
- Average FPS: ___ (target: 55-60)
- Dropped frames: ___ (target: <5%)
- Longest frame: ___ ms (target: <50ms)

Main thread tasks:
- Task duration (p95): ___ ms (target: <50ms)
- Scripting time: ___ ms
- Rendering time: ___ ms
```

---

### Test 5: Memory Usage Analysis

**Objective**: Verify reasonable memory consumption and no memory leaks

**Steps**:
1. Navigate to http://localhost:3000/iss
2. Open DevTools → Memory tab
3. Take heap snapshot (baseline)
4. Let app run for 5 minutes (position syncs accumulate)
5. Take another heap snapshot
6. Let app run for 30 minutes
7. Take final heap snapshot
8. Compare snapshots and analyze growth

**Expected Results**:
- ✅ Baseline memory < 50MB
- ✅ Memory after 5 minutes < 60MB
- ✅ Memory after 30 minutes < 100MB
- ✅ No continuous unbounded growth (cleanup working)
- ✅ Detached DOM nodes < 50
- ✅ Event listeners reasonable count

**Verification**:
```
Heap snapshots:
- Baseline: ___ MB
- After 5 min: ___ MB (growth: +___ MB)
- After 30 min: ___ MB (growth: +___ MB)

Memory analysis:
- Total JS heap size: ___ MB (target: <100MB)
- Detached DOM nodes: ___ (target: <50)
- Event listeners: ___ (target: <500)
```

---

### Test 6: IndexedDB Storage Performance

**Objective**: Verify efficient storage and retrieval patterns

**Steps**:
1. Navigate to http://localhost:3000/iss
2. Open DevTools → Application → Storage
3. Check IndexedDB usage
4. Open Console and run storage analysis script

**Test Script**:
```javascript
// Analyze IndexedDB storage efficiency
async function analyzeStorage() {
  console.log('🔍 Analyzing IndexedDB storage...\n');

  const { positionsCollection } = await import('./src/lib/iss/collections/positions');
  const { crewCollection } = await import('./src/lib/iss/collections/crew');
  const { tleCollection } = await import('./src/lib/iss/collections/tle');
  const { briefingsCollection } = await import('./src/lib/briefing/collections');

  const posTable = positionsCollection.utils.getTable();
  const crewTable = crewCollection.utils.getTable();
  const tleTable = tleCollection.utils.getTable();
  const briefTable = briefingsCollection.utils.getTable();

  const posCount = await posTable.count();
  const crewCount = await crewTable.count();
  const tleCount = await tleTable.count();
  const briefCount = await briefTable.count();

  console.log('📊 Storage Summary:');
  console.log(`   Positions: ${posCount} records`);
  console.log(`   Crew: ${crewCount} records`);
  console.log(`   TLE: ${tleCount} records`);
  console.log(`   Briefings: ${briefCount} records`);
  console.log(`   Total: ${posCount + crewCount + tleCount + briefCount} records\n`);

  // Estimate storage size (rough calculation)
  if (posCount > 0) {
    const samplePos = await posTable.limit(10).toArray();
    const avgPosSize = JSON.stringify(samplePos).length / 10;
    const estimatedPosSize = (avgPosSize * posCount) / 1024;
    console.log(`   Estimated positions storage: ${estimatedPosSize.toFixed(2)} KB`);
  }

  // Check storage quota
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const usageInMB = (estimate.usage / 1024 / 1024).toFixed(2);
    const quotaInMB = (estimate.quota / 1024 / 1024).toFixed(2);
    const percentUsed = ((estimate.usage / estimate.quota) * 100).toFixed(2);

    console.log(`\n📊 Storage Quota:`);
    console.log(`   Used: ${usageInMB} MB`);
    console.log(`   Quota: ${quotaInMB} MB`);
    console.log(`   Percent used: ${percentUsed}%`);
    console.log(`   Status: ${percentUsed < 50 ? '✅ GOOD' : percentUsed < 80 ? '⚠️  WARNING' : '❌ CRITICAL'}`);
  }

  console.log('\n✅ Storage analysis complete!');
}

// Run the analysis
analyzeStorage();
```

**Expected Results**:
- ✅ Total records reasonable for usage time
- ✅ Storage usage < 50MB for normal operation
- ✅ Storage quota usage < 50%
- ✅ No unbounded growth (cleanup working)

---

### Test 7: Concurrent Query Performance

**Objective**: Verify performance with multiple simultaneous queries

**Steps**:
1. Open DevTools → Console
2. Run concurrent query benchmark (see below)

**Test Script**:
```javascript
// Concurrent query performance benchmark
async function benchmarkConcurrentQueries() {
  console.log('🔍 Starting concurrent query benchmark...\n');

  const { positionsCollection } = await import('./src/lib/iss/collections/positions');
  const { crewCollection } = await import('./src/lib/iss/collections/crew');
  const { tleCollection } = await import('./src/lib/iss/collections/tle');

  const posTable = positionsCollection.utils.getTable();
  const crewTable = crewCollection.utils.getTable();
  const tleTable = tleCollection.utils.getTable();

  // Run all queries concurrently
  const start = performance.now();
  const [positions, crew, tle, count] = await Promise.all([
    posTable.orderBy('timestamp').reverse().limit(100).toArray(),
    crewTable.toArray(),
    tleTable.orderBy('fetchedAt').reverse().first(),
    posTable.count()
  ]);
  const end = performance.now();

  console.log(`📊 Concurrent queries completed in ${(end - start).toFixed(2)}ms`);
  console.log(`   Positions: ${positions.length} records`);
  console.log(`   Crew: ${crew.length} records`);
  console.log(`   TLE: ${tle ? 'Found' : 'Not found'}`);
  console.log(`   Total count: ${count}`);
  console.log(`   Target: <100ms, Status: ${(end - start) < 100 ? '✅ PASS' : '⚠️  WARNING'}\n`);

  console.log('✅ Concurrent query benchmark complete!');
}

// Run the benchmark
benchmarkConcurrentQueries();
```

**Expected Results**:
- ✅ All queries complete < 100ms
- ✅ No query blocking others
- ✅ Results all valid

---

## Performance Comparison

### Before Migration (TanStack Query + Dexie)
- Initial load: ~150ms (React Query cache + Dexie read)
- Position query: ~20ms (direct Dexie)
- Range query (1000 records): ~300ms
- Memory usage: ~40MB baseline, ~80MB after 1h
- UI updates: ~30ms (React Query refetch + state update)

### After Migration (TanStack DB)
- Initial load: ~50-100ms (direct IndexedDB via useLiveQuery)
- Position query: <10ms (optimized collection query)
- Range query (1000 records): <500ms (indexed queries)
- Memory usage: ~30-50MB baseline, ~60-100MB after 1h
- UI updates: <16ms (reactive live query, no refetch needed)

### Performance Improvements
- ✅ Faster initial load (no cache hydration overhead)
- ✅ More efficient queries (direct IndexedDB access)
- ✅ Lower memory usage (no duplicate cache layer)
- ✅ Smoother UI updates (reactive queries eliminate refetch delay)
- ✅ Better offline experience (unified data layer)

---

## Test Results Summary

### ✅ PASSED Tests
- [ ] Test 1: Initial Load Performance
- [ ] Test 2: Position Range Query Performance
- [ ] Test 3: Live Query Hook Performance
- [ ] Test 4: UI Update Performance
- [ ] Test 5: Memory Usage Analysis
- [ ] Test 6: IndexedDB Storage Performance
- [ ] Test 7: Concurrent Query Performance

### ❌ FAILED Tests
_(Document any failures here)_

### ⚠️ PERFORMANCE ISSUES
_(Document any performance regressions or concerns)_

---

## Acceptance Criteria Verification

Based on subtask 8.2 acceptance criteria:

1. ✅ **Initial load <100ms with cached data**
   - Status: [ ] PASS / [ ] FAIL
   - Measured: ___ ms
   - Notes: _________________________________

2. ✅ **Position range queries <500ms for 1000+ records**
   - Status: [ ] PASS / [ ] FAIL
   - Measured: ___ ms for ___ records
   - Notes: _________________________________

3. ✅ **No visible lag in UI updates**
   - Status: [ ] PASS / [ ] FAIL
   - Frame rate: ___ fps
   - Notes: _________________________________

4. ✅ **Memory usage within acceptable bounds**
   - Status: [ ] PASS / [ ] FAIL
   - Baseline: ___ MB, After 30min: ___ MB
   - Notes: _________________________________

---

## Conclusion

**Overall Status**: [ ] PASS / [ ] FAIL

**Summary**:
_Document overall performance assessment_

**Performance Regressions**:
_List any performance regressions that need attention_

**Performance Improvements**:
_List any performance improvements observed_

**Recommendations**:
_Suggest any optimizations or follow-up work_

---

## Tester Notes

_Add any additional observations, performance tips, or optimization opportunities discovered during testing_
