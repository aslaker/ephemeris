/**
 * Briefing Data Hooks with TanStack DB Live Queries
 *
 * These hooks provide reactive data loading for AI pass briefings by:
 * 1. Using TanStack DB useLiveQuery for reactive collection queries
 * 2. Automatically updating when collection data changes
 * 3. Providing consistent loading and error states
 * 4. Supporting mutations (upsert, delete) with optimistic updates
 *
 * These hooks replace the legacy localStorage-based briefing cache with
 * unified TanStack DB collections for persistent, reactive data management.
 */

import { useLiveQuery } from "@tanstack/react-db";
import { useCallback } from "react";
import { briefingsCollection } from "@/lib/briefing/collections";
import type { PassBriefing } from "@/lib/briefing/types";

// =============================================================================
// useBriefingByPassIdDB - Get single briefing by pass ID
// =============================================================================

export interface UseBriefingByPassIdResult {
	/** Briefing data from collection (null if not found) */
	data: PassBriefing | null;
	/** Whether initial data is loading (collection not ready) */
	isLoading: boolean;
	/** Whether data came from cache (always true for DB collections) */
	fromCache: boolean;
	/** Whether a background fetch is in progress (same as isLoading for DB) */
	isFetching: boolean;
	/** Any error from the query */
	error: Error | null;
}

/**
 * Hook for fetching a single briefing by pass ID with reactive TanStack DB live query
 *
 * Queries a briefing by passId from the briefings collection and
 * automatically updates when briefing data is synced.
 *
 * Features:
 * - Reactive updates when collection changes
 * - Instant load from IndexedDB (no network delay)
 * - Consistent interface with legacy getBriefingByPassId
 * - Type-safe with Zod schema validation
 *
 * @param passId - The unique pass identifier
 * @returns Briefing data with loading/error states
 *
 * @example
 * ```typescript
 * function BriefingCard({ passId }: { passId: string }) {
 *   const { data: briefing, isLoading } = useBriefingByPassIdDB(passId)
 *
 *   if (isLoading) return <div>Loading briefing...</div>
 *   if (!briefing) return <div>No briefing found</div>
 *
 *   return <div>{briefing.summary}</div>
 * }
 * ```
 */
export function useBriefingByPassIdDB(
	passId: string,
): UseBriefingByPassIdResult {
	// Query briefing by passId from collection (returns undefined if not found)
	const query = useLiveQuery(
		(q) => {
			// Disable query if no passId provided
			if (!passId) return undefined;

			return q
				.from({ briefing: briefingsCollection })
				.where(({ briefing }) => briefing.passId === passId)
				.findOne();
		},
		[passId],
	);

	return {
		// Convert undefined to null for compatibility with legacy interface
		data: query.data ?? null,
		// isLoading is true until first data is ready
		isLoading: query.isLoading,
		// DB collections always serve from cache (IndexedDB)
		fromCache: true,
		// For DB collections, isFetching is same as isLoading
		isFetching: query.isLoading,
		// Convert isError boolean to Error | null
		error: query.isError
			? new Error("Failed to query briefing from collection")
			: null,
	};
}

// =============================================================================
// useBriefingByTimeDB - Find briefing by time (with tolerance)
// =============================================================================

export interface UseBriefingByTimeResult {
	/** Briefing data from collection (null if not found) */
	data: PassBriefing | null;
	/** Whether initial data is loading (collection not ready) */
	isLoading: boolean;
	/** Whether data came from cache (always true for DB collections) */
	fromCache: boolean;
	/** Whether a background fetch is in progress (same as isLoading for DB) */
	isFetching: boolean;
	/** Any error from the query */
	error: Error | null;
}

