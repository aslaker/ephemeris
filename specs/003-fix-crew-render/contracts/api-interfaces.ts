/**
 * API Interface Contracts: Fix Crew Data Rendering Regression
 *
 * Feature: 003-fix-crew-render
 * Created: 2024-12-15
 *
 * These interfaces define the contract between the Open Notify API
 * and the application's data layer.
 */

// =============================================================================
// EXTERNAL API CONTRACTS (Open Notify)
// =============================================================================

/**
 * Raw response from Open Notify astros.json endpoint
 * @see http://api.open-notify.org/astros.json
 */
export interface OpenNotifyAstrosResponse {
	/** Status of the API call */
	message: "success" | "error";
	/** Total number of people in space */
	number: number;
	/** Array of people currently in space */
	people: OpenNotifyPerson[];
}

/**
 * Individual person from Open Notify API
 */
export interface OpenNotifyPerson {
	/** Name of the astronaut/cosmonaut */
	name: string;
	/** Spacecraft they are aboard (e.g., "ISS", "Tiangong") */
	craft: string;
}

// =============================================================================
// SERVER FUNCTION CONTRACTS
// =============================================================================

/**
 * Server function for fetching crew data
 * This bypasses CORS by making the request server-side
 */
export interface FetchCrewServerFn {
	/**
	 * Fetch ISS crew data from Open Notify API
	 * @returns Promise<Astronaut[]> - Array of enriched astronaut data
	 * @throws Error if API request fails (triggers TanStack Query error state)
	 */
	(): Promise<Astronaut[]>;
}

// =============================================================================
// INTERNAL APPLICATION CONTRACTS
// =============================================================================

/**
 * Enriched astronaut profile with mission data
 * This is the internal representation used by the UI
 */
export interface Astronaut {
	/** Unique identifier for TanStack DB (slugified name) */
	id: string;
	/** Full name of astronaut */
	name: string;
	/** Spacecraft currently aboard ("ISS") */
	craft: string;
	/** Wikipedia portrait URL */
	image?: string;
	/** Mission role */
	role?: string;
	/** Space agency affiliation */
	agency?: string;
	/** Launch date ISO string (YYYY-MM-DD) */
	launchDate?: string;
	/** Expected return date ISO string */
	endDate?: string;
}

/**
 * Mission profile from local database for crew enrichment
 */
export interface MissionProfile {
	start?: string;
	end?: string;
	role: string;
	agency?: string;
	image?: string;
	aliasFor?: string;
}

// =============================================================================
// QUERY CONTRACTS
// =============================================================================

/**
 * TanStack Query options factory contract
 */
export interface ISSQueriesContract {
	/**
	 * Query options for crew manifest
	 * - Query key: ["iss", "crew"]
	 * - Stale time: 1 hour
	 * - Returns: Astronaut[]
	 * - Throws on error (no silent failures)
	 */
	crew: () => {
		queryKey: readonly ["iss", "crew"];
		queryFn: () => Promise<Astronaut[]>;
		staleTime: number;
	};
}

// =============================================================================
// ERROR CONTRACTS
// =============================================================================

/**
 * Expected error conditions that should trigger UI error state
 */
export type CrewFetchError =
	| { code: "NETWORK_ERROR"; message: string }
	| { code: "API_ERROR"; message: string; status?: number }
	| { code: "INVALID_RESPONSE"; message: string };

/**
 * Type guard for crew fetch errors
 */
export function isCrewFetchError(error: unknown): error is CrewFetchError {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		"message" in error
	);
}
