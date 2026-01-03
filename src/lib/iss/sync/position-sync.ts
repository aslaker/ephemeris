/**
 * ISS Position Sync Handler
 *
 * Fetches ISS position from API and inserts into TanStack DB collection.
 * Provides background sync with configurable intervals for reactive updates.
 */

import { fetchISSPosition } from "@/lib/iss/api";
import { positionsCollection } from "@/lib/iss/collections/positions";
import type { SyncResult } from "./types";
import { createSyncSuccess, createSyncError } from "./types";

// =============================================================================
// SYNC CONFIGURATION
// =============================================================================

/**
 * Default position sync interval in milliseconds
 * ISS moves quickly, so we refresh every 5 seconds
 */
export const DEFAULT_POSITION_SYNC_INTERVAL = 5000;

// =============================================================================
// SYNC RESULT TYPE
// =============================================================================

/**
 * Position sync result payload
 */
interface PositionSyncData {
	latitude: number;
	longitude: number;
	altitude: number;
}

type PositionSyncResult = SyncResult<PositionSyncData>;

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
export async function syncPosition(): Promise<PositionSyncResult> {
	try {
		const position = await fetchISSPosition();

		// Insert into collection (triggers useLiveQuery updates)
		await positionsCollection.insert(position);

		return createSyncSuccess({
			latitude: position.latitude,
			longitude: position.longitude,
			altitude: position.altitude,
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
	// Initial sync with error logging
	syncPosition().catch((err) =>
		console.warn("[PositionSync] Initial sync failed:", err),
	);

	// Background sync
	const intervalId = setInterval(() => {
		syncPosition();
	}, intervalMs);

	// Return cleanup function
	return () => clearInterval(intervalId);
}