/**
 * Hook for finding a briefing by pass start time with tolerance
 *
 * Useful when pass IDs change due to recalculation. Finds the closest
 * briefing within the tolerance window.
 *
 * Features:
 * - Reactive updates when collection changes
 * - Instant load from IndexedDB (no network delay)
 * - Consistent interface with legacy findBriefingByTime
 * - Type-safe with Zod schema validation
 * - Configurable tolerance window (default 1 hour)
 *
 * @param startTime - The pass start time to search for (or null to disable)
 * @param toleranceHours - Time window tolerance in hours (default: 1)
 * @returns Briefing data with loading/error states
 *
 * @example
 * ```typescript
 * function BriefingCard({ passTime }: { passTime: Date }) {
 *   const { data: briefing, isLoading } = useBriefingByTimeDB(passTime, 1)
 *
 *   if (isLoading) return <div>Loading briefing...</div>
 *   if (!briefing) return <div>No briefing found</div>
 *
 *   return <div>{briefing.summary}</div>
 * }
 * ```
 */
export function useBriefingByTimeDB(
	startTime: Date | null,
	toleranceHours: number = 1,
): UseBriefingByTimeResult {
	// Query all briefings and filter by time in JavaScript
	const query = useLiveQuery(
		(q) => {
			// Disable query if no startTime provided
			if (!startTime) return undefined;

			return q.from({ briefing: briefingsCollection });
		},
		[startTime],
	);

	// Filter briefings by time window in JavaScript
	const matchingBriefing =
		query.data && startTime
			? (query.data as PassBriefing[]).find((briefing) => {
					const targetTime = startTime.getTime();
					const toleranceMs = toleranceHours * 60 * 60 * 1000;
					const briefingTime = briefing.viewingWindow?.optimalStart
						? new Date(briefing.viewingWindow.optimalStart).getTime()
						: null;

					return (
						briefingTime && Math.abs(briefingTime - targetTime) <= toleranceMs
					);
				})
			: null;

	return {
		// Return first matching briefing (or null if not found)
		data: matchingBriefing ?? null,
		// isLoading is true until first data is ready
		isLoading: query.isLoading,
		// DB collections always serve from cache (IndexedDB)
		fromCache: true,
		// For DB collections, isFetching is same as isLoading
		isFetching: query.isLoading,
		// Convert isError boolean to Error | null
		error: query.isError
			? new Error("Failed to query briefings from collection")
			: null,
	};
}

// =============================================================================
// useAllBriefingsDB - Get all briefings from collection
// =============================================================================

export interface UseAllBriefingsResult {
	/** Array of all briefings from collection */
	data: PassBriefing[];
	/** Whether initial data is loading (collection not ready) */
	isLoading: boolean;
	/** Whether data came from cache (always true for DB collections) */
	fromCache: boolean;
	/** Whether a background fetch is in progress (same as isLoading for DB) */
	isFetching: boolean;
	/** Any error from the query */
	error: Error | null;
}

/**
 * Hook for fetching all briefings with reactive TanStack DB live query
 *
 * Queries all briefings from the briefings collection and
 * automatically updates when briefings are added/removed.
 *
 * Features:
 * - Reactive updates when collection changes
 * - Instant load from IndexedDB (no network delay)
 * - Consistent interface with legacy getAllBriefings
 * - Type-safe with Zod schema validation
 * - Results ordered by generation timestamp (newest first)
 *
 * @returns Array of all briefings with loading/error states
 *
 * @example
 * ```typescript
 * function BriefingsList() {
 *   const { data: briefings, isLoading } = useAllBriefingsDB()
 *
 *   if (isLoading) return <div>Loading briefings...</div>
 *   if (briefings.length === 0) return <div>No briefings yet</div>
 *
 *   return briefings.map(briefing => <BriefingCard key={briefing.id} briefing={briefing} />)
 * }
 * ```
 */
