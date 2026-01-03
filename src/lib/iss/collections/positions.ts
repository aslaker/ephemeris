/**
 * ISS Position Collection
 *
 * TanStack DB collection for ISS position data with Dexie adapter for IndexedDB persistence.
 * Provides reactive queries and automatic cross-tab synchronization.
 */

import { createCollection } from "@tanstack/react-db";
import { dexieCollectionOptions } from "tanstack-dexie-db-collection";
import { z } from "zod";

// =============================================================================
// SCHEMA DEFINITION
// =============================================================================

/**
 * Zod schema for ISS position validation and type inference
 */
export const ISSPositionSchema = z.object({
	/** Unique identifier for TanStack DB (timestamp-based) */
	id: z.string(),
	/** Latitude in degrees (-90 to 90) */
	latitude: z.number().min(-90).max(90),
	/** Longitude in degrees (-180 to 180) */
	longitude: z.number().min(-180).max(180),
	/** Unix timestamp in seconds */
	timestamp: z.number().positive(),
	/** Altitude above Earth's surface in kilometers */
	altitude: z.number().positive(),
	/** Orbital velocity in kilometers per hour */
	velocity: z.number().positive(),
	/** Current lighting condition */
	visibility: z.string(),
});

// =============================================================================
// COLLECTION DEFINITION
// =============================================================================

/**
 * TanStack DB collection for ISS positions with Dexie persistence
 *
 * Features:
 * - Lazy initialization for Cloudflare Workers compatibility
 * - IndexedDB persistence via Dexie adapter
 * - Automatic schema validation with Zod
 * - Reactive queries with useLiveQuery
 * - Cross-tab synchronization
 *
 * Database configuration:
 * - Database: "ephemeris-iss"
 * - Table: "positions"
 * - Primary key: id (timestamp-based)
 * - Index: timestamp (for range queries)
 */
export const positionsCollection = createCollection(
	dexieCollectionOptions({
		id: "positions",
		schema: ISSPositionSchema,
		getKey: (item) => item.id,
		dbName: "ephemeris-iss",
		tableName: "positions",
	}),
);
