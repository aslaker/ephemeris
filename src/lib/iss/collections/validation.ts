/**
 * Collection Validation and Corruption Detection
 *
 * Provides data validation and corruption detection for TanStack DB collections.
 * Uses Zod schemas to validate data integrity and remove corrupted records.
 */

import { positionsCollection, ISSPositionSchema } from "./positions";
import { crewCollection, StoredAstronautSchema } from "./crew";
import { tleCollection, StoredTLESchema } from "./tle";
import { briefingsCollection } from "../../briefing/collections";
import { PassBriefingSchema } from "../../briefing/types";
import type { ISSPosition } from "../types";

// Re-export schemas for external use
export { ISSPositionSchema, StoredAstronautSchema, StoredTLESchema, PassBriefingSchema };

// Infer types from schemas
export type StoredAstronaut = typeof StoredAstronautSchema._type;
export type StoredTLE = typeof StoredTLESchema._type;
export type PassBriefing = typeof PassBriefingSchema._type;

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate a position record and return null if invalid
 *
 * Uses Zod schema validation to ensure data integrity. Invalid records
 * indicate potential database corruption.
 *
 * @param data - Raw data to validate
 * @returns Valid position or null
 */
export function validatePosition(data: unknown): ISSPosition | null {
	const result = ISSPositionSchema.safeParse(data);
	if (result.success) {
		return result.data;
	}
	console.warn("[Validation] Invalid position data:", result.error.issues);
	return null;
}

/**
 * Validate a crew member record and return null if invalid
 *
 * Uses Zod schema validation to ensure data integrity. Invalid records
 * indicate potential database corruption.
 *
 * @param data - Raw data to validate
 * @returns Valid astronaut or null
 */
export function validateAstronaut(data: unknown): StoredAstronaut | null {
	const result = StoredAstronautSchema.safeParse(data);
	if (result.success) {
		return result.data;
	}
	console.warn("[Validation] Invalid astronaut data:", result.error.issues);
	return null;
}

/**
 * Validate a TLE record and return null if invalid
 *
 * Uses Zod schema validation to ensure data integrity. Invalid records
 * indicate potential database corruption.
 *
 * @param data - Raw data to validate
 * @returns Valid TLE or null
 */
export function validateTLE(data: unknown): StoredTLE | null {
	const result = StoredTLESchema.safeParse(data);
	if (result.success) {
		return result.data;
	}
	console.warn("[Validation] Invalid TLE data:", result.error.issues);
	return null;
}

/**
 * Validate a briefing record and return null if invalid
 *
 * Uses Zod schema validation to ensure data integrity. Invalid records
 * indicate potential database corruption.
 *
 * @param data - Raw data to validate
 * @returns Valid briefing or null
 */
export function validateBriefing(data: unknown): PassBriefing | null {
	const result = PassBriefingSchema.safeParse(data);
	if (result.success) {
		return result.data;
	}
	console.warn("[Validation] Invalid briefing data:", result.error.issues);
	return null;
}

// =============================================================================
// CORRUPTION DETECTION AND REMOVAL
// =============================================================================

/**
 * Corruption detection result
 */
export interface CorruptionResult {
	/** Number of corrupted position records removed */
	positionsRemoved: number;
	/** Number of corrupted crew records removed */
	crewRemoved: number;
	/** Number of corrupted TLE records removed */
	tleRemoved: number;
	/** Number of corrupted briefing records removed */
	briefingsRemoved: number;
	/** Whether sync refresh is recommended to repopulate data */
	needsRefetch: boolean;
}

/**
 * Detect and remove corrupted records from all collections
 *
 * Performs validation checks on stored data and removes any records that fail
 * schema validation. For performance, only samples position data (first/last 100).
 * Checks all crew, TLE, and briefing records since they are smaller datasets.
 *
 * Returns corruption info and whether a sync refresh is recommended. A refetch
 * is needed if:
 * - Any position records were corrupted
 * - All crew records were corrupted
 * - All TLE records were corrupted
 * - All briefing records were corrupted
 *
 * @returns Corruption detection result with removed counts and refetch flag
 */