export function useAllBriefingsDB(): UseAllBriefingsResult {
	// Query all briefings from collection (ordered by generatedAt descending)
	const query = useLiveQuery((q) =>
		q
			.from({ briefing: briefingsCollection })
			.orderBy(({ briefing }) => briefing.generatedAt, "desc"),
	);

	return {
		// Convert undefined to empty array for compatibility with legacy interface
		data: (query.data ?? []) as PassBriefing[],
		// isLoading is true until first data is ready
		isLoading: query.isLoading,
		// DB collections always serve from cache (IndexedDB)
		fromCache: true,
		// For DB collections, isFetching is same as isLoading
		isFetching: query.isLoading,
		// Convert isError boolean to Error | null
		error: query.isError
			? new Error("Failed to query all briefings from collection")
			: null,
	};
}

// =============================================================================
// MUTATION HELPERS - Insert, update, and delete operations
// =============================================================================

/**
 * Result of a mutation operation
 */
export interface MutationResult {
	/** Whether the operation succeeded */
	success: boolean;
	/** Error message if operation failed */
	error?: string;
}

/**
 * Insert or update a briefing in the collection (upsert operation)
 *
 * This function provides optimistic updates by immediately writing to the
 * collection, which triggers reactive useLiveQuery updates in all components.
 *
 * Features:
 * - Immediate UI updates via reactive queries
 * - Persistent storage in IndexedDB
 * - Cross-tab synchronization
 * - Type-safe with Zod schema validation
 *
 * @param briefing - The briefing to insert or update
 * @returns Promise resolving to success/error result
 *
 * @example
 * ```typescript
 * async function saveBriefing(briefing: PassBriefing) {
 *   const result = await upsertBriefingDB(briefing)
 *   if (!result.success) {
 *     console.error('Failed to save briefing:', result.error)
 *   }
 * }
 * ```
 */
