/**
 * ISS Data Storage Utilities
 *
 * Provides retention policy, cleanup helpers, validation schemas,
 * and corruption recovery for IndexedDB persistence.
 */

import { z } from "zod";
import {
	getDb,
	getPositionsInRange,
	type StoredAstronaut,
	type StoredTLE,
} from "./db";
import { calculateOrbitPath } from "./orbital";
import type { ISSPosition, TLEData } from "./types";

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

/**
 * Configuration for gap filling
 */
export const GAP_FILLING_CONFIG = {
	/** Threshold in hours for switching to orbital calculations */
	orbitalThresholdHours: 24,
	/** Step size in seconds for synthetic positions */
	syntheticStepSeconds: 300, // 5 minutes
	/** Maximum gap size to fill (hours) */
	maxGapHours: 168, // 1 week
} as const;

// =============================================================================
// ZOD VALIDATION SCHEMAS
// =============================================================================

/**
 * Schema for validating stored ISS position data
 */
export const ISSPositionSchema = z.object({
	id: z.string(),
	latitude: z.number().min(-90).max(90),
	longitude: z.number().min(-180).max(180),
	timestamp: z.number().positive(),
	altitude: z.number().positive(),
	velocity: z.number().positive(),
	visibility: z.string(),
});

/**
 * Schema for validating stored astronaut data
 */
export const StoredAstronautSchema = z.object({
	id: z.string(),
	name: z.string(),
	craft: z.string(),
	image: z.string().optional(),
	role: z.string().optional(),
	agency: z.string().optional(),
	launchDate: z.string().optional(),
	endDate: z.string().optional(),
	fetchedAt: z.number().positive(),
});

/**
 * Schema for validating stored TLE data
 */
export const StoredTLESchema = z.object({
	id: z.string(),
	line1: z.string(),
	line2: z.string(),
	fetchedAt: z.number().positive(),
	source: z.enum(["celestrak", "ariss", "fallback"]),
});

// =============================================================================
// RETENTION CLEANUP FUNCTIONS
// =============================================================================

/**
 * Clean up old position records based on retention policy
 * @returns Number of records deleted
 */
export async function cleanupOldPositions(): Promise<number> {
	if (typeof window === "undefined") return 0;

	const db = getDb();
	const cutoffTimestamp =
		Date.now() / 1000 - POSITION_RETENTION.maxAgeDays * 86400;

	// Find and delete old positions in batches
	const oldPositions = await db.positions
		.where("timestamp")
		.below(cutoffTimestamp)
		.limit(POSITION_RETENTION.cleanupBatchSize)
		.primaryKeys();

	if (oldPositions.length > 0) {
		await db.positions.bulkDelete(oldPositions);
	}

	return oldPositions.length;
}

/**
 * Clean up old TLE records, keeping only the most recent ones
 * @returns Number of records deleted
 */
export async function cleanupOldTle(): Promise<number> {
	if (typeof window === "undefined") return 0;

	const db = getDb();
	const allTle = await db.tle.orderBy("fetchedAt").toArray();

	if (allTle.length <= TLE_RETENTION.maxRecords) return 0;

	// Delete oldest records
	const toDelete = allTle.slice(0, allTle.length - TLE_RETENTION.maxRecords);
	const deleteIds = toDelete.map((tle) => tle.id);

	await db.tle.bulkDelete(deleteIds);
	return deleteIds.length;
}

/**
 * Run all cleanup operations
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
 * Runs cleanup periodically during app activity
 */
export function startCleanupScheduler(): void {
	if (typeof window === "undefined") return;
	if (cleanupIntervalId) return; // Already running

	cleanupIntervalId = setInterval(async () => {
		try {
			const result = await runCleanup();
			if (result.positions > 0 || result.tle > 0) {
				console.debug("[Storage] Cleanup completed:", result);
			}
		} catch (error) {
			console.warn("[Storage] Cleanup failed:", error);
		}
	}, POSITION_RETENTION.cleanupIntervalMs);
}

/**
 * Stop the cleanup scheduler
 */
export function stopCleanupScheduler(): void {
	if (cleanupIntervalId) {
		clearInterval(cleanupIntervalId);
		cleanupIntervalId = null;
	}
}

// =============================================================================
// CORRUPTION DETECTION AND RECOVERY
// =============================================================================

