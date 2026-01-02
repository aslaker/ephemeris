/**
 * Location Store
 *
 * TanStack Store for app-wide location state with localStorage persistence.
 * This eliminates the need for LocationContext by providing shared state
 * that can be accessed anywhere via useStore hook.
 */

import { Store } from "@tanstack/store";

// =============================================================================
// TYPES
// =============================================================================

export interface LocationState {
	coordinates: { lat: number; lng: number } | null;
	displayName: string | null;
	source: "geolocation" | "manual" | "search" | null;
	lastUpdated: number | null;
}

// =============================================================================
// STORAGE
// =============================================================================

const STORAGE_KEY = "ephemeris-user-location";

function loadFromStorage(): LocationState {
	if (typeof window === "undefined") {
		return {
			coordinates: null,
			displayName: null,
			source: null,
			lastUpdated: null,
		};
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored
			? JSON.parse(stored)
			: {
					coordinates: null,
					displayName: null,
					source: null,
					lastUpdated: null,
				};
	} catch {
		return {
			coordinates: null,
			displayName: null,
			source: null,
			lastUpdated: null,
		};
	}
}

// =============================================================================
// STORE INSTANCE
// =============================================================================

export const locationStore = new Store<LocationState>(loadFromStorage());

// Auto-sync to localStorage on state changes
if (typeof window !== "undefined") {
	locationStore.subscribe(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(locationStore.state));
	});
}

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Location store actions - pure functions that update the store state.
 * No UI state (like loading/error) is managed here - that's handled in hooks.
 */
export const locationActions = {
	/**
	 * Set location from browser geolocation API
	 */
	setFromGeolocation(lat: number, lng: number) {
		locationStore.setState((prev) => ({
			...prev,
			coordinates: { lat, lng },
			displayName: null, // Clear any previous display name
			source: "geolocation",
			lastUpdated: Date.now(),
		}));
	},

	/**
	 * Set location from manual input (coordinates entry)
	 */
	setManual(lat: number, lng: number, displayName?: string) {
		locationStore.setState((prev) => ({
			...prev,
			coordinates: { lat, lng },
			displayName: displayName ?? null,
			source: "manual",
			lastUpdated: Date.now(),
		}));
	},

	/**
	 * Set location from address search
	 */
	setFromSearch(lat: number, lng: number, displayName: string) {
		locationStore.setState((prev) => ({
			...prev,
			coordinates: { lat, lng },
			displayName,
			source: "search",
			lastUpdated: Date.now(),
		}));
	},

	/**
	 * Clear all location data
	 */
	clear() {
		locationStore.setState({
			coordinates: null,
			displayName: null,
			source: null,
			lastUpdated: null,
		});
	},
};

