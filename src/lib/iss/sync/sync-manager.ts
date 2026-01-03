/**
 * Unified Sync Manager
 *
 * Coordinates all ISS data sync handlers with configurable intervals.
 * Manages lifecycle for position, crew, and TLE syncs with visibility handling.
 */

import { DEFAULT_CREW_SYNC_INTERVAL, startCrewSync } from "./crew-sync";
import {
	DEFAULT_POSITION_SYNC_INTERVAL,
	startPositionSync,
} from "./position-sync";
import { DEFAULT_TLE_SYNC_INTERVAL, startTLESync } from "./tle-sync";

// =============================================================================
// SYNC MANAGER CONFIGURATION
// =============================================================================

/**
 * Configuration for all sync intervals
 */
export interface SyncConfig {
	/**
	 * Position sync interval in milliseconds
	 * Default: 5000 (5 seconds)
	 */
	positionInterval?: number;

	/**
	 * Crew sync interval in milliseconds
	 * Default: 3600000 (1 hour)
	 */
	crewInterval?: number;

	/**
	 * TLE sync interval in milliseconds
	 * Default: 3600000 (1 hour)
	 */
	tleInterval?: number;

	/**
	 * Whether to pause syncing when page is hidden
	 * Default: true
	 */
	pauseOnHidden?: boolean;
}

/**
 * Default sync configuration
 */
const DEFAULT_SYNC_CONFIG: Required<SyncConfig> = {
	positionInterval: DEFAULT_POSITION_SYNC_INTERVAL,
	crewInterval: DEFAULT_CREW_SYNC_INTERVAL,
	tleInterval: DEFAULT_TLE_SYNC_INTERVAL,
	pauseOnHidden: true,
};

// =============================================================================
// SYNC MANAGER STATE
// =============================================================================

/**
 * Internal state for managing sync lifecycle
 */
interface SyncState {
	isRunning: boolean;
	config: Required<SyncConfig>;
	cleanups: Array<() => void>;
	visibilityHandler?: () => void;
}

// =============================================================================
// SYNC MANAGER
// =============================================================================

/**
 * Unified sync manager for all ISS data
 *
 * Coordinates position, crew, and TLE sync handlers with configurable intervals.
 * Handles visibility changes to pause/resume syncing when tab is hidden/visible.
 *
 * @example
 * ```typescript
 * // Start all syncs with default intervals
 * const manager = createSyncManager()
 * manager.start()
 *
 * // Later, stop all syncs
 * manager.stop()
 *
 * // Custom intervals
 * const customManager = createSyncManager({
 *   positionInterval: 10000, // 10 seconds
 *   crewInterval: 7200000,   // 2 hours
 * })
 * customManager.start()
 * ```
 */
export interface SyncManager {
	/**
	 * Start all sync handlers
	 */
	start(): void;

	/**
	 * Stop all sync handlers and cleanup
	 */
	stop(): void;

	/**
	 * Check if sync is currently running
	 */
	isRunning(): boolean;

	/**
	 * Get current sync configuration
	 */
	getConfig(): Required<SyncConfig>;
}

/**
 * Create a new sync manager instance
 *
 * @param config - Optional sync configuration
 * @returns SyncManager instance
 */
export function createSyncManager(config: SyncConfig = {}): SyncManager {
	const state: SyncState = {
		isRunning: false,
		config: {
			...DEFAULT_SYNC_CONFIG,
			...config,
		},
		cleanups: [],
	};

	/**
	 * Start all sync handlers
	 */
	const start = (): void => {
		if (state.isRunning) {
			return;
		}

		// Start all sync handlers
		const positionCleanup = startPositionSync(state.config.positionInterval);
		const crewCleanup = startCrewSync(state.config.crewInterval);
		const tleCleanup = startTLESync(state.config.tleInterval);

		state.cleanups = [positionCleanup, crewCleanup, tleCleanup];
		state.isRunning = true;

		// Handle visibility changes if enabled
		if (state.config.pauseOnHidden && typeof document !== "undefined") {
			state.visibilityHandler = handleVisibilityChange;
			document.addEventListener("visibilitychange", state.visibilityHandler);
		}
	};

	/**
	 * Stop all sync handlers
	 */
	const stop = (): void => {
		if (!state.isRunning) {
			return;
		}

		// Call all cleanup functions
		for (const cleanup of state.cleanups) {
			cleanup();
		}

		state.cleanups = [];
		state.isRunning = false;

		// Remove visibility handler
		if (state.visibilityHandler && typeof document !== "undefined") {
			document.removeEventListener("visibilitychange", state.visibilityHandler);
			state.visibilityHandler = undefined;
		}
	};

	/**
	 * Handle visibility change events
	 * Pause syncing when page is hidden, resume when visible
	 */
	const handleVisibilityChange = (): void => {
		if (typeof document === "undefined") {
			return;
		}

		if (document.hidden) {
			// Page is hidden - stop syncing to save resources
			if (state.isRunning) {
				for (const cleanup of state.cleanups) {
					cleanup();
				}
				state.cleanups = [];
			}
		} else {
			// Page is visible - resume syncing
			if (state.isRunning && state.cleanups.length === 0) {
				const positionCleanup = startPositionSync(
					state.config.positionInterval,
				);
				const crewCleanup = startCrewSync(state.config.crewInterval);
				const tleCleanup = startTLESync(state.config.tleInterval);

				state.cleanups = [positionCleanup, crewCleanup, tleCleanup];
			}
		}
	};

	/**
	 * Check if sync is running
	 */
	const isRunning = (): boolean => {
		return state.isRunning;
	};

	/**
	 * Get current configuration
	 */
	const getConfig = (): Required<SyncConfig> => {
		return { ...state.config };
	};

	return {
		start,
		stop,
		isRunning,
		getConfig,
	};
}

/**
 * Singleton sync manager instance
 * Use this for simple cases where you only need one manager
 */
let defaultManager: SyncManager | null = null;

/**
 * Get or create the default sync manager
 *
 * @param config - Optional sync configuration (only used on first call)
 * @returns Default SyncManager instance
 *
 * @example
 * ```typescript
 * // In your app initialization
 * const manager = getDefaultSyncManager()
 * manager.start()
 *
 * // In cleanup/unmount
 * manager.stop()
 * ```
 */
export function getDefaultSyncManager(config?: SyncConfig): SyncManager {
	if (!defaultManager) {
		defaultManager = createSyncManager(config);
	}
	return defaultManager;
}

/**
 * Reset the default sync manager
 * Useful for testing or when you need to reinitialize with new config
 */
export function resetDefaultSyncManager(): void {
	if (defaultManager) {
		defaultManager.stop();
		defaultManager = null;
	}
}
