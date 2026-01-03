/**
 * AI Pass Briefings Collection
 *
 * TanStack DB collection for AI-generated pass briefings with Dexie adapter for IndexedDB persistence.
 * Replaces the localStorage-based briefing cache with persistent, reactive storage.
 * Provides reactive queries and automatic cross-tab synchronization.
 */

import { createCollection } from "@tanstack/react-db";
import { dexieCollectionOptions } from "tanstack-dexie-db-collection";
import { PassBriefingSchema } from "./types";

// =============================================================================
// COLLECTION DEFINITION
// =============================================================================

/**
 * TanStack DB collection for pass briefings with Dexie persistence
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
 * - Table: "briefings"
 * - Primary key: passId (pass identifier)
 * - Index: generatedAt (for cache freshness tracking)
 */
export const briefingsCollection = createCollection(
	dexieCollectionOptions({
		id: "briefings",
		schema: PassBriefingSchema,
		getKey: (item) => item.passId,
		dbName: "ephemeris-iss",
		tableName: "briefings",
	}),
);
