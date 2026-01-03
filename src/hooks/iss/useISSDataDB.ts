/**
 * ISS Data Hooks with TanStack DB Live Queries
 *
 * These hooks provide reactive data loading by:
 * 1. Using TanStack DB useLiveQuery for reactive collection queries
 * 2. Automatically updating when collection data changes
 * 3. Providing consistent loading and error states
 *
 * These hooks replace the legacy TanStack Query + Dexie hooks with
 * unified TanStack DB collections for simpler, reactive data management.
 */

import { useLiveQuery } from "@tanstack/react-db";
import { useCallback, useState, useEffect } from "react";
import { crewCollection } from "@/lib/iss/collections/crew";
import { positionsCollection } from "@/lib/iss/collections/positions";
import { tleCollection } from "@/lib/iss/collections/tle";
import type { Astronaut, ISSPosition, TLEData } from "@/lib/iss/types";

// =============================================================================
// useISSPositionDB - Reactive position loading from collection
// =============================================================================

export interface UseISSPositionResult {
	/** Current position data from collection */
	data: ISSPosition | null;
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
 * Hook for ISS position with reactive TanStack DB live query
 *
 * Queries the latest position from the positions collection and
 * automatically updates when new positions are synced.
 *
 * Features:
 * - Reactive updates when collection changes (via sync handler)
 * - Instant load from IndexedDB (no network delay)
 * - Consistent interface with legacy useISSPosition hook
 * - Type-safe with Zod schema validation
 *
 * @returns Latest ISS position with loading/error states
 *
 * @example
 * ```typescript
 * function StatsPanel() {
 *   const { data: position, isLoading } = useISSPositionDB()
 *
 *   if (isLoading) return <div>Loading...</div>
 *   if (!position) return <div>No position data</div>
 *
 *   return <div>{position.latitude}° N</div>
 * }
 * ```
 */
export function useISSPositionDB(): UseISSPositionResult {
	// Query latest position from collection (ordered by timestamp descending)
	const query = useLiveQuery((q) =>
		q
			.from({ pos: positionsCollection })
			.orderBy(({ pos }) => pos.timestamp, "desc")
			.findOne(),
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
			? new Error("Failed to query position collection")
			: null,
	};
}

// =============================================================================
// useISSCrewDB - Reactive crew loading from collection
// =============================================================================

export interface UseISSCrewResult {
	/** Current crew data from collection */
	data: Astronaut[];
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
 * Hook for ISS crew with reactive TanStack DB live query
 *
 * Queries all crew members from the crew collection and
 * automatically updates when new crew data is synced.
 *
 * Features:
 * - Reactive updates when collection changes (via sync handler)
 * - Instant load from IndexedDB (no network delay)
 * - Consistent interface with legacy useISSCrew hook
 * - Type-safe with Zod schema validation
 *
 * @returns Array of current ISS crew members with loading/error states
 *
 * @example
 * ```typescript
 * function CrewList() {
 *   const { data: crew, isLoading } = useISSCrewDB()
 *
 *   if (isLoading) return <div>Loading crew...</div>
 *   if (crew.length === 0) return <div>No crew data</div>
 *
 *   return crew.map(astronaut => <CrewCard key={astronaut.id} astronaut={astronaut} />)
 * }
 * ```
 */
export function useISSCrewDB(): UseISSCrewResult {
	// Query all crew members from collection (returns array by default)
	const query = useLiveQuery((q) => q.from({ crew: crewCollection }));

	return {
		// Convert undefined to empty array for compatibility with legacy interface
		data: (query.data ?? []) as Astronaut[],
		// isLoading is true until first data is ready
		isLoading: query.isLoading,
		// DB collections always serve from cache (IndexedDB)
		fromCache: true,
		// For DB collections, isFetching is same as isLoading
		isFetching: query.isLoading,
		// Convert isError boolean to Error | null
		error: query.isError ? new Error("Failed to query crew collection") : null,
	};
}

// =============================================================================
// useISSTLEDB - Reactive TLE loading from collection
// =============================================================================

export interface UseISSTLEResult {
	/** Current TLE data from collection (converted to tuple format) */
	data: TLEData | null;
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
 * Hook for ISS TLE data with reactive TanStack DB live query
 *
 * Queries the latest TLE from the TLE collection and
 * automatically updates when new TLE data is synced.
 *
 * Features:
 * - Reactive updates when collection changes (via sync handler)
 * - Instant load from IndexedDB (no network delay)
 * - Consistent interface with legacy useISSTLE hook
 * - Type-safe with Zod schema validation
 * - Converts StoredTLE to TLEData format ([line1, line2])
 *
 * @returns Latest ISS TLE data with loading/error states
 *
 * @example
 * ```typescript
 * function OrbitalSolver() {
 *   const { data: tle, isLoading } = useISSTLEDB()
 *
 *   if (isLoading) return <div>Loading TLE...</div>
 *   if (!tle) return <div>No TLE data</div>
 *
 *   return <OrbitalCalculator tle={tle} />
 * }
 * ```
 */
export function useISSTLEDB(): UseISSTLEResult {
	// Query latest TLE from collection (ordered by fetchedAt descending)
	const query = useLiveQuery((q) =>
		q
			.from({ tle: tleCollection })
			.orderBy(({ tle }) => tle.fetchedAt, "desc")
			.findOne(),
	);

	// Convert StoredTLE to TLEData format ([line1, line2])
	const tleData: TLEData | null = query.data
		? [query.data.line1, query.data.line2]
		: null;

	return {
		// Convert StoredTLE to TLEData tuple format
		data: tleData,
		// isLoading is true until first data is ready
		isLoading: query.isLoading,
		// DB collections always serve from cache (IndexedDB)
		fromCache: true,
		// For DB collections, isFetching is same as isLoading
		isFetching: query.isLoading,
		// Convert isError boolean to Error | null
		error: query.isError ? new Error("Failed to query TLE collection") : null,
	};
}

// =============================================================================
// usePositionHistoryDB - Reactive position history with range queries
// =============================================================================

export interface UsePositionHistoryResult {
	/** Array of position records in range */
	positions: ISSPosition[];
	/** Whether history is loading */
	isLoading: boolean;
	/** Any error that occurred */
	error: Error | null;
	/** Fetch positions for a specific time range */
	fetchRange: (startMs: number, endMs: number) => void;
}

/**
 * Hook for historical position data with reactive TanStack DB live query
 *
 * Queries positions within a time range from the positions collection
 * and automatically updates when new positions are synced.
 *
 * Features:
 * - Reactive updates when collection changes (via sync handler)
 * - Efficient range queries using timestamp index
 * - Instant load from IndexedDB (no network delay)
 * - Consistent interface with legacy usePositionHistory hook
 * - Type-safe with Zod schema validation
 *
 * @returns Position history with range query function
 *
 * @example
 * ```typescript
 * function GroundTrackMap() {
 *   const { positions, isLoading, fetchRange } = usePositionHistoryDB()
 *
 *   useEffect(() => {
 *     // Query last hour of positions
 *     const endTime = Date.now()
 *     const startTime = endTime - (60 * 60 * 1000)
 *     fetchRange(startTime, endTime)
 *   }, [])
 *
 *   return <MapPath positions={positions} />
 * }
 * ```
 */
export function usePositionHistoryDB(): UsePositionHistoryResult {
	const [timeRange, setTimeRange] = useState<{
		start: number;
		end: number;
	} | null>(null);

	// State to hold filtered positions from Dexie query
	const [positions, setPositions] = useState<ISSPosition[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	// Query positions in time range using Dexie's efficient indexed range query
	useEffect(() => {
		if (!timeRange) {
			setPositions([]);
			return;
		}

		setIsLoading(true);

		// Use Dexie's indexed range query for efficient filtering
		const table = positionsCollection.utils.getTable();
		const startTimestamp = timeRange.start / 1000;
		const endTimestamp = timeRange.end / 1000;

		// Efficient indexed query using Dexie's where().between()
		// Use inclusive bounds (true, true) to include positions exactly at start/end timestamps
		table
			.where("timestamp")
			.between(startTimestamp, endTimestamp, true, true)
			.toArray()
			.then((results: unknown) => {
				setPositions(results as ISSPosition[]);
				setIsLoading(false);
			})
			.catch((error: unknown) => {
				console.error("Error querying position history:", error);
				setPositions([]);
				setIsLoading(false);
			});
	}, [timeRange]);

	// Callback to update time range (triggers query re-run)
	const fetchRange = useCallback((startMs: number, endMs: number) => {
		setTimeRange({ start: startMs, end: endMs });
	}, []);

	return {
		// Return filtered positions by time range
		positions,
		// isLoading is true while query is running
		isLoading,
		// No error handling in this implementation
		error: null,
		// Provide range query function
		fetchRange,
	};
}