/**
 * Validate a position record and return null if invalid
 * @param data - Raw data to validate
 * @returns Valid position or null
 */
export function validatePosition(data: unknown): ISSPosition | null {
	const result = ISSPositionSchema.safeParse(data);
	if (result.success) {
		return result.data;
	}
	console.warn("[Storage] Invalid position data:", result.error.issues);
	return null;
}

/**
 * Validate a crew member record and return null if invalid
 */
export function validateAstronaut(data: unknown): StoredAstronaut | null {
	const result = StoredAstronautSchema.safeParse(data);
	if (result.success) {
		return result.data;
	}
	console.warn("[Storage] Invalid astronaut data:", result.error.issues);
	return null;
}

/**
 * Validate a TLE record and return null if invalid
 */
export function validateTLE(data: unknown): StoredTLE | null {
	const result = StoredTLESchema.safeParse(data);
	if (result.success) {
		return result.data;
	}
	console.warn("[Storage] Invalid TLE data:", result.error.issues);
	return null;
}

/**
 * Remove corrupted records and return whether refetch is needed
 * @returns Object with corruption info and whether refetch is recommended
 */
export async function detectAndRemoveCorruption(): Promise<{
	positionsRemoved: number;
	crewRemoved: number;
	tleRemoved: number;
	needsRefetch: boolean;
}> {
	if (typeof window === "undefined") {
		return {
			positionsRemoved: 0,
			crewRemoved: 0,
			tleRemoved: 0,
			needsRefetch: false,
		};
	}

	const db = getDb();
	let positionsRemoved = 0;
	let crewRemoved = 0;
	let tleRemoved = 0;

	// Check positions (sample first 100 and last 100 for performance)
	const firstPositions = await db.positions.limit(100).toArray();
	const lastPositions = await db.positions
		.orderBy("timestamp")
		.reverse()
		.limit(100)
		.toArray();
	const positionsToCheck = [...firstPositions, ...lastPositions];

	const invalidPositionIds: string[] = [];
	for (const pos of positionsToCheck) {
		if (!validatePosition(pos)) {
			invalidPositionIds.push(pos.id);
		}
	}
	if (invalidPositionIds.length > 0) {
		await db.positions.bulkDelete(invalidPositionIds);
		positionsRemoved = invalidPositionIds.length;
	}

	// Check all crew records
	const allCrew = await db.crew.toArray();
	const invalidCrewIds: string[] = [];
	for (const crew of allCrew) {
		if (!validateAstronaut(crew)) {
			invalidCrewIds.push(crew.id);
		}
	}
	if (invalidCrewIds.length > 0) {
		await db.crew.bulkDelete(invalidCrewIds);
		crewRemoved = invalidCrewIds.length;
	}

	// Check all TLE records
	const allTle = await db.tle.toArray();
	const invalidTleIds: string[] = [];
	for (const tle of allTle) {
		if (!validateTLE(tle)) {
			invalidTleIds.push(tle.id);
		}
	}
	if (invalidTleIds.length > 0) {
		await db.tle.bulkDelete(invalidTleIds);
		tleRemoved = invalidTleIds.length;
	}

	const needsRefetch =
		positionsRemoved > 0 ||
		crewRemoved === allCrew.length ||
		tleRemoved === allTle.length;

	return { positionsRemoved, crewRemoved, tleRemoved, needsRefetch };
}

// =============================================================================
// GAP DETECTION AND FILLING
// =============================================================================

/**
 * Information about a gap in position data
 */
export interface GapInfo {
	/** Start of gap (Unix seconds) */
	startTimestamp: number;
	/** End of gap (Unix seconds) */
	endTimestamp: number;
	/** Gap duration in hours */
	durationHours: number;
	/** Whether orbital calculations should be used */
	useOrbitalCalculation: boolean;
}

/**
 * Detect gaps in position history
 * @param positions - Array of stored positions (must be sorted by timestamp)
 * @param expectedIntervalSeconds - Expected interval between positions (default: 5)
 * @returns Array of detected gaps
 */
