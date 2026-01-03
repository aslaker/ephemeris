/**
 * ISS Data Sync Module
 *
 * Exports all sync handlers and the unified sync manager.
 * Provides background data synchronization for ISS position, crew, and TLE data.
 */

// =============================================================================
// SYNC MANAGER
// =============================================================================

export type { SyncConfig, SyncManager } from "./sync-manager";
export {
	createSyncManager,
	DEFAULT_CREW_SYNC_INTERVAL,
	DEFAULT_POSITION_SYNC_INTERVAL,
	DEFAULT_TLE_SYNC_INTERVAL,
	getDefaultSyncManager,
	resetDefaultSyncManager,
} from "./sync-manager";

// =============================================================================
// INDIVIDUAL SYNC HANDLERS
// =============================================================================

export { startCrewSync, syncCrew } from "./crew-sync";
export { startPositionSync, syncPosition } from "./position-sync";
export { startTLESync, syncTLE } from "./tle-sync";
