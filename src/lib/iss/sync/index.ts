/**
 * ISS Data Sync Module
 *
 * Exports all sync handlers and the unified sync manager.
 * Provides background data synchronization for ISS position, crew, and TLE data.
 */

// =============================================================================
// SYNC MANAGER
// =============================================================================

export {
	createSyncManager,
	getDefaultSyncManager,
	resetDefaultSyncManager,
	DEFAULT_POSITION_SYNC_INTERVAL,
	DEFAULT_CREW_SYNC_INTERVAL,
	DEFAULT_TLE_SYNC_INTERVAL,
} from "./sync-manager";

export type { SyncConfig, SyncManager } from "./sync-manager";

// =============================================================================
// INDIVIDUAL SYNC HANDLERS
// =============================================================================

export { syncPosition, startPositionSync } from "./position-sync";
export { syncCrew, startCrewSync } from "./crew-sync";
export { syncTLE, startTLESync } from "./tle-sync";
