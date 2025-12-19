/**
 * usePasses Hook
 *
 * TanStack Query hook for fetching multiple ISS pass predictions.
 */

import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { type PredictPassesOptions, predictPasses } from "@/lib/iss/orbital";
import { issQueries } from "@/lib/iss/queries";
import type { PassPrediction } from "@/lib/iss/types";
import { locationStore } from "@/lib/location/store";

// =============================================================================
// TYPES
// =============================================================================

export interface UsePassesOptions extends PredictPassesOptions {
	/** Enable/disable the query (default: true) */
	enabled?: boolean;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * usePasses - Fetch multiple pass predictions for current location
 *
 * @param options - Prediction options (maxPasses, maxDays, minElevation)
 * @returns Query result with passes data
 */
export function usePasses(options: UsePassesOptions = {}) {
	const { enabled = true, ...predictOptions } = options;

	// Get coordinates from location store
	const coordinates = useStore(locationStore, (s) => s.coordinates);

	// Get TLE data
	const { data: tle, isLoading: tleLoading } = useQuery(issQueries.tle());

	// Compute passes when we have both location and TLE
	const query = useQuery({
		queryKey: [
			"passes",
			coordinates?.lat,
			coordinates?.lng,
			predictOptions.maxPasses ?? 10,
			predictOptions.maxDays ?? 7,
			predictOptions.minElevation ?? 10,
		],
		queryFn: (): PassPrediction[] => {
			if (!coordinates || !tle || tle.length !== 2) {
				return [];
			}

			return predictPasses(tle[0], tle[1], coordinates, predictOptions);
		},
		enabled: enabled && !!coordinates && !!tle && tle.length === 2,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 30 * 60 * 1000, // 30 minutes
	});

	return {
		passes: query.data ?? [],
		isLoading: query.isLoading || tleLoading,
		isFetching: query.isFetching,
		error: query.error,
		refetch: query.refetch,
		hasLocation: coordinates !== null,
	};
}
