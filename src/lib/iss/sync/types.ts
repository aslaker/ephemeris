/**
 * Shared type definitions for sync handlers
 */

/**
 * Success result from a sync operation
 * @template T - Type of the success payload (data specific to each sync handler)
 */
export interface SyncSuccess<T> {
	success: true;
	timestamp: number;
	data: T;
}

/**
 * Error result from a sync operation
 */
export interface SyncError {
	success: false;
	error: Error;
	timestamp: number;
}

/**
 * Result of a sync operation
 * @template T - Type of the success payload
 */
export type SyncResult<T> = SyncSuccess<T> | SyncError;

/**
 * Helper to create a success result
 */
export function createSyncSuccess<T>(data: T): SyncSuccess<T> {
	return {
		success: true,
		timestamp: Date.now(),
		data,
	};
}

/**
 * Helper to create an error result
 */
export function createSyncError(error: Error): SyncError {
	return {
		success: false,
		error,
		timestamp: Date.now(),
	};
}
