/**
 * useLocation Hook
 *
 * Provides access to the shared location store along with
 * transient UI state (loading, error) and geolocation request functionality.
 */

import { useStore } from "@tanstack/react-store";
import { useCallback, useState } from "react";
import { locationActions, locationStore } from "@/lib/location/store";

// =============================================================================
// ERROR MAPPING
// =============================================================================

/**
 * Map GeolocationPositionError codes to human-readable error strings
 */
function mapGeolocationError(err: unknown): string {
	if (err && typeof err === "object" && "code" in err) {
		const geoError = err as GeolocationPositionError;
		if (geoError.code === 1) return "PERMISSION_DENIED";
		if (geoError.code === 2) return "POSITION_UNAVAILABLE";
		if (geoError.code === 3) return "TIMEOUT";
	}
	return "SIGNAL_INTERFERENCE";
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * useLocation - Access location store with geolocation capabilities
 *
 * @returns Object containing:
 * - coordinates: Current location or null
 * - displayName: Human-readable location name or null
 * - source: How the location was obtained
 * - hasLocation: Boolean indicating if location is set
 * - error: Error message or null
 * - isRequesting: Whether geolocation request is in progress
 * - requestGeolocation: Function to request browser geolocation
 * - setManual: Function to set location manually
 * - setFromSearch: Function to set location from search
 * - clear: Function to clear location
 */
export function useLocation() {
	// Subscribe to store values with granular selectors
	const coordinates = useStore(locationStore, (s) => s.coordinates);
	const displayName = useStore(locationStore, (s) => s.displayName);
	const source = useStore(locationStore, (s) => s.source);

	// Transient UI state - NOT in store (local to each component instance)
	const [error, setError] = useState<string | null>(null);
	const [isRequesting, setIsRequesting] = useState(false);

	/**
	 * Request location from browser geolocation API
	 */
	const requestGeolocation = useCallback(async () => {
		if (typeof navigator === "undefined" || !navigator.geolocation) {
			setError("GEOLOCATION_MODULE_MISSING");
			return;
		}

		setError(null);
		setIsRequesting(true);

		try {
			const position = await new Promise<GeolocationPosition>(
				(resolve, reject) => {
					navigator.geolocation.getCurrentPosition(resolve, reject, {
						enableHighAccuracy: false,
						timeout: 10000,
					});
				},
			);

			locationActions.setFromGeolocation(
				position.coords.latitude,
				position.coords.longitude,
			);
		} catch (err) {
			setError(mapGeolocationError(err));
		} finally {
			setIsRequesting(false);
		}
	}, []);

	/**
	 * Clear any current error state
	 */
	const clearError = useCallback(() => {
		setError(null);
	}, []);

	return {
		// Store state (shared)
		coordinates,
		displayName,
		source,
		hasLocation: coordinates !== null,

		// Transient UI state (local)
		error,
		isRequesting,

		// Actions
		requestGeolocation,
		setManual: locationActions.setManual,
		setFromSearch: locationActions.setFromSearch,
		clear: locationActions.clear,
		clearError,
	};
}

