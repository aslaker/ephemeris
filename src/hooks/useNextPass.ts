/**
 * useNextPass Hook
 *
 * Derives the next ISS pass prediction from the location store and TLE data.
 * This hook encapsulates the pass prediction logic that was previously in ISSLayout.
 */

import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useEffect, useState } from "react";
import { predictNextPass } from "@/lib/iss/orbital";
import { issQueries } from "@/lib/iss/queries";
import type { PassPrediction } from "@/lib/iss/types";
import { locationStore } from "@/lib/location/store";

// =============================================================================
// HOOK
// =============================================================================

/**
 * useNextPass - Compute next ISS pass for current location
 *
 * @returns Object containing:
 * - nextPass: PassPrediction or null
 * - isPredicting: Boolean indicating calculation in progress
 * - hasLocation: Boolean indicating if location is available
 */
export function useNextPass() {
	// Get coordinates from location store
	const coordinates = useStore(locationStore, (s) => s.coordinates);

	// Get TLE data from TanStack Query
	const { data: tle } = useQuery(issQueries.tle());

	// Local state for prediction
	const [nextPass, setNextPass] = useState<PassPrediction | null>(null);
	const [isPredicting, setIsPredicting] = useState(false);

	// Recalculate pass when location or TLE changes
	useEffect(() => {
		if (!coordinates || !tle || tle.length !== 2) {
			setNextPass(null);
			return;
		}

		setIsPredicting(true);

		// Use setTimeout to debounce and avoid blocking UI
		const timeoutId = setTimeout(() => {
			try {
				const pass = predictNextPass(tle[0], tle[1], coordinates);
				setNextPass(pass);
			} catch (e) {
				console.error("Pass prediction failed:", e);
				setNextPass(null);
			} finally {
				setIsPredicting(false);
			}
		}, 500);

		return () => clearTimeout(timeoutId);
	}, [coordinates, tle]);

	return {
		nextPass,
		isPredicting,
		hasLocation: coordinates !== null,
	};
}
