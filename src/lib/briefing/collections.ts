/**
 * AI Pass Briefings Collection
 *
 * TanStack DB collection for AI-generated pass briefings with Dexie adapter for IndexedDB persistence.
 * Replaces the localStorage-based briefing cache with persistent, reactive storage.
 * Provides reactive queries and automatic cross-tab synchronization.
 *
 * NOTE: Collection is only created in the browser (where IndexedDB is available).
 * On the server, the collection is null - hooks must guard against this.
 */

import { createCollection } from "@tanstack/react-db";
import { dexieCollectionOptions } from "tanstack-dexie-db-collection";
import { PassBriefingSchema } from "./types";

// =============================================================================
// COLLECTION DEFINITION
// =============================================================================

/**
 * TanStack DB collection for AI pass briefings with Dexie persistence
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
 * - Table: "briefings"
 * - Primary key: passId (pass identifier)
 * - Index: generatedAt (for cache freshness tracking)
 *
 * NOTE: This is null on the server. Hooks using this collection must check
 * for null or use `typeof window === "undefined"` guard before accessing.
 */
export const briefingsCollection =
	typeof window !== "undefined"
		? createCollection(
				dexieCollectionOptions({
					id: "briefings",
					schema: PassBriefingSchema,
					getKey: (item) => item.passId,
					dbName: "ephemeris-iss",
					tableName: "briefings",
				}),
			)
		: null;
