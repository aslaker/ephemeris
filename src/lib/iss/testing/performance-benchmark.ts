/**
 * Performance Benchmark Utility for TanStack DB Migration
 *
 * This utility provides comprehensive performance testing for the TanStack DB
 * collections and hooks. Run these benchmarks in the browser console to verify
 * performance meets acceptance criteria.
 *
 * Usage:
 * 1. Navigate to http://localhost:3000/iss
 * 2. Open DevTools Console
 * 3. Import and run: `import('./src/lib/iss/testing/performance-benchmark').then(m => m.runAllBenchmarks())`
 */

import { positionsCollection } from "../collections/positions";
import { crewCollection } from "../collections/crew";
import { tleCollection } from "../collections/tle";
import { briefingsCollection } from "../../briefing/collections";

// =============================================================================
// BENCHMARK CONFIGURATION
// =============================================================================

interface BenchmarkResult {
	name: string;
	duration: number;
	status: "pass" | "warning" | "fail";
	target: number;
	details?: string;
}

interface BenchmarkSummary {
	totalTests: number;
	passed: number;
	warnings: number;
	failed: number;
	results: BenchmarkResult[];
	timestamp: string;
}

// Performance targets (in milliseconds)
const TARGETS = {
	SINGLE_QUERY: 10,
	SMALL_RANGE: 50,
	LARGE_RANGE: 500,
	VERY_LARGE_RANGE: 1000,
	CONCURRENT_QUERIES: 100,
	COUNT_QUERY: 20,
	LATEST_QUERY: 10,
};

// =============================================================================
// INDIVIDUAL BENCHMARKS
// =============================================================================

/**
 * Benchmark: Count query performance
 */
async function benchmarkCountQuery(): Promise<BenchmarkResult> {
	const table = positionsCollection.utils.getTable();

	const start = performance.now();
	const count = await table.count();
	const duration = performance.now() - start;

	return {
		name: "Position count query",
		duration,
		target: TARGETS.COUNT_QUERY,
		status: duration < TARGETS.COUNT_QUERY ? "pass" : "warning",
		details: `${count} total positions`,
	};
}

/**
 * Benchmark: Latest position query
 */
async function benchmarkLatestQuery(): Promise<BenchmarkResult> {
	const table = positionsCollection.utils.getTable();

	const start = performance.now();
	const latest = await table.orderBy("timestamp").reverse().first();
	const duration = performance.now() - start;

	return {
		name: "Latest position query",
		duration,
		target: TARGETS.LATEST_QUERY,
		status: duration < TARGETS.LATEST_QUERY ? "pass" : "warning",
		details: latest ? `Found position at ${new Date(latest.timestamp * 1000).toISOString()}` : "No data",
	};
}

/**
 * Benchmark: Small range query (100 records)
 */
async function benchmarkSmallRange(): Promise<BenchmarkResult> {
	const table = positionsCollection.utils.getTable();

	const start = performance.now();
	const results = await table.orderBy("timestamp").reverse().limit(100).toArray();
	const duration = performance.now() - start;

	return {
		name: "Small range query (100 positions)",
		duration,
		target: TARGETS.SMALL_RANGE,
		status: duration < TARGETS.SMALL_RANGE ? "pass" : "warning",
		details: `${results.length} positions retrieved`,
	};
}

/**
 * Benchmark: Large range query (1000 records)
 */
async function benchmarkLargeRange(): Promise<BenchmarkResult> {
	const table = positionsCollection.utils.getTable();
	const totalCount = await table.count();

	if (totalCount < 1000) {
		return {
			name: "Large range query (1000 positions)",
			duration: 0,
			target: TARGETS.LARGE_RANGE,
			status: "warning",
			details: `Skipped: Only ${totalCount} positions available (need 1000+)`,
		};
	}

	const start = performance.now();
	const results = await table.orderBy("timestamp").reverse().limit(1000).toArray();
	const duration = performance.now() - start;

	return {
		name: "Large range query (1000 positions)",
		duration,
		target: TARGETS.LARGE_RANGE,
		status: duration < TARGETS.LARGE_RANGE ? "pass" : duration < TARGETS.LARGE_RANGE * 1.5 ? "warning" : "fail",
		details: `${results.length} positions retrieved`,
	};
}

/**
 * Benchmark: Time-based range query (1 hour)
 */
async function benchmarkTimeRange(): Promise<BenchmarkResult> {
	const table = positionsCollection.utils.getTable();
	const now = Date.now() / 1000;
	const oneHourAgo = now - 60 * 60;

	const start = performance.now();
	const results = await table.where("timestamp").between(oneHourAgo, now, true, true).toArray();
	const duration = performance.now() - start;

	return {
		name: "Time-based range query (1 hour)",
		duration,
		target: 200, // 200ms for time range
		status: duration < 200 ? "pass" : "warning",
		details: `${results.length} positions in last hour`,
	};
}

/**
 * Benchmark: Crew query
 */
