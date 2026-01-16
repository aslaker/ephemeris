/**
 * Gap Detection and Filling Utilities
 *
 * Provides gap detection and synthetic position generation for TanStack DB collections.
 * Uses orbital calculations from satellite.js to fill large gaps in position history.
 */

import { calculateOrbitPath } from "../orbital";
import type { ISSPosition, TLEData } from "../types";
import { positionsCollection } from "./positions";

// =============================================================================
// GAP FILLING CONFIGURATION
// =============================================================================

/**
 * Configuration for gap filling behavior
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
// GAP DETECTION TYPES
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

// =============================================================================
// GAP DETECTION FUNCTIONS
// =============================================================================

/**
 * Detect gaps in position history
 *
 * Analyzes an array of positions (must be sorted by timestamp) and identifies
 * gaps larger than the expected interval threshold.
 *
 * @param positions - Array of stored positions (must be sorted by timestamp)
 * @param expectedIntervalSeconds - Expected interval between positions (default: 5)
 * @returns Array of detected gaps with metadata
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
 *
 * Small gaps can use linear interpolation, but large gaps require
 * orbital propagation for accuracy.
 *
 * @param durationHours - Gap duration in hours
 * @returns True if orbital calculations should be used
 */
export function shouldUseOrbitalCalculation(durationHours: number): boolean {
	return durationHours > GAP_FILLING_CONFIG.orbitalThresholdHours;
}

// =============================================================================
// GAP FILLING FUNCTIONS
// =============================================================================

/**
 * Fill a gap using orbital calculations
 *
 * Uses satellite.js to propagate TLE data and generate synthetic positions
 * at regular intervals within the gap.
 *
 * @param gap - Gap information
 * @param tle - TLE data for orbital calculations
 * @returns Array of synthetic position records
 */
export function fillGapWithOrbital(gap: GapInfo, tle: TLEData): ISSPosition[] {
	if (gap.durationHours > GAP_FILLING_CONFIG.maxGapHours) {
		console.warn(
			"[GapFilling] Gap too large to fill:",
			gap.durationHours,
			"hours",
		);
		return [];
	}

	// Calculate current time once for consistent offset calculation
	const now = Date.now();
	const [line1, line2] = tle;

	// Calculate minute offsets for start and end of gap
	const startOffsetMins = (gap.startTimestamp * 1000 - now) / (1000 * 60);
	const endOffsetMins = (gap.endTimestamp * 1000 - now) / (1000 * 60);
	const stepMins = GAP_FILLING_CONFIG.syntheticStepSeconds / 60;

	// Batch calculate all orbital positions for the gap in a single call
	// This is much more efficient than calling calculateOrbitPath once per timestamp
	const orbitalPoints = calculateOrbitPath(
		line1,
		line2,
		startOffsetMins,
		endOffsetMins,
		stepMins,
	);

	// Map orbital points to synthetic positions with correct timestamps
	const syntheticPositions: ISSPosition[] = orbitalPoints.map((point, idx) => {
		// Calculate the exact timestamp for this orbital point
		const timestamp =
			gap.startTimestamp + idx * GAP_FILLING_CONFIG.syntheticStepSeconds;

		return {
			id: `synthetic-${timestamp}`,
			latitude: point.lat,
			longitude: point.lng,
			altitude: point.alt,
			timestamp: timestamp,
			velocity: 27600, // Average ISS velocity
			visibility: "synthetic",
		};
	});

	return syntheticPositions;
}

/**
 * Fill gaps in position history using available TLE data
 *
 * Queries positions from collection, detects gaps, generates synthetic positions
 * using orbital calculations, and inserts them back into the collection.
 *
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

	// Get Dexie table for efficient range query
	const table = positionsCollection.utils.getTable();

	// Query positions in range
	const positions = await table
		.where("timestamp")
		.between(startTimestamp, endTimestamp)
		.toArray();

	// Sort by timestamp
	positions.sort((a: ISSPosition, b: ISSPosition) => a.timestamp - b.timestamp);

	const gaps = detectGaps(positions);
	const largeGaps = gaps.filter((g) => g.useOrbitalCalculation);

	let totalAdded = 0;

	for (const gap of largeGaps) {
		const syntheticPositions = fillGapWithOrbital(gap, tle);
		if (syntheticPositions.length > 0) {
			// Use Dexie bulkPut for efficient batch insertion
			await table.bulkPut(syntheticPositions);
			totalAdded += syntheticPositions.length;
		}
	}

	return totalAdded;
}
