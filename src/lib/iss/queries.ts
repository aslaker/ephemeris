/**
 * TanStack Query Factory for ISS Data
 *
 * Query keys and structure designed for future TanStack DB migration.
 * All entities have `id` fields compatible with `getKey: (item) => item.id`.
 *
 * Side effects persist data to IndexedDB via Dexie for cache-first loading.
 */

import * as Sentry from "@sentry/tanstackstart-react";
import { queryOptions } from "@tanstack/react-query";
import { fetchCrewData, fetchISSPosition, fetchTLE } from "./api";
import { storeCrew, storePosition, storeTLE } from "./db";

/**
 * ISS Query factory
 * Follows TanStack Query best practices with query factory pattern.
 * Each queryFn includes a side effect to persist data to IndexedDB.
 */
export const issQueries = {
	/**
	 * Current ISS position - refetches every 5 seconds
	 * Side effect: persists to IndexedDB for instant app loads
	 */
	currentPosition: () =>
		queryOptions({
			queryKey: ["iss", "position", "current"] as const,
			queryFn: async () => {
				const position = await fetchISSPosition();

				// Side effect: persist to IndexedDB (fire and forget, don't block)
				if (typeof window !== "undefined") {
					storePosition(position).catch((err) => {
						console.warn("[ISS Queries] Failed to persist position:", err);
					});
				}

				return position;
			},
			refetchInterval: 5000,
			staleTime: 0,
			// Retry failed background refreshes
			retry: 3,
			retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
		}),

	/**
	 * TLE orbital data - cached for 1 hour
	 * Side effect: persists to IndexedDB
	 */
	tle: () =>
		queryOptions({
			queryKey: ["iss", "tle"] as const,
			queryFn: async () => {
				const tle = await fetchTLE();

				// Side effect: persist to IndexedDB
				if (typeof window !== "undefined") {
					storeTLE(tle[0], tle[1], "celestrak").catch((err) => {
						console.warn("[ISS Queries] Failed to persist TLE:", err);
					});
				}

				return tle;
			},
			staleTime: 1000 * 60 * 60, // 1 hour
			retry: 3,
		}),

	/**
	 * ISS crew manifest - cached for 1 hour
	 * Returns Astronaut[] for TanStack DB collection compatibility
	 * Side effect: persists to IndexedDB
	 */
	crew: () =>
		queryOptions({
			queryKey: ["iss", "crew"] as const,
			queryFn: async () => {
				const crew = await Sentry.startSpan(
					{ name: "Background crew refresh" },
					async () => fetchCrewData(),
				);

				// Side effect: persist to IndexedDB with fetch timestamp
				if (typeof window !== "undefined") {
					storeCrew(crew).catch((err) => {
						console.warn("[ISS Queries] Failed to persist crew:", err);
					});
				}

				return crew;
			},
			staleTime: 1000 * 60 * 60, // 1 hour
			retry: 3,
		}),
};
