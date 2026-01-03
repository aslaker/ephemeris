/**
 * usePasses Hook
 *
 * Hook for fetching multiple ISS pass predictions using TLE from DB collection.
 */

import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { type PredictPassesOptions, predictPasses } from "@/lib/iss/orbital";
import type { PassPrediction } from "@/lib/iss/types";
import { locationStore } from "@/lib/location/store";
import { useISSTLEDB } from "@/hooks/iss/useISSDataDB";

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

	// Get TLE data from DB collection
	const { data: tle, isLoading: tleLoading } = useISSTLEDB();

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
