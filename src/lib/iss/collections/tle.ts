/**
 * ISS TLE Collection
 *
 * TanStack DB collection for TLE (Two-Line Element) orbital data with Dexie adapter for IndexedDB persistence.
 * Provides reactive queries and automatic cross-tab synchronization.
 *
 * NOTE: Collection is only created in the browser (where IndexedDB is available).
 * On the server, the collection is null - hooks must guard against this.
 */

import { createCollection } from "@tanstack/react-db";
import { dexieCollectionOptions } from "tanstack-dexie-db-collection";
import { z } from "zod";

// =============================================================================
// SCHEMA DEFINITION
// =============================================================================

/**
 * Zod schema for TLE data validation and type inference
 */
export const StoredTLESchema = z.object({
	/** Unique identifier for TanStack DB (tle-timestamp) */
	id: z.string(),
	/** First TLE line */
	line1: z.string(),
	/** Second TLE line */
	line2: z.string(),
	/** Unix timestamp when TLE was fetched */
	fetchedAt: z.number().positive(),
	/** Source of TLE data */
	source: z.enum(["celestrak", "ariss", "fallback"]),
});

// =============================================================================
// COLLECTION DEFINITION
// =============================================================================

/**
 * TanStack DB collection for TLE data with Dexie persistence
 *
 * Features:
 * - Browser-only initialization (IndexedDB not available on server)
 * - IndexedDB persistence via Dexie adapter
 * - Automatic schema validation with Zod
 * - Reactive queries with useLiveQuery
 * - Cross-tab synchronization
 *
 * Database configuration:
 * - Database: "ephemeris-iss"
 * - Table: "tle"
 * - Primary key: id (tle-timestamp format)
 * - Index: fetchedAt (for cache freshness tracking)
 *
 * NOTE: This is null on the server. Hooks using this collection must check
 * for null or use `typeof window === "undefined"` guard before accessing.
 */
export const tleCollection =
	typeof window !== "undefined"
		? createCollection(
				dexieCollectionOptions({
					id: "tle",
					schema: StoredTLESchema,
					getKey: (item) => item.id,
					dbName: "ephemeris-iss",
					tableName: "tle",
				}),
			)
		: null;
