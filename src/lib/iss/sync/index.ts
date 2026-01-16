/**
 * ISS Data Sync Module
 *
 * Exports all sync handlers and the unified sync manager.
 * Provides background data synchronization for ISS position, crew, and TLE data.
 */

// =============================================================================
// SHARED TYPES
// =============================================================================

export type { SyncError, SyncResult, SyncSuccess } from "./types";
export { createSyncError, createSyncSuccess } from "./types";

// =============================================================================
// SYNC MANAGER
// =============================================================================

// Export sync interval constants from their source files
export { DEFAULT_CREW_SYNC_INTERVAL } from "./crew-sync";
export { DEFAULT_POSITION_SYNC_INTERVAL } from "./position-sync";
export type { SyncConfig, SyncManager } from "./sync-manager";
export {
	createSyncManager,
	getDefaultSyncManager,
	resetDefaultSyncManager,
} from "./sync-manager";
export { DEFAULT_TLE_SYNC_INTERVAL } from "./tle-sync";

// =============================================================================
// INDIVIDUAL SYNC HANDLERS
// =============================================================================

export { startCrewSync, syncCrew } from "./crew-sync";
export { startPositionSync, syncPosition } from "./position-sync";
export { startTLESync, syncTLE } from "./tle-sync";