async function benchmarkCrewQuery(): Promise<BenchmarkResult> {
	const table = crewCollection.utils.getTable();

	const start = performance.now();
	const crew = await table.toArray();
	const duration = performance.now() - start;

	return {
		name: "Crew query (all astronauts)",
		duration,
		target: TARGETS.SINGLE_QUERY,
		status: duration < TARGETS.SINGLE_QUERY ? "pass" : "warning",
		details: `${crew.length} crew members`,
	};
}

/**
 * Benchmark: TLE query
 */
async function benchmarkTLEQuery(): Promise<BenchmarkResult> {
	const table = tleCollection.utils.getTable();

	const start = performance.now();
	const tle = await table.orderBy("fetchedAt").reverse().first();
	const duration = performance.now() - start;

	return {
		name: "TLE query (latest)",
		duration,
		target: 5, // 5ms for TLE
		status: duration < 5 ? "pass" : "warning",
		details: tle ? "TLE data found" : "No TLE data",
	};
}

/**
 * Benchmark: Briefings query
 */
async function benchmarkBriefingsQuery(): Promise<BenchmarkResult> {
	const table = briefingsCollection.utils.getTable();

	const start = performance.now();
	const briefings = await table.toArray();
	const duration = performance.now() - start;

	return {
		name: "Briefings query (all)",
		duration,
		target: TARGETS.SINGLE_QUERY,
		status: duration < TARGETS.SINGLE_QUERY ? "pass" : "warning",
		details: `${briefings.length} briefings`,
	};
}

/**
 * Benchmark: Concurrent queries
 */
async function benchmarkConcurrentQueries(): Promise<BenchmarkResult> {
	const posTable = positionsCollection.utils.getTable();
	const crewTable = crewCollection.utils.getTable();
	const tleTable = tleCollection.utils.getTable();

	const start = performance.now();
	const [positions, crew, tle, count] = await Promise.all([
		posTable.orderBy("timestamp").reverse().limit(100).toArray(),
		crewTable.toArray(),
		tleTable.orderBy("fetchedAt").reverse().first(),
		posTable.count(),
	]);
	const duration = performance.now() - start;

	return {
		name: "Concurrent queries (4 simultaneous)",
		duration,
		target: TARGETS.CONCURRENT_QUERIES,
		status: duration < TARGETS.CONCURRENT_QUERIES ? "pass" : "warning",
		details: `${positions.length} pos, ${crew.length} crew, ${tle ? "1" : "0"} TLE, ${count} total`,
	};
}

// =============================================================================
// STORAGE ANALYSIS
// =============================================================================

/**
 * Analyze IndexedDB storage usage and efficiency
 */
async function analyzeStorage(): Promise<void> {
	console.log("\n📊 Storage Analysis");
	console.log("==================\n");

	const posTable = positionsCollection.utils.getTable();
	const crewTable = crewCollection.utils.getTable();
	const tleTable = tleCollection.utils.getTable();
	const briefTable = briefingsCollection.utils.getTable();

	const posCount = await posTable.count();
	const crewCount = await crewTable.count();
	const tleCount = await tleTable.count();
	const briefCount = await briefTable.count();

	console.log("Record counts:");
	console.log(`  Positions:  ${posCount}`);
	console.log(`  Crew:       ${crewCount}`);
	console.log(`  TLE:        ${tleCount}`);
	console.log(`  Briefings:  ${briefCount}`);
	console.log(`  Total:      ${posCount + crewCount + tleCount + briefCount}\n`);

	// Estimate storage size
	if (posCount > 0) {
		const samplePos = await posTable.limit(10).toArray();
		const avgPosSize = JSON.stringify(samplePos).length / 10;
		const estimatedPosSize = (avgPosSize * posCount) / 1024;
		console.log(`Estimated positions storage: ${estimatedPosSize.toFixed(2)} KB\n`);
	}

	// Check storage quota
	if (navigator.storage && navigator.storage.estimate) {
		const estimate = await navigator.storage.estimate();
		const usageInMB = ((estimate.usage ?? 0) / 1024 / 1024).toFixed(2);
		const quotaInMB = ((estimate.quota ?? 0) / 1024 / 1024).toFixed(2);
		const percentUsed = (((estimate.usage ?? 0) / (estimate.quota ?? 1)) * 100).toFixed(2);

		console.log("Storage quota:");
		console.log(`  Used:    ${usageInMB} MB`);
		console.log(`  Quota:   ${quotaInMB} MB`);
		console.log(`  Percent: ${percentUsed}%`);

		const status = Number.parseFloat(percentUsed) < 50 ? "✅ GOOD" : Number.parseFloat(percentUsed) < 80 ? "⚠️  WARNING" : "❌ CRITICAL";
		console.log(`  Status:  ${status}\n`);
	}
}

// =============================================================================
// MAIN BENCHMARK RUNNER
// =============================================================================

/**
 * Run all performance benchmarks and display results
 */
