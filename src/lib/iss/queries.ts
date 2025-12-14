/**
 * TanStack Query Factory for ISS Data
 *
 * Query keys and structure designed for future TanStack DB migration.
 * All entities have `id` fields compatible with `getKey: (item) => item.id`.
 */

import { queryOptions } from "@tanstack/react-query";
import { fetchCrewData, fetchISSPosition, fetchTLE } from "./api";

/**
 * ISS Query factory
 * Follows TanStack Query best practices with query factory pattern.
 */
export const issQueries = {
	/**
	 * Current ISS position - refetches every 5 seconds
	 */
	currentPosition: () =>
		queryOptions({
			queryKey: ["iss", "position", "current"] as const,
			queryFn: fetchISSPosition,
			refetchInterval: 5000,
			staleTime: 0,
		}),

	/**
	 * TLE orbital data - cached for 1 hour
	 */
	tle: () =>
		queryOptions({
			queryKey: ["iss", "tle"] as const,
			queryFn: fetchTLE,
			staleTime: 1000 * 60 * 60, // 1 hour
		}),

	/**
	 * ISS crew manifest - cached for 1 hour
	 * Returns Astronaut[] for TanStack DB collection compatibility
	 */
	crew: () =>
		queryOptions({
			queryKey: ["iss", "crew"] as const,
			queryFn: fetchCrewData,
			staleTime: 1000 * 60 * 60, // 1 hour
		}),
};
