/**
 * ISS Position Sync Handler
 *
 * Fetches ISS position from API and inserts into TanStack DB collection.
 * Provides background sync with configurable intervals for reactive updates.
 */

import { fetchISSPosition } from "@/lib/iss/api";
import { positionsCollection } from "@/lib/iss/collections/positions";

// =============================================================================
// SYNC CONFIGURATION
// =============================================================================

/**
 * Default position sync interval in milliseconds
 * ISS moves quickly, so we refresh every 5 seconds
 */
export const DEFAULT_POSITION_SYNC_INTERVAL = 5000;

// =============================================================================
// SYNC RESULT TYPES
// =============================================================================

interface SyncSuccess {
	success: true;
	timestamp: number;
	position: {
		latitude: number;
		longitude: number;
		altitude: number;
	};
}

interface SyncError {
	success: false;
	error: Error;
	timestamp: number;
}

type SyncResult = SyncSuccess | SyncError;

// =============================================================================
// SYNC HANDLER
// =============================================================================

/**
 * Sync current ISS position from API to collection
 *
 * Fetches the latest position data and inserts it into the positions collection.
 * This triggers reactive updates for all useLiveQuery hooks watching the collection.
 *
 * @returns Promise resolving to sync result with success status
 */
export async function syncPosition(): Promise<SyncResult> {
	try {
		const position = await fetchISSPosition();

		// Insert into collection (triggers useLiveQuery updates)
		await positionsCollection.insert(position);

		return {
			success: true,
			timestamp: Date.now(),
			position: {
				latitude: position.latitude,
				longitude: position.longitude,
				altitude: position.altitude,
			},
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error : new Error(String(error)),
			timestamp: Date.now(),
		};
	}
}

// =============================================================================
// SYNC LIFECYCLE
// =============================================================================

/**
 * Start background position sync with interval
 *
 * Performs initial sync immediately, then continues on interval.
 * Returns cleanup function to stop the sync.
 *
 * @param intervalMs - Sync interval in milliseconds (default: 5000)
 * @returns Cleanup function to stop sync
 *
 * @example
 * ```typescript
 * // Start syncing every 5 seconds
 * const stopSync = startPositionSync()
 *
 * // Later, stop the sync
 * stopSync()
 * ```
 */
export function startPositionSync(
	intervalMs: number = DEFAULT_POSITION_SYNC_INTERVAL,
): () => void {
	// Initial sync (fire and forget)
	syncPosition();

	// Background sync
	const intervalId = setInterval(() => {
		syncPosition();
	}, intervalMs);

	// Return cleanup function
	return () => clearInterval(intervalId);
}
