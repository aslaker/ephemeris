/**
 * ISS Crew Collection
 *
 * TanStack DB collection for astronaut crew data with Dexie adapter for IndexedDB persistence.
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
 * Zod schema for astronaut crew data validation and type inference
 */
export const StoredAstronautSchema = z.object({
	/** Unique identifier for TanStack DB (slugified name) */
	id: z.string(),
	/** Full name of astronaut */
	name: z.string(),
	/** Spacecraft currently aboard ("ISS") */
	craft: z.string(),
	/** Wikipedia portrait URL */
	image: z.string().optional(),
	/** Mission role */
	role: z.string().optional(),
	/** Space agency affiliation */
	agency: z.string().optional(),
	/** Launch date ISO string (YYYY-MM-DD) */
	launchDate: z.string().optional(),
	/** Expected return date ISO string */
	endDate: z.string().optional(),
	/** Timestamp when record was fetched from API */
	fetchedAt: z.number().positive(),
});

// =============================================================================
// COLLECTION DEFINITION
// =============================================================================

/**
 * TanStack DB collection for ISS crew with Dexie persistence
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
 * - Table: "crew"
 * - Primary key: id (slugified astronaut name)
 * - Index: fetchedAt (for cache freshness tracking)
 *
 * NOTE: This is null on the server. Hooks using this collection must check
 * for null or use `typeof window === "undefined"` guard before accessing.
 */
export const crewCollection =
	typeof window !== "undefined"
		? createCollection(
				dexieCollectionOptions({
					id: "crew",
					schema: StoredAstronautSchema,
					getKey: (item) => item.id,
					dbName: "ephemeris-iss",
					tableName: "crew",
				}),
			)
		: null;
