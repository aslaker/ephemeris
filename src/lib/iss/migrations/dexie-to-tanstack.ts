/**
 * Dexie to TanStack DB Migration
 *
 * One-time migration script to transfer existing user data from legacy Dexie tables
 * to new TanStack DB collections. This ensures users don't lose their cached data
 * when upgrading to the new data layer architecture.
 *
 * Migration Process:
 * 1. Check migration state (skip if already completed)
 * 2. Open legacy Dexie database
 * 3. Read all data from legacy tables (positions, crew, tle)
 * 4. Read briefings from localStorage cache
 * 5. Validate data using Zod schemas
 * 6. Bulk insert into TanStack DB collections
 * 7. Mark migration as complete
 *
 * Note: This migration is non-destructive and does not delete legacy data.
 * Legacy cleanup will happen in a separate phase after verification.
 */

import Dexie, { type EntityTable } from "dexie";
import type { PassBriefing } from "../../briefing/types";
import { PassBriefingSchema } from "../../briefing/types";
import {
	briefingsCollection,
	crewCollection,
	positionsCollection,
	tleCollection,
} from "../collections";
import { StoredAstronautSchema } from "../collections/crew";
import { ISSPositionSchema } from "../collections/positions";
import { StoredTLESchema } from "../collections/tle";

// =============================================================================
// MIGRATION STATE TRACKING
// =============================================================================

const MIGRATION_STATE_KEY = "ephemeris-migration-dexie-to-tanstack";
const BRIEFING_STORAGE_KEY = "ephemeris-briefings-cache";

/**
 * Migration status tracked in localStorage
 */
interface MigrationState {
	/** Whether migration has completed successfully */
	completed: boolean;
	/** Timestamp when migration was completed */
	completedAt?: number;
	/** Migration version identifier */
	version: string;
	/** Counts of migrated records */
	recordCounts?: {
		positions: number;
		crew: number;
		tle: number;
		briefings: number;
	};
	/** Error message if migration failed */
	error?: string;
}

/**
 * Check if migration has already completed
 */
export function isMigrationComplete(): boolean {
	if (typeof window === "undefined") return true; // SSR: skip

	try {
		const stored = localStorage.getItem(MIGRATION_STATE_KEY);
		if (!stored) return false;

		const state = JSON.parse(stored) as MigrationState;
		return state.completed === true;
	} catch (error) {
		console.warn("[Migration] Failed to read migration state:", error);
		return false;
	}
}

/**
 * Mark migration as complete
 */
function markMigrationComplete(
	recordCounts: MigrationState["recordCounts"],
): void {
	if (typeof window === "undefined") return;

	const state: MigrationState = {
		completed: true,
		completedAt: Date.now(),
		version: "1.0.0",
		recordCounts,
	};

	try {
		localStorage.setItem(MIGRATION_STATE_KEY, JSON.stringify(state));
	} catch (error) {
		console.warn("[Migration] Failed to save migration state:", error);
	}
}

/**
 * Mark migration as failed
 */
function markMigrationFailed(error: string): void {
	if (typeof window === "undefined") return;

	const state: MigrationState = {
		completed: false,
		version: "1.0.0",
		error,
	};

	try {
		localStorage.setItem(MIGRATION_STATE_KEY, JSON.stringify(state));
	} catch (err) {
		console.warn("[Migration] Failed to save migration error state:", err);
	}
}

// =============================================================================
// LEGACY DATABASE INTERFACE
// =============================================================================

/**
 * Legacy Dexie database interface (for reading old data)
 */
class LegacyEphemerisDatabase extends Dexie {
	positions!: EntityTable<any, "id">;
	crew!: EntityTable<any, "id">;
	tle!: EntityTable<any, "id">;

	constructor() {
		super("ephemeris-iss");

		// Schema version 1: Original tables (read-only access)
		this.version(1).stores({
			positions: "id, timestamp",
			crew: "id, fetchedAt",
			tle: "id, fetchedAt",
		});
	}
}

// =============================================================================
// MIGRATION RESULT TYPES
// =============================================================================

/**
 * Result of migrating a single data type
 */
export interface MigrationDataResult {
	/** Number of records read from legacy source */
	read: number;
	/** Number of records validated successfully */
	validated: number;
	/** Number of records inserted into collection */
	inserted: number;
	/** Number of records that failed validation */
	invalidRecords: number;
	/** Validation errors encountered */
	errors?: string[];
}

/**
 * Complete migration result
 */
