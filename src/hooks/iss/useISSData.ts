/**
 * ISS Data Hooks with Cache-First Loading
 *
 * These hooks provide instant app loads by:
 * 1. Loading cached data from IndexedDB immediately on mount
 * 2. Starting TanStack Query background refresh
 * 3. Seamlessly transitioning to fresh data when available
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import {
	getCachedCrew,
	getCachedPosition,
	getCachedTLE,
	getPositionsInRange,
	type StoredAstronaut,
	type StoredTLE,
} from "@/lib/iss/db";
import { issQueries } from "@/lib/iss/queries";
import {
	detectAndRemoveCorruption,
	fillGapsInRange,
	startCleanupScheduler,
	stopCleanupScheduler,
} from "@/lib/iss/storage";
import type { Astronaut, ISSPosition, TLEData } from "@/lib/iss/types";

// =============================================================================
// useISSPosition - Cache-first position loading
// =============================================================================

export interface UseISSPositionResult {
	/** Current position data (cached or fresh) */
	data: ISSPosition | null;
	/** Whether initial data is loading (no cache, waiting for network) */
	isLoading: boolean;
	/** Whether data came from cache (before network response) */
	fromCache: boolean;
	/** Whether a background fetch is in progress */
	isFetching: boolean;
	/** Any error from the query */
	error: Error | null;
}

/**
 * Hook for ISS position with cache-first loading pattern
 *
 * On mount:
 * 1. Immediately loads cached position from IndexedDB
 * 2. Starts TanStack Query for network fetch + background refresh
 * 3. Returns cached data while network is loading
 * 4. Seamlessly updates to fresh data when available
 */
export function useISSPosition(): UseISSPositionResult {
	const [cachedPosition, setCachedPosition] = useState<ISSPosition | null>(
		null,
	);
	const [loadingCache, setLoadingCache] = useState(true);

	// Load from Dexie on mount (instant)
	useEffect(() => {
		getCachedPosition()
			.then((pos) => {
				if (pos) setCachedPosition(pos);
			})
			.catch((e) => console.warn("Failed to load cached position:", e))
			.finally(() => setLoadingCache(false));
	}, []);

	// TanStack Query for network fetch + background refresh
	const query = useQuery(issQueries.currentPosition());

	// Return cached while query is loading, then switch to fresh data
	return {
		data: query.data ?? cachedPosition,
		isLoading: query.isLoading && loadingCache,
		fromCache: !query.data && !!cachedPosition,
		isFetching: query.isFetching,
		error: query.error,
	};
}

// =============================================================================
// useISSCrew - Cache-first crew loading
// =============================================================================

export interface UseISSCrewResult {
	/** Current crew data (cached or fresh) */
	data: Astronaut[];
	/** Whether initial data is loading (no cache, waiting for network) */
	isLoading: boolean;
	/** Whether data came from cache (before network response) */
	fromCache: boolean;
	/** Whether a background fetch is in progress */
	isFetching: boolean;
	/** Any error from the query */
	error: Error | null;
}

/**
 * Hook for ISS crew data with cache-first loading pattern
 */
export function useISSCrew(): UseISSCrewResult {
	const [cachedCrew, setCachedCrew] = useState<StoredAstronaut[]>([]);
	const [loadingCache, setLoadingCache] = useState(true);

	// Load from Dexie on mount
	useEffect(() => {
		getCachedCrew()
			.then((crew) => {
				if (crew.length > 0) setCachedCrew(crew);
			})
			.catch((e) => console.warn("Failed to load cached crew:", e))
			.finally(() => setLoadingCache(false));
	}, []);

	// TanStack Query for network fetch + background refresh
	const query = useQuery(issQueries.crew());

	return {
		data: query.data ?? cachedCrew,
		isLoading: query.isLoading && loadingCache && cachedCrew.length === 0,
		fromCache: !query.data && cachedCrew.length > 0,
		isFetching: query.isFetching,
		error: query.error,
	};
}

// =============================================================================
// useISSTLE - Cache-first TLE loading
// =============================================================================

export interface UseISSTLEResult {
	/** Current TLE data (cached or fresh) */
	data: TLEData | null;
	/** Whether initial data is loading (no cache, waiting for network) */
	isLoading: boolean;
	/** Whether data came from cache (before network response) */
	fromCache: boolean;
	/** Whether a background fetch is in progress */
	isFetching: boolean;
	/** Any error from the query */
	error: Error | null;
}

/**
 * Hook for TLE data with cache-first loading pattern
 */