export async function upsertBriefingDB(
	briefing: PassBriefing,
): Promise<MutationResult> {
	try {
		// Insert or update briefing in collection
		// The collection's getKey function returns briefing.passId, so this will
		// automatically update existing briefings or insert new ones
		await briefingsCollection.insert(briefing);

		return { success: true };
	} catch (error) {
		console.error("Failed to upsert briefing:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Delete a briefing from the collection by pass ID
 *
 * This function provides optimistic updates by immediately removing from the
 * collection, which triggers reactive useLiveQuery updates in all components.
 *
 * Features:
 * - Immediate UI updates via reactive queries
 * - Persistent storage in IndexedDB
 * - Cross-tab synchronization
 * - Type-safe operations
 *
 * @param passId - The pass ID of the briefing to delete
 * @returns Promise resolving to success/error result
 *
 * @example
 * ```typescript
 * async function removeBriefing(passId: string) {
 *   const result = await deleteBriefingDB(passId)
 *   if (!result.success) {
 *     console.error('Failed to delete briefing:', result.error)
 *   }
 * }
 * ```
 */
export async function deleteBriefingDB(
	passId: string,
): Promise<MutationResult> {
	try {
		// Delete briefing from collection by passId
		await briefingsCollection.delete(passId);

		return { success: true };
	} catch (error) {
		console.error("Failed to delete briefing:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Clear all briefings from the collection
 *
 * This function provides optimistic updates by immediately clearing the
 * collection, which triggers reactive useLiveQuery updates in all components.
 *
 * Features:
 * - Immediate UI updates via reactive queries
 * - Persistent storage in IndexedDB
 * - Cross-tab synchronization
 * - Type-safe operations
 *
 * @returns Promise resolving to success/error result
 *
 * @example
 * ```typescript
 * async function clearAllBriefings() {
 *   const result = await clearBriefingsDB()
 *   if (!result.success) {
 *     console.error('Failed to clear briefings:', result.error)
 *   }
 * }
 * ```
 */
export async function clearBriefingsDB(): Promise<MutationResult> {
	try {
		// Get all briefings to find their IDs
		const table = briefingsCollection.utils.getTable();
		const allRecords = await table.toArray();

		// Delete each briefing individually
		for (const record of allRecords) {
			await briefingsCollection.delete(record.passId);
		}

		return { success: true };
	} catch (error) {
		console.error("Failed to clear briefings:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

// =============================================================================
// BULK OPERATIONS - For efficient batch mutations
// =============================================================================

/**
 * Insert multiple briefings in a single batch operation
 *
 * This is more efficient than calling upsertBriefingDB multiple times
 * when you need to insert many briefings at once.
 *
 * Features:
 * - Single transaction for all inserts
 * - Immediate UI updates via reactive queries
 * - Persistent storage in IndexedDB
 * - Cross-tab synchronization
 *
 * @param briefings - Array of briefings to insert
 * @returns Promise resolving to success/error result
 *
 * @example
 * ```typescript
 * async function importBriefings(briefings: PassBriefing[]) {
 *   const result = await bulkInsertBriefingsDB(briefings)
 *   if (!result.success) {
 *     console.error('Failed to import briefings:', result.error)
 *   }
 * }
 * ```
 */
export async function bulkInsertBriefingsDB(
	briefings: PassBriefing[],
): Promise<MutationResult> {
	try {
		// Use utils.bulkInsertLocally for efficient batch insert
		await briefingsCollection.utils.bulkInsertLocally(briefings);

		return { success: true };
	} catch (error) {
		console.error("Failed to bulk insert briefings:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

// =============================================================================
// HELPER HOOK - Combined query and mutation
// =============================================================================

/**
 * Result interface combining query data and mutation functions
 */
export interface UseBriefingDBResult {
	/** Briefing data from collection (null if not found) */
	briefing: PassBriefing | null;
	/** Whether initial data is loading (collection not ready) */
	isLoading: boolean;
	/** Any error from the query */
	error: Error | null;
	/** Upsert a briefing (triggers reactive update) */
	upsert: (briefing: PassBriefing) => Promise<MutationResult>;
	/** Delete this briefing (triggers reactive update) */
	deleteBriefing: () => Promise<MutationResult>;
}

/**
 * Combined hook for querying and mutating a specific briefing
 *
 * This hook combines the query functionality of useBriefingByPassIdDB
 * with mutation helpers, providing a complete interface for working
 * with a single briefing.
 *
 * Features:
 * - Reactive updates when collection changes
 * - Instant load from IndexedDB (no network delay)
 * - Convenient mutation helpers
 * - Type-safe with Zod schema validation
 *
 * @param passId - The unique pass identifier
 * @returns Briefing data with loading/error states and mutation functions
 *
 * @example
 * ```typescript
 * function BriefingCard({ passId }: { passId: string }) {
 *   const { briefing, isLoading, upsert, deleteBriefing } = useBriefingDB(passId)
 *
 *   const handleSave = async (updatedBriefing: PassBriefing) => {
 *     const result = await upsert(updatedBriefing)
 *     if (!result.success) {
 *       console.error('Failed to save:', result.error)
 *     }
 *   }
 *
 *   const handleDelete = async () => {
 *     const result = await deleteBriefing()
 *     if (!result.success) {
 *       console.error('Failed to delete:', result.error)
 *     }
 *   }
 *
 *   if (isLoading) return <div>Loading...</div>
 *   if (!briefing) return <div>No briefing found</div>
 *
 *   return (
 *     <div>
 *       <h3>{briefing.summary}</h3>
 *       <button onClick={handleDelete}>Delete</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useBriefingDB(passId: string): UseBriefingDBResult {
	// Query the briefing by passId
	const { data, isLoading, error } = useBriefingByPassIdDB(passId);

	// Create memoized mutation helpers
	const upsert = useCallback(async (briefing: PassBriefing) => {
		return await upsertBriefingDB(briefing);
	}, []);

	const deleteBriefingFn = useCallback(async () => {
		return await deleteBriefingDB(passId);
	}, [passId]);

	return {
		briefing: data,
		isLoading,
		error,
		upsert,
		deleteBriefing: deleteBriefingFn,
	};
}
