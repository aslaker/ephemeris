/**
 * ISS Crew Sync Handler
 *
 * Fetches ISS crew data from API and inserts into TanStack DB collection.
 * Provides background sync with configurable intervals for reactive updates.
 */

import { fetchCrewData } from "@/lib/iss/api";
import { crewCollection } from "@/lib/iss/collections/crew";
import type { SyncResult } from "./types";
import { createSyncSuccess, createSyncError } from "./types";

// =============================================================================
// SYNC CONFIGURATION
// =============================================================================

/**
 * Default crew sync interval in milliseconds
 * Crew changes infrequently, so we refresh every hour
 */
export const DEFAULT_CREW_SYNC_INTERVAL = 3600000; // 1 hour

// =============================================================================
// SYNC RESULT TYPE
// =============================================================================

/**
 * Crew sync result payload
 */
interface CrewSyncData {
	crewCount: number;
	crew: Array<{ id: string; name: string }>;
}

type CrewSyncResult = SyncResult<CrewSyncData>;

// =============================================================================
// SYNC HANDLER
// =============================================================================

/**
 * Sync current ISS crew from API to collection
 *
 * Fetches the latest crew data and bulk inserts it into the crew collection.
 * Adds fetchedAt timestamp to track data freshness.
 * This triggers reactive updates for all useLiveQuery hooks watching the collection.
 *
 * @returns Promise resolving to sync result with success status
 */
export async function syncCrew(): Promise<CrewSyncResult> {
	try {
		const crew = await fetchCrewData();
		const fetchedAt = Date.now();

		// Add fetchedAt timestamp to each astronaut record
		const storedCrew = crew.map((astronaut) => ({
			...astronaut,
			fetchedAt,
		}));

		// Bulk insert into collection (atomic, efficient batch operation)
		await crewCollection.utils.bulkInsertLocally(storedCrew);

		return createSyncSuccess({
			crewCount: crew.length,
			crew: crew.map((a) => ({ id: a.id, name: a.name })),
		});
	} catch (error) {
		return createSyncError(
			error instanceof Error ? error : new Error(String(error)),
		);
	}
}

// =============================================================================
// SYNC LIFECYCLE
// =============================================================================

/**
 * Start background crew sync with interval
 *
 * Performs initial sync immediately, then continues on interval.
 * Returns cleanup function to stop the sync.
 *
 * @param intervalMs - Sync interval in milliseconds (default: 3600000 = 1 hour)
 * @returns Cleanup function to stop sync
 *
 * @example
 * ```typescript
 * // Start syncing every hour
 * const stopSync = startCrewSync()
 *
 * // Later, stop the sync
 * stopSync()
 * ```
 */
export function startCrewSync(
	intervalMs: number = DEFAULT_CREW_SYNC_INTERVAL,
): () => void {
	// Initial sync with error logging
	syncCrew().catch((err) =>
		console.warn("[CrewSync] Initial sync failed:", err),
	);

	// Background sync
	const intervalId = setInterval(() => {
		syncCrew();
	}, intervalMs);

	// Return cleanup function
	return () => clearInterval(intervalId);
}