export interface MigrationResult {
	/** Whether migration succeeded */
	success: boolean;
	/** Results for each data type */
	positions: MigrationDataResult;
	crew: MigrationDataResult;
	tle: MigrationDataResult;
	briefings: MigrationDataResult;
	/** Error message if migration failed */
	error?: string;
	/** Total time taken in milliseconds */
	durationMs: number;
}

// =============================================================================
// DATA MIGRATION FUNCTIONS
// =============================================================================

/**
 * Migrate position records from legacy Dexie table to TanStack DB collection
 */
async function migratePositions(
	legacyDb: LegacyEphemerisDatabase,
): Promise<MigrationDataResult> {
	const result: MigrationDataResult = {
		read: 0,
		validated: 0,
		inserted: 0,
		invalidRecords: 0,
		errors: [],
	};

	try {
		// Read all positions from legacy table
		const legacyPositions = await legacyDb.positions.toArray();
		result.read = legacyPositions.length;

		if (legacyPositions.length === 0) {
			return result;
		}

		// Validate and filter positions
		const validPositions = [];
		for (const position of legacyPositions) {
			const validated = ISSPositionSchema.safeParse(position);
			if (validated.success) {
				validPositions.push(validated.data);
				result.validated++;
			} else {
				result.invalidRecords++;
				result.errors?.push(
					`Position ${position.id}: ${validated.error.message}`,
				);
			}
		}

		// Bulk insert into TanStack DB collection
		if (validPositions.length > 0 && positionsCollection) {
			const table = positionsCollection.utils.getTable();
			await table.bulkPut(validPositions);
			result.inserted = validPositions.length;
		}
	} catch (error) {
		result.errors?.push(
			`Migration failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	return result;
}

/**
 * Migrate crew records from legacy Dexie table to TanStack DB collection
 */
async function migrateCrew(
	legacyDb: LegacyEphemerisDatabase,
): Promise<MigrationDataResult> {
	const result: MigrationDataResult = {
		read: 0,
		validated: 0,
		inserted: 0,
		invalidRecords: 0,
		errors: [],
	};

	try {
		// Read all crew from legacy table
		const legacyCrew = await legacyDb.crew.toArray();
		result.read = legacyCrew.length;

		if (legacyCrew.length === 0) {
			return result;
		}

		// Validate and filter crew
		const validCrew = [];
		for (const astronaut of legacyCrew) {
			const validated = StoredAstronautSchema.safeParse(astronaut);
			if (validated.success) {
				validCrew.push(validated.data);
				result.validated++;
			} else {
				result.invalidRecords++;
				result.errors?.push(
					`Astronaut ${astronaut.id}: ${validated.error.message}`,
				);
			}
		}

		// Bulk insert into TanStack DB collection
		if (validCrew.length > 0 && crewCollection) {
			const table = crewCollection.utils.getTable();
			await table.bulkPut(validCrew);
			result.inserted = validCrew.length;
		}
	} catch (error) {
		result.errors?.push(
			`Migration failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	return result;
}

/**
 * Migrate TLE records from legacy Dexie table to TanStack DB collection
 */
async function migrateTLE(
	legacyDb: LegacyEphemerisDatabase,
): Promise<MigrationDataResult> {
	const result: MigrationDataResult = {
		read: 0,
		validated: 0,
		inserted: 0,
		invalidRecords: 0,
		errors: [],
	};

	try {
		// Read all TLE records from legacy table
		const legacyTle = await legacyDb.tle.toArray();
		result.read = legacyTle.length;

		if (legacyTle.length === 0) {
			return result;
		}

		// Validate and filter TLE records
		const validTle = [];
		for (const tle of legacyTle) {
			const validated = StoredTLESchema.safeParse(tle);
			if (validated.success) {
				validTle.push(validated.data);
				result.validated++;
			} else {
				result.invalidRecords++;
				result.errors?.push(`TLE ${tle.id}: ${validated.error.message}`);
			}
		}

		// Bulk insert into TanStack DB collection
		if (validTle.length > 0 && tleCollection) {
			const table = tleCollection.utils.getTable();
			await table.bulkPut(validTle);
			result.inserted = validTle.length;
		}
	} catch (error) {
		result.errors?.push(
			`Migration failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	return result;
}

/**
 * Migrate briefings from localStorage to TanStack DB collection
 */
async function migrateBriefings(): Promise<MigrationDataResult> {
	const result: MigrationDataResult = {
		read: 0,
		validated: 0,
		inserted: 0,
		invalidRecords: 0,
		errors: [],
	};

	if (typeof window === "undefined") return result;

	try {
		// Read briefings from localStorage
		const stored = localStorage.getItem(BRIEFING_STORAGE_KEY);
		if (!stored) {
			return result;
		}

		const parsed = JSON.parse(stored) as Array<[string, PassBriefing]>;
		result.read = parsed.length;

		if (parsed.length === 0) {
			return result;
		}

		// Validate and filter briefings
		const validBriefings = [];
		for (const [_key, briefing] of parsed) {
			// Convert date strings back to Date objects
			if (briefing.viewingWindow?.optimalStart) {
				briefing.viewingWindow.optimalStart = new Date(
					briefing.viewingWindow.optimalStart,
				);
			}

			const validated = PassBriefingSchema.safeParse(briefing);
			if (validated.success) {
				validBriefings.push(validated.data);
				result.validated++;
			} else {
				result.invalidRecords++;
				result.errors?.push(
					`Briefing ${briefing.passId}: ${validated.error.message}`,
				);
			}
		}

		// Bulk insert into TanStack DB collection
		if (validBriefings.length > 0 && briefingsCollection) {
			const table = briefingsCollection.utils.getTable();
			await table.bulkPut(validBriefings);
			result.inserted = validBriefings.length;
		}
	} catch (error) {
		result.errors?.push(
			`Migration failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	return result;
}

// =============================================================================
// MAIN MIGRATION FUNCTION
// =============================================================================

/**
 * Run the complete migration from Dexie to TanStack DB
 *
 * This function:
 * 1. Checks if migration has already completed (returns early if so)
 * 2. Opens the legacy Dexie database
 * 3. Migrates all data types in parallel
 * 4. Validates all records using Zod schemas
 * 5. Bulk inserts into TanStack DB collections
 * 6. Tracks migration state in localStorage
 *
 * @returns Promise resolving to detailed migration result
 *
 * @example
 * ```ts
 * const result = await runMigration();
 * if (result.success) {
 *   console.log('Migration completed:', result.positions.inserted, 'positions migrated');
 * } else {
 *   console.error('Migration failed:', result.error);
 * }
 * ```
 */
export async function runMigration(): Promise<MigrationResult> {
	const startTime = Date.now();

	// Check if migration already completed
	if (isMigrationComplete()) {
		return {
			success: true,
			positions: { read: 0, validated: 0, inserted: 0, invalidRecords: 0 },
			crew: { read: 0, validated: 0, inserted: 0, invalidRecords: 0 },
			tle: { read: 0, validated: 0, inserted: 0, invalidRecords: 0 },
			briefings: { read: 0, validated: 0, inserted: 0, invalidRecords: 0 },
			durationMs: 0,
		};
	}

	// Browser environment only
	if (typeof window === "undefined") {
		return {
			success: false,
			error: "Migration can only run in browser environment",
			positions: { read: 0, validated: 0, inserted: 0, invalidRecords: 0 },
			crew: { read: 0, validated: 0, inserted: 0, invalidRecords: 0 },
			tle: { read: 0, validated: 0, inserted: 0, invalidRecords: 0 },
			briefings: { read: 0, validated: 0, inserted: 0, invalidRecords: 0 },
			durationMs: 0,
		};
	}

	let legacyDb: LegacyEphemerisDatabase | null = null;

	try {
		console.log("[Migration] Starting Dexie to TanStack DB migration...");

		// Open legacy database
		legacyDb = new LegacyEphemerisDatabase();

		// Run all migrations in parallel for performance
		const [positionsResult, crewResult, tleResult, briefingsResult] =
			await Promise.all([
				migratePositions(legacyDb),
				migrateCrew(legacyDb),
				migrateTLE(legacyDb),
				migrateBriefings(),
			]);

		const durationMs = Date.now() - startTime;

		// Check for any errors
		const allErrors = [
			...(positionsResult.errors || []),
			...(crewResult.errors || []),
			...(tleResult.errors || []),
			...(briefingsResult.errors || []),
		];

		// Calculate total records and success rate
		const totalRead =
			positionsResult.read +
			crewResult.read +
			tleResult.read +
			briefingsResult.read;
		const totalInserted =
			positionsResult.inserted +
			crewResult.inserted +
			tleResult.inserted +
			briefingsResult.inserted;
		const successRate = totalRead > 0 ? (totalInserted / totalRead) * 100 : 100;

		// Consider migration successful if >90% of data migrated successfully
		const isSuccessful = successRate >= 90;

		const result: MigrationResult = {
			success: isSuccessful,
			positions: positionsResult,
			crew: crewResult,
			tle: tleResult,
			briefings: briefingsResult,
			durationMs,
		};

		if (!isSuccessful) {
			result.error = `Migration failed: only ${successRate.toFixed(1)}% of data migrated (${totalInserted}/${totalRead} records)`;
			console.error("[Migration] Failed:", result.error);

			// Log detailed breakdown of failed records by data type for debugging
			console.error("[Migration] Failed records breakdown:");
			if (positionsResult.invalidRecords > 0) {
				console.error(
					`  - Positions: ${positionsResult.invalidRecords} failed`,
					positionsResult.errors,
				);
			}
			if (crewResult.invalidRecords > 0) {
				console.error(
					`  - Crew: ${crewResult.invalidRecords} failed`,
					crewResult.errors,
				);
			}
			if (tleResult.invalidRecords > 0) {
				console.error(
					`  - TLE: ${tleResult.invalidRecords} failed`,
					tleResult.errors,
				);
			}
			if (briefingsResult.invalidRecords > 0) {
				console.error(
					`  - Briefings: ${briefingsResult.invalidRecords} failed`,
					briefingsResult.errors,
				);
			}

			markMigrationFailed(result.error);
		} else if (allErrors.length > 0) {
			// Migration successful overall, but log validation errors for debugging
			result.error = `Migration completed with ${allErrors.length} validation errors (${successRate.toFixed(1)}% success rate)`;
			console.warn(
				"[Migration] Completed with warnings - validation errors by type:",
			);
			if (positionsResult.errors && positionsResult.errors.length > 0) {
				console.warn(
					`  - Positions (${positionsResult.invalidRecords} failed):`,
					positionsResult.errors,
				);
			}
			if (crewResult.errors && crewResult.errors.length > 0) {
				console.warn(
					`  - Crew (${crewResult.invalidRecords} failed):`,
					crewResult.errors,
				);
			}
			if (tleResult.errors && tleResult.errors.length > 0) {
				console.warn(
					`  - TLE (${tleResult.invalidRecords} failed):`,
					tleResult.errors,
				);
			}
			if (briefingsResult.errors && briefingsResult.errors.length > 0) {
				console.warn(
					`  - Briefings (${briefingsResult.invalidRecords} failed):`,
					briefingsResult.errors,
				);
			}

			// Mark as complete despite warnings since >90% succeeded
			markMigrationComplete({
				positions: positionsResult.inserted,
				crew: crewResult.inserted,
				tle: tleResult.inserted,
				briefings: briefingsResult.inserted,
			});

			console.log(
				"[Migration] Completed with warnings:",
				`${positionsResult.inserted} positions,`,
				`${crewResult.inserted} crew,`,
				`${tleResult.inserted} TLE,`,
				`${briefingsResult.inserted} briefings`,
				`(${durationMs}ms, ${allErrors.length} validation errors)`,
			);
		} else {
			// Mark migration as complete
			markMigrationComplete({
				positions: positionsResult.inserted,
				crew: crewResult.inserted,
				tle: tleResult.inserted,
				briefings: briefingsResult.inserted,
			});

			console.log(
				"[Migration] Completed successfully:",
				`${positionsResult.inserted} positions,`,
				`${crewResult.inserted} crew,`,
				`${tleResult.inserted} TLE,`,
				`${briefingsResult.inserted} briefings`,
				`(${durationMs}ms)`,
			);
		}

		return result;
	} catch (error) {
		const durationMs = Date.now() - startTime;
		const errorMessage = error instanceof Error ? error.message : String(error);

		console.error("[Migration] Failed:", errorMessage);
		markMigrationFailed(errorMessage);

		return {
			success: false,
			error: errorMessage,
			positions: { read: 0, validated: 0, inserted: 0, invalidRecords: 0 },
			crew: { read: 0, validated: 0, inserted: 0, invalidRecords: 0 },
			tle: { read: 0, validated: 0, inserted: 0, invalidRecords: 0 },
			briefings: { read: 0, validated: 0, inserted: 0, invalidRecords: 0 },
			durationMs,
		};
	} finally {
		// Clean up legacy database connection
		if (legacyDb) {
			legacyDb.close();
		}
	}
}

/**
 * Reset migration state (for testing/debugging)
 * This allows the migration to run again
 */
export function resetMigrationState(): void {
	if (typeof window === "undefined") return;
	localStorage.removeItem(MIGRATION_STATE_KEY);
}
