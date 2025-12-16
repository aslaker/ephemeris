/**
 * Dexie Database Setup for ISS Data Persistence
 *
 * Provides IndexedDB storage for ISS position, crew, and TLE data
 * with typed tables and helper functions for cache-first loading.
 */

import Dexie, { type EntityTable } from "dexie";
import type { Astronaut, ISSPosition } from "./types";

// =============================================================================
// EXTENDED TYPES FOR STORED DATA
// =============================================================================

/**
 * Astronaut with fetch timestamp for cache freshness tracking
 */
export interface StoredAstronaut extends Astronaut {
	/** Timestamp when record was fetched from API */
	fetchedAt: number;
}

/**
 * TLE record with fetch metadata
 */
export interface StoredTLE {
	/** Unique identifier (tle-timestamp) */
	id: string;
	/** First TLE line */
	line1: string;
	/** Second TLE line */
	line2: string;
	/** Unix timestamp when TLE was fetched */
	fetchedAt: number;
	/** Source of TLE data */
	source: "celestrak" | "ariss" | "fallback";
}

/**
 * Timeline event for future event association (schema foundation only)
 */
export interface TimelineEvent {
	/** Unique identifier */
	id: string;
	/** Event type */
	type: "launch" | "docking" | "eva" | "crew_change" | "custom";
	/** Unix timestamp of event */
	timestamp: number;
	/** Event title */
	title: string;
	/** Optional description */
	description?: string;
	/** Links to ISSPosition.id at closest timestamp */
	associatedPositionId?: string;
	/** When this event was created/imported */
	createdAt: number;
}

// =============================================================================
// DATABASE SETUP
// =============================================================================

/**
 * Dexie database with typed tables for ISS data
 */
class EphemerisDatabase extends Dexie {
	positions!: EntityTable<ISSPosition, "id">;
	crew!: EntityTable<StoredAstronaut, "id">;
	tle!: EntityTable<StoredTLE, "id">;
	events!: EntityTable<TimelineEvent, "id">;

	constructor() {
		super("ephemeris-iss");

		// Schema version 1: Initial tables with indexes
		this.version(1).stores({
			positions: "id, timestamp", // Primary key: id, Index: timestamp for range queries
			crew: "id, fetchedAt", // Primary key: id, Index: fetchedAt
			tle: "id, fetchedAt", // Primary key: id, Index: fetchedAt
			events: "id, timestamp, type", // Primary key: id, Indexes: timestamp, type
		});
	}
}

// Singleton database instance (lazy initialization for Cloudflare Workers compatibility)
let _db: EphemerisDatabase | null = null;

/**
 * Get the database instance (lazy initialization)
 * Safe to call in Cloudflare Workers - only initializes on client
 */
export function getDb(): EphemerisDatabase {
	if (typeof window === "undefined") {
		throw new Error("Database can only be accessed in browser environment");
	}

	if (!_db) {
		_db = new EphemerisDatabase();
	}

	return _db;
}

// Export db as a getter that lazily initializes
export const db = {
	get positions() {
		return getDb().positions;
	},
	get crew() {
		return getDb().crew;
	},
	get tle() {
		return getDb().tle;
	},
	get events() {
		return getDb().events;
	},
};

// =============================================================================
// STORAGE HELPER FUNCTIONS
// =============================================================================

/**
 * Get the latest cached position
 * @returns Promise resolving to latest position or undefined if cache is empty
 */
export async function getCachedPosition(): Promise<ISSPosition | undefined> {
	if (typeof window === "undefined") return undefined;
	return getDb().positions.orderBy("timestamp").last();
}

/**
 * Get all cached crew members
 * @returns Promise resolving to array of astronauts (empty if cache is empty)
 */
export async function getCachedCrew(): Promise<StoredAstronaut[]> {
	if (typeof window === "undefined") return [];
	return getDb().crew.toArray();
}

/**
 * Get the latest cached TLE record
 * @returns Promise resolving to latest TLE or undefined if cache is empty
 */
export async function getCachedTLE(): Promise<StoredTLE | undefined> {
	if (typeof window === "undefined") return undefined;
	return getDb().tle.orderBy("fetchedAt").last();
}

/**
 * Get positions within a time range (for history/scrubbing)
 * @param startTimestamp - Start of range (Unix seconds)
 * @param endTimestamp - End of range (Unix seconds)
 * @returns Promise resolving to array of positions in range
 */
export async function getPositionsInRange(
	startTimestamp: number,
	endTimestamp: number,
): Promise<ISSPosition[]> {
	if (typeof window === "undefined") return [];
	return getDb()
		.positions.where("timestamp")
		.between(startTimestamp, endTimestamp)
		.toArray();
}

/**
 * Store a position record (upsert by id)
 * @param position - Position to store
 */
export async function storePosition(position: ISSPosition): Promise<void> {
	if (typeof window === "undefined") return;
	await getDb().positions.put(position);
}

/**
 * Store crew data with fetch timestamp
 * @param crew - Array of astronauts to store
 */
export async function storeCrew(crew: Astronaut[]): Promise<void> {
	if (typeof window === "undefined") return;
	const fetchedAt = Date.now();
	const storedCrew = crew.map((astronaut) => ({ ...astronaut, fetchedAt }));
	await getDb().crew.bulkPut(storedCrew);
}

/**
 * Store TLE record
 * @param line1 - First TLE line
 * @param line2 - Second TLE line
 * @param source - Source of TLE data
 */
export async function storeTLE(
	line1: string,
	line2: string,
	source: StoredTLE["source"] = "celestrak",
): Promise<void> {
	if (typeof window === "undefined") return;
	const fetchedAt = Date.now();
	await getDb().tle.put({
		id: `tle-${fetchedAt}`,
		line1,
		line2,
		fetchedAt,
		source,
	});
}

// =============================================================================
// SCHEMA VERSION TRACKING
// =============================================================================

/**
 * Current schema version for migration tracking
 */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Get the current database version
 */
export function getDatabaseVersion(): number {
	if (typeof window === "undefined") return 0;
	return getDb().verno;
}
