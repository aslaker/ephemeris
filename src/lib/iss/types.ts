/**
 * ISS Tracker Type Definitions
 *
 * Core type definitions for the ISS Tracker feature.
 * All entities include `id` fields for TanStack DB compatibility.
 */

// =============================================================================
// CORE DOMAIN TYPES
// =============================================================================

/**
 * Normalized ISS position data used throughout the application
 */
export interface ISSPosition {
	/** Unique identifier for TanStack DB (timestamp-based) */
	id: string;
	/** Latitude in degrees (-90 to 90) */
	latitude: number;
	/** Longitude in degrees (-180 to 180) */
	longitude: number;
	/** Unix timestamp in seconds */
	timestamp: number;
	/** Altitude above Earth's surface in kilometers */
	altitude: number;
	/** Orbital velocity in kilometers per hour */
	velocity: number;
	/** Current lighting condition */
	visibility: string;
}

/**
 * Two-Line Element set for orbital calculations
 */
export type TLEData = [line1: string, line2: string];

/**
 * Geographic coordinate pair
 */
export interface LatLng {
	lat: number;
	lng: number;
}

/**
 * 3D point on orbital path
 */
export interface OrbitalPoint {
	lat: number;
	lng: number;
	alt: number;
}

// =============================================================================
// CREW DATA TYPES
// =============================================================================

/**
 * Enriched astronaut profile with mission data
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
 * Aggregated crew data response
 */
export interface CrewData {
	message: "success" | "error";
	number: number;
	people: Astronaut[];
}

/**
 * Local mission database profile for crew enrichment
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
// PREDICTION & CALCULATION TYPES
// =============================================================================

/**
 * Predicted ISS flyover for observer location
 */
export interface PassPrediction {
	/** Unique identifier for TanStack DB (generated from startTime) */
	id: string;
	/** When the ISS rises above 10° elevation */
	startTime: Date;
	/** When the ISS drops below 10° elevation */
	endTime: Date;
	/** Maximum elevation angle in degrees */
	maxElevation: number;
	/** Duration of visible pass in minutes */
	duration: number;
	/** Array of points along the flyover arc */
	path: OrbitalPoint[];
}

/**
 * Keplerian orbital elements derived from TLE
 */
export interface OrbitalParameters {
	/** Orbital tilt relative to equator (degrees) */
	inclination: number;
	/** Orbital shape deviation from circle (0 = circular) */
	eccentricity: number;
	/** Orbits per day */
	meanMotion: number;
	/** Minutes per orbit */
	period: number;
	/** Highest point above Earth (km) */
	apogee: number;
	/** Lowest point above Earth (km) */
	perigee: number;
}

// =============================================================================
// CONTEXT & STATE TYPES
// =============================================================================

/**
 * Location context state for flyover predictions
 */
export interface LocationContextState {
	userLocation: LatLng | null;
	nextPass: PassPrediction | null;
	isPredicting: boolean;
	error: string | null;
}

/**
 * Location context actions
 */
export interface LocationContextActions {
	requestLocation: () => Promise<void>;
	manualLocation: (lat: number, lng: number) => void;
}

/**
 * Combined location context type
 */
export type LocationContextType = LocationContextState & LocationContextActions;

// =============================================================================
// UI COMPONENT PROPS
// =============================================================================

export interface StatsPanelProps {
	data?: ISSPosition;
	isLoading: boolean;
}

export interface MatrixTextProps {
	text: string;
	speed?: number;
	className?: string;
	preserveSpace?: boolean;
}

export interface OrbitalSolverProps {
	tle?: TLEData;
	onClose: () => void;
}

export interface CrewCardProps {
	astronaut: Astronaut;
	className?: string;
}

export interface ScanlineOverlayProps {
	visible?: boolean;
	className?: string;
}

// =============================================================================
// GLOBE VISUALIZATION TYPES
// =============================================================================

export interface GlobePoint {
	lat: number;
	lng: number;
	alt: number;
	radius: number;
	color: string;
	label: string;
}

export interface GlobeRing {
	lat: number;
	lng: number;
	alt: number;
	maxR: number;
	propagationSpeed: number;
	repeatPeriod: number;
	color: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Helper to generate unique IDs for entities
 */
export const generateEntityId = {
	position: (timestamp: number): string => timestamp.toString(),

	astronaut: (name: string): string =>
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/(^-|-$)/g, ""),

	tle: (fetchTimestamp: number): string => `tle-${fetchTimestamp}`,

	pass: (startTime: Date): string => `pass-${startTime.getTime()}`,
};

/**
 * Format coordinate for display
 */
export const formatCoordinate = (val: number, type: "lat" | "lon"): string => {
	if (typeof val !== "number" || Number.isNaN(val) || !Number.isFinite(val)) {
		return "0.0000°";
	}
	const dir = type === "lat" ? (val > 0 ? "N" : "S") : val > 0 ? "E" : "W";
	return `${Math.abs(val).toFixed(4)}° ${dir}`;
};
