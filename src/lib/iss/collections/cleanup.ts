/**
 * Collection Cleanup Utilities
 *
 * Provides retention policy enforcement and cleanup operations for TanStack DB collections.
 * Uses collection.utils.getTable() for efficient Dexie queries and deletes.
 */

import { positionsCollection } from "./positions";
import { tleCollection } from "./tle";
import type { StoredTLE } from "./validation";

// =============================================================================
// RETENTION POLICY CONFIGURATION
// =============================================================================

/**
 * Configuration for position data retention
 */
export const POSITION_RETENTION = {
	/** Maximum age in days for position records */
	maxAgeDays: 30,
	/** Maximum number of position records to keep */
	maxRecords: 600_000, // ~35 days at 5s intervals
	/** Batch size for cleanup operations */
	cleanupBatchSize: 10_000,
	/** Interval between cleanup runs in milliseconds */
	cleanupIntervalMs: 60_000, // 1 minute
} as const;

/**
 * Configuration for TLE data retention
 */
export const TLE_RETENTION = {
	/** Maximum number of TLE records to keep */
	maxRecords: 7, // 1 week at hourly refresh
} as const;

// =============================================================================
// RETENTION CLEANUP FUNCTIONS
// =============================================================================

/**
 * Clean up old position records based on retention policy
 *
 * Uses TanStack DB collection with Dexie table queries for efficient
 * batch deletion of positions older than the retention policy.
 *
 * @returns Number of records deleted
 */
export async function cleanupOldPositions(): Promise<number> {
	if (typeof window === "undefined") return 0;

	const cutoffTimestamp =
		Date.now() / 1000 - POSITION_RETENTION.maxAgeDays * 86400;

	// Get Dexie table for efficient query
	const table = positionsCollection.utils.getTable();

	// Find and delete old positions in batches
	const oldPositions = await table
		.where("timestamp")
		.below(cutoffTimestamp)
		.limit(POSITION_RETENTION.cleanupBatchSize)
		.primaryKeys();

	if (oldPositions.length > 0) {
		// Use Dexie bulkDelete for efficient batch deletion
		await table.bulkDelete(oldPositions);
	}

	return oldPositions.length;
}

/**
 * Clean up old TLE records, keeping only the most recent ones
 *
 * Uses TanStack DB collection with Dexie table queries to maintain
 * only the latest N TLE records as per retention policy.
 *
 * @returns Number of records deleted
 */
export async function cleanupOldTle(): Promise<number> {
	if (typeof window === "undefined") return 0;

	// Get Dexie table for efficient query
	const table = tleCollection.utils.getTable();

	// Get all TLE records ordered by fetchedAt
	const allTle = await table.orderBy("fetchedAt").toArray();

	if (allTle.length <= TLE_RETENTION.maxRecords) return 0;

	// Delete oldest records, keep only the most recent
	const toDelete = allTle.slice(0, allTle.length - TLE_RETENTION.maxRecords);
	const deleteIds = toDelete.map((tle: StoredTLE) => tle.id);

	// Use Dexie bulkDelete for efficient batch deletion
	await table.bulkDelete(deleteIds);
	return deleteIds.length;
}

/**
 * Run all cleanup operations
 *
 * Executes both position and TLE cleanup operations and returns
 * counts of deleted records for each type.
 *
 * @returns Object with counts of deleted records
 */
export async function runCleanup(): Promise<{
	positions: number;
	tle: number;
}> {
	const positions = await cleanupOldPositions();
	const tle = await cleanupOldTle();
	return { positions, tle };
}

// =============================================================================
// CLEANUP SCHEDULER
// =============================================================================

let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Start the cleanup scheduler
 *
 * Runs cleanup periodically during app activity based on the configured
 * interval. Safe to call multiple times (ignores if already running).
 */
export function startCleanupScheduler(): void {
	if (typeof window === "undefined") return;
	if (cleanupIntervalId) return; // Already running

	cleanupIntervalId = setInterval(async () => {
		try {
			const result = await runCleanup();
			if (result.positions > 0 || result.tle > 0) {
				console.debug("[Cleanup] Completed:", result);
			}
		} catch (error) {
			console.warn("[Cleanup] Failed:", error);
		}
	}, POSITION_RETENTION.cleanupIntervalMs);
}

/**
 * Stop the cleanup scheduler
 *
 * Stops the periodic cleanup interval. Safe to call multiple times.
 */
export function stopCleanupScheduler(): void {
	if (cleanupIntervalId) {
		clearInterval(cleanupIntervalId);
		cleanupIntervalId = null;
	}
}