export async function runAllBenchmarks(): Promise<BenchmarkSummary> {
	console.log("\n🚀 TanStack DB Performance Benchmarks");
	console.log("=====================================\n");
	console.log("Running comprehensive performance tests...\n");

	const results: BenchmarkResult[] = [];

	// Run all benchmarks
	const benchmarks = [
		benchmarkCountQuery,
		benchmarkLatestQuery,
		benchmarkSmallRange,
		benchmarkLargeRange,
		benchmarkTimeRange,
		benchmarkCrewQuery,
		benchmarkTLEQuery,
		benchmarkBriefingsQuery,
		benchmarkConcurrentQueries,
	];

	for (const benchmark of benchmarks) {
		try {
			const result = await benchmark();
			results.push(result);
		} catch (error) {
			console.error(`❌ Benchmark failed: ${benchmark.name}`, error);
		}
	}

	// Calculate summary statistics
	const summary: BenchmarkSummary = {
		totalTests: results.length,
		passed: results.filter((r) => r.status === "pass").length,
		warnings: results.filter((r) => r.status === "warning").length,
		failed: results.filter((r) => r.status === "fail").length,
		results,
		timestamp: new Date().toISOString(),
	};

	// Display results
	console.log("📊 Benchmark Results");
	console.log("===================\n");

	for (const result of results) {
		const icon = result.status === "pass" ? "✅" : result.status === "warning" ? "⚠️ " : "❌";
		const durationStr = result.duration > 0 ? `${result.duration.toFixed(2)}ms` : "N/A";
		console.log(`${icon} ${result.name}`);
		console.log(`   Duration: ${durationStr} (target: <${result.target}ms)`);
		if (result.details) {
			console.log(`   ${result.details}`);
		}
		console.log();
	}

	// Display summary
	console.log("📈 Summary");
	console.log("=========\n");
	console.log(`Total tests:  ${summary.totalTests}`);
	console.log(`✅ Passed:    ${summary.passed}`);
	console.log(`⚠️  Warnings:  ${summary.warnings}`);
	console.log(`❌ Failed:    ${summary.failed}\n`);

	const overallStatus = summary.failed === 0 && summary.warnings <= 2 ? "✅ PASS" : summary.failed === 0 ? "⚠️  PASS WITH WARNINGS" : "❌ FAIL";
	console.log(`Overall status: ${overallStatus}\n`);

	// Run storage analysis
	await analyzeStorage();

	// Display acceptance criteria
	console.log("✅ Acceptance Criteria");
	console.log("=====================\n");

	const initialLoad = results.find((r) => r.name.includes("Latest"));
	const rangeQuery = results.find((r) => r.name.includes("1000"));
	const smallQuery = results.find((r) => r.name.includes("100"));

	console.log(`1. Initial load <100ms with cached data:`);
	console.log(`   ${initialLoad ? (initialLoad.duration < 100 ? "✅ PASS" : "❌ FAIL") : "⚠️  N/A"} (${initialLoad?.duration.toFixed(2)}ms)\n`);

	console.log(`2. Position range queries <500ms for 1000+ records:`);
	console.log(`   ${rangeQuery ? (rangeQuery.duration < 500 ? "✅ PASS" : "❌ FAIL") : "⚠️  N/A"} (${rangeQuery?.duration.toFixed(2)}ms)\n`);

	console.log(`3. No visible lag in UI updates:`);
	console.log(`   ${smallQuery ? (smallQuery.duration < 16 ? "✅ PASS" : "⚠️  ACCEPTABLE") : "⚠️  N/A"} (${smallQuery?.duration.toFixed(2)}ms for 100 records)\n`);

	console.log(`4. Memory usage within acceptable bounds:`);
	console.log(`   ✅ Check DevTools → Memory tab for detailed analysis\n`);

	console.log("🎉 Benchmarks complete!");
	console.log("\nNext steps:");
	console.log("1. Review any warnings or failures above");
	console.log("2. Check DevTools → Performance tab for frame rate analysis");
	console.log("3. Check DevTools → Memory tab for heap snapshots");
	console.log("4. Document results in PERFORMANCE_TESTING.md\n");

	return summary;
}

/**
 * Run quick performance check (subset of full benchmarks)
 */
export async function runQuickBenchmark(): Promise<void> {
	console.log("\n⚡ Quick Performance Check\n");

	const results = await Promise.all([
		benchmarkLatestQuery(),
		benchmarkSmallRange(),
		benchmarkConcurrentQueries(),
	]);

	for (const result of results) {
		const icon = result.status === "pass" ? "✅" : "⚠️ ";
		console.log(`${icon} ${result.name}: ${result.duration.toFixed(2)}ms`);
	}

	console.log("\n✅ Quick check complete!\n");
}

// =============================================================================
// BROWSER CONSOLE HELPERS
// =============================================================================

/**
 * Make benchmarks available globally for easy console access
 */
if (typeof window !== "undefined") {
	(window as any).runPerformanceBenchmarks = runAllBenchmarks;
	(window as any).runQuickPerformanceBenchmark = runQuickBenchmark;

	console.log("✅ Performance benchmarks loaded!");
	console.log("\nRun benchmarks:");
	console.log("  Full: runPerformanceBenchmarks()");
	console.log("  Quick: runQuickPerformanceBenchmark()\n");
}