export function detectGaps(
	positions: ISSPosition[],
	expectedIntervalSeconds = 5,
): GapInfo[] {
	if (positions.length < 2) return [];

	const gaps: GapInfo[] = [];
	const gapThreshold = expectedIntervalSeconds * 3; // Allow 3x expected interval before considering it a gap

	for (let i = 1; i < positions.length; i++) {
		const gap = positions[i].timestamp - positions[i - 1].timestamp;

		if (gap > gapThreshold) {
			const durationHours = gap / 3600;
			gaps.push({
				startTimestamp: positions[i - 1].timestamp,
				endTimestamp: positions[i].timestamp,
				durationHours,
				useOrbitalCalculation: shouldUseOrbitalCalculation(durationHours),
			});
		}
	}

	return gaps;
}

/**
 * Check if gap should use orbital calculations vs interpolation
 * @param durationHours - Gap duration in hours
 * @returns True if orbital calculations should be used
 */
export function shouldUseOrbitalCalculation(durationHours: number): boolean {
	return durationHours > GAP_FILLING_CONFIG.orbitalThresholdHours;
}

/**
 * Fill a gap using orbital calculations
 * @param gap - Gap information
 * @param tle - TLE data for calculations
 * @returns Array of synthetic position records
 */
export function fillGapWithOrbital(gap: GapInfo, tle: TLEData): ISSPosition[] {
	if (gap.durationHours > GAP_FILLING_CONFIG.maxGapHours) {
		console.warn(
			"[Storage] Gap too large to fill:",
			gap.durationHours,
			"hours",
		);
		return [];
	}

	const [line1, line2] = tle;
	const startMins = Math.ceil(
		(gap.startTimestamp * 1000 - Date.now()) / (1000 * 60),
	);
	const endMins = Math.floor(
		(gap.endTimestamp * 1000 - Date.now()) / (1000 * 60),
	);
	const stepMins = GAP_FILLING_CONFIG.syntheticStepSeconds / 60;

	const orbitalPoints = calculateOrbitPath(
		line1,
		line2,
		startMins,
		endMins,
		stepMins,
	);

	return orbitalPoints.map((point, idx) => ({
		id: `synthetic-${gap.startTimestamp + idx * GAP_FILLING_CONFIG.syntheticStepSeconds}`,
		latitude: point.lat,
		longitude: point.lng,
		altitude: point.alt,
		timestamp:
			gap.startTimestamp + idx * GAP_FILLING_CONFIG.syntheticStepSeconds,
		velocity: 27600, // Average velocity
		visibility: "synthetic",
	}));
}

/**
 * Fill gaps in position history using available TLE data
 * @param startTimestamp - Start of range to check (Unix seconds)
 * @param endTimestamp - End of range to check (Unix seconds)
 * @param tle - TLE data for orbital calculations
 * @returns Number of synthetic positions added
 */
export async function fillGapsInRange(
	startTimestamp: number,
	endTimestamp: number,
	tle: TLEData,
): Promise<number> {
	if (typeof window === "undefined") return 0;

	const db = getDb();
	const positions = await getPositionsInRange(startTimestamp, endTimestamp);

	// Sort by timestamp
	positions.sort((a, b) => a.timestamp - b.timestamp);

	const gaps = detectGaps(positions);
	const largeGaps = gaps.filter((g) => g.useOrbitalCalculation);

	let totalAdded = 0;

	for (const gap of largeGaps) {
		const syntheticPositions = fillGapWithOrbital(gap, tle);
		if (syntheticPositions.length > 0) {
			await db.positions.bulkPut(syntheticPositions);
			totalAdded += syntheticPositions.length;
		}
	}

	return totalAdded;
}

// =============================================================================
// MIGRATION HELPERS
// =============================================================================

/**
 * Current schema version
 */
export const SCHEMA_VERSION = 1;

/**
 * Run any pending database migrations
 * Currently a no-op since we're at version 1
 */
export async function runMigrations(): Promise<void> {
	if (typeof window === "undefined") return;

	// Dexie handles migrations automatically via version() declarations
	// This function is for any additional migration logic needed

	const db = getDb();
	const currentVersion = db.verno;

	if (currentVersion < SCHEMA_VERSION) {
		console.info(
			`[Storage] Database upgraded from v${currentVersion} to v${SCHEMA_VERSION}`,
		);
	}
}

/**
 * Clear all stored data (for testing/reset)
 */
export async function clearAllData(): Promise<void> {
	if (typeof window === "undefined") return;

	const db = getDb();
	await Promise.all([
		db.positions.clear(),
		db.crew.clear(),
		db.tle.clear(),
		db.events.clear(),
	]);
}