export async function detectAndRemoveCorruption(): Promise<CorruptionResult> {
	if (typeof window === "undefined") {
		return {
			positionsRemoved: 0,
			crewRemoved: 0,
			tleRemoved: 0,
			briefingsRemoved: 0,
			needsRefetch: false,
		};
	}

	let positionsRemoved = 0;
	let crewRemoved = 0;
	let tleRemoved = 0;
	let briefingsRemoved = 0;

	// ========================================================================
	// Validate Position Records (Sample for Performance)
	// ========================================================================

	const positionsTable = positionsCollection.utils.getTable();

	// Sample first 100 and last 100 positions for performance
	const firstPositions = await positionsTable.limit(100).toArray();
	const lastPositions = await positionsTable
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
		await positionsTable.bulkDelete(invalidPositionIds);
		positionsRemoved = invalidPositionIds.length;
	}

	// ========================================================================
	// Validate Crew Records (Check All)
	// ========================================================================

	const crewTable = crewCollection.utils.getTable();
	const allCrew = await crewTable.toArray();

	const invalidCrewIds: string[] = [];
	for (const crew of allCrew) {
		if (!validateAstronaut(crew)) {
			invalidCrewIds.push(crew.id);
		}
	}
	if (invalidCrewIds.length > 0) {
		await crewTable.bulkDelete(invalidCrewIds);
		crewRemoved = invalidCrewIds.length;
	}

	// ========================================================================
	// Validate TLE Records (Check All)
	// ========================================================================

	const tleTable = tleCollection.utils.getTable();
	const allTle = await tleTable.toArray();

	const invalidTleIds: string[] = [];
	for (const tle of allTle) {
		if (!validateTLE(tle)) {
			invalidTleIds.push(tle.id);
		}
	}
	if (invalidTleIds.length > 0) {
		await tleTable.bulkDelete(invalidTleIds);
		tleRemoved = invalidTleIds.length;
	}

	// ========================================================================
	// Validate Briefing Records (Check All)
	// ========================================================================

	const briefingsTable = briefingsCollection.utils.getTable();
	const allBriefings = await briefingsTable.toArray();

	const invalidBriefingIds: string[] = [];
	for (const briefing of allBriefings) {
		if (!validateBriefing(briefing)) {
			invalidBriefingIds.push(briefing.passId);
		}
	}
	if (invalidBriefingIds.length > 0) {
		await briefingsTable.bulkDelete(invalidBriefingIds);
		briefingsRemoved = invalidBriefingIds.length;
	}

	// ========================================================================
	// Determine if Refetch is Needed
	// ========================================================================

	const needsRefetch =
		positionsRemoved > 0 ||
		crewRemoved === allCrew.length ||
		tleRemoved === allTle.length ||
		briefingsRemoved === allBriefings.length;

	return {
		positionsRemoved,
		crewRemoved,
		tleRemoved,
		briefingsRemoved,
		needsRefetch,
	};
}

/**
 * Run corruption detection and trigger sync refresh if needed
 *
 * Convenience function that detects corruption, removes invalid records,
 * and returns the result. The caller should trigger sync refresh based on
 * the needsRefetch flag.
 *
 * Example usage:
 * ```ts
 * const result = await runCorruptionCheck();
 * if (result.needsRefetch) {
 *   // Trigger sync refresh via sync manager
 *   await syncManager.syncNow();
 * }
 * ```
 *
 * @returns Corruption detection result
 */
export async function runCorruptionCheck(): Promise<CorruptionResult> {
	try {
		const result = await detectAndRemoveCorruption();

		if (
			result.positionsRemoved > 0 ||
			result.crewRemoved > 0 ||
			result.tleRemoved > 0 ||
			result.briefingsRemoved > 0
		) {
			console.warn("[Validation] Corrupted records removed:", result);
		}

		return result;
	} catch (error) {
		console.error("[Validation] Corruption check failed:", error);
		throw error;
	}
}
