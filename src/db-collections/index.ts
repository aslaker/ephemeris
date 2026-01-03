/**
 * Database Collections Index
 *
 * Central re-export for all TanStack DB collections.
 * This provides a unified entry point for application-wide data storage.
 *
 * Collections are organized by feature:
 * - ISS collections: src/lib/iss/collections/
 * - Briefing collections: src/lib/briefing/collections.ts
 */

// =============================================================================
// ISS COLLECTIONS
// =============================================================================

export {
	briefingsCollection,
	crewCollection,
	// Types
	type ISSPosition,
	// Schemas
	ISSPositionSchema,
	// Collections
	positionsCollection,
	type StoredAstronaut,
	StoredAstronautSchema,
	type StoredTLE,
	StoredTLESchema,
	tleCollection,
} from "../lib/iss/collections";
