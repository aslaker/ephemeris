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
	// Collections
	positionsCollection,
	crewCollection,
	tleCollection,
	briefingsCollection,
	// Schemas
	ISSPositionSchema,
	StoredAstronautSchema,
	StoredTLESchema,
	// Types
	type ISSPosition,
	type StoredAstronaut,
	type StoredTLE,
} from "../lib/iss/collections";