export function useISSTLE(): UseISSTLEResult {
	const [cachedTLE, setCachedTLE] = useState<StoredTLE | null>(null);
	const [loadingCache, setLoadingCache] = useState(true);

	// Load from Dexie on mount
	useEffect(() => {
		getCachedTLE()
			.then((tle) => {
				if (tle) setCachedTLE(tle);
			})
			.catch((e) => console.warn("Failed to load cached TLE:", e))
			.finally(() => setLoadingCache(false));
	}, []);

	// TanStack Query for network fetch + background refresh
	const query = useQuery(issQueries.tle());

	// Convert stored TLE to TLEData format
	const tleData: TLEData | null = query.data
		? query.data
		: cachedTLE
			? [cachedTLE.line1, cachedTLE.line2]
			: null;

	return {
		data: tleData,
		isLoading: query.isLoading && loadingCache,
		fromCache: !query.data && !!cachedTLE,
		isFetching: query.isFetching,
		error: query.error,
	};
}

// =============================================================================
// usePositionHistory - Historical position data
// =============================================================================

export interface UsePositionHistoryResult {
	/** Array of position records in range */
	positions: ISSPosition[];
	/** Whether history is loading */
	isLoading: boolean;
	/** Any error that occurred */
	error: Error | null;
	/** Fetch positions for a specific time range */
	fetchRange: (startMs: number, endMs: number) => Promise<void>;
}

/**
 * Hook for querying historical position data from IndexedDB
 */
export function usePositionHistory(): UsePositionHistoryResult {
	const [positions, setPositions] = useState<ISSPosition[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const fetchRange = useCallback(async (startMs: number, endMs: number) => {
		setIsLoading(true);
		setError(null);

		try {
			// Convert milliseconds to seconds for query
			const startTimestamp = startMs / 1000;
			const endTimestamp = endMs / 1000;

			const result = await getPositionsInRange(startTimestamp, endTimestamp);
			setPositions(result);
		} catch (e) {
			setError(e instanceof Error ? e : new Error("Failed to fetch history"));
			setPositions([]);
		} finally {
			setIsLoading(false);
		}
	}, []);

	return { positions, isLoading, error, fetchRange };
}

// =============================================================================
// useGapFilling - Fill gaps in historical data
// =============================================================================

export interface UseGapFillingResult {
	/** Whether gap filling is in progress */
	isFilling: boolean;
	/** Number of synthetic positions added */
	filled: number;
	/** Fill gaps in a time range */
	fillGaps: (startMs: number, endMs: number) => Promise<void>;
}

/**
 * Hook to fill gaps in position history using orbital calculations
 */
export function useGapFilling(): UseGapFillingResult {
	const [isFilling, setIsFilling] = useState(false);
	const [filled, setFilled] = useState(0);

	// Get TLE data for orbital calculations
	const { data: tle } = useISSTLE();

	const fillGaps = useCallback(
		async (startMs: number, endMs: number) => {
			if (!tle) {
				console.warn("[useGapFilling] No TLE data available");
				return;
			}

			setIsFilling(true);

			try {
				const count = await fillGapsInRange(startMs / 1000, endMs / 1000, tle);
				setFilled((prev) => prev + count);
			} catch (e) {
				console.error("[useGapFilling] Failed:", e);
			} finally {
				setIsFilling(false);
			}
		},
		[tle],
	);

	return { isFilling, filled, fillGaps };
}

// =============================================================================
// useStorageCleanup - Manage storage cleanup scheduler
// =============================================================================

/**
 * Hook to manage storage cleanup scheduler lifecycle
 * Should be used at the app root level
 */
export function useStorageCleanup(): void {
	const queryClient = useQueryClient();

	useEffect(() => {
		if (typeof window === "undefined") return;

		// Start cleanup scheduler
		startCleanupScheduler();

		// Check for corruption on mount
		detectAndRemoveCorruption().then((result) => {
			if (result.needsRefetch) {
				console.info("[Storage] Corruption detected, triggering refetch");
				// Invalidate queries to trigger fresh fetch
				queryClient.invalidateQueries({ queryKey: ["iss"] });
			}
		});

		// Cleanup on unmount
		return () => {
			stopCleanupScheduler();
		};
	}, [queryClient]);
}

// =============================================================================
// useWindowFocus - Smart refetching on window focus/visibility
// =============================================================================

/**
 * Hook to trigger refetch when window regains focus
 * TanStack Query has built-in refetchOnWindowFocus, but this provides more control
 */
export function useWindowFocusRefetch(): void {
	const queryClient = useQueryClient();

	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				// Refetch position immediately when tab becomes visible
				queryClient.invalidateQueries({
					queryKey: ["iss", "position", "current"],
				});
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [queryClient]);
}
