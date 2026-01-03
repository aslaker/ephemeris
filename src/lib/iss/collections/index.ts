/**
 * ISS Collections Index
 *
 * Central export for all TanStack DB collections with Dexie persistence.
 * Provides a unified interface for ISS data storage and reactive queries.
 *
 * Database: ephemeris-iss (IndexedDB)
 * Collections:
 * - positions: Real-time ISS position data
 * - crew: Current astronaut crew roster
 * - tle: Orbital element data from CelesTrak
 * - briefings: AI-generated pass briefings
 */

// =============================================================================
// COLLECTION EXPORTS
// =============================================================================

/**
 * Briefings Collection
 * AI-generated pass briefings stored in IndexedDB
 *
 * Note: This collection is in src/lib/briefing/collections.ts
 * Re-exported here for convenience
 */
export { briefingsCollection } from "../../briefing/collections";

/**
 * ISS Crew Collection
 * Astronaut roster data with 1-hour refresh interval
 */
export { crewCollection, StoredAstronautSchema } from "./crew";
/**
 * ISS Position Collection
 * Real-time position data with 5-second refresh interval
 */
export { ISSPositionSchema, positionsCollection } from "./positions";
/**
 * TLE Collection
 * Two-Line Element orbital data with 1-hour refresh interval
 */
export { StoredTLESchema, tleCollection } from "./tle";

// =============================================================================
// TYPE UTILITIES
// =============================================================================

/**
 * Infer TypeScript types from Zod schemas
 *
 * Usage:
 *   import type { ISSPosition, StoredAstronaut, StoredTLE } from '@/lib/iss/collections'
 */
import type { z } from "zod";
import type { StoredAstronautSchema } from "./crew";
import type { ISSPositionSchema } from "./positions";
import type { StoredTLESchema } from "./tle";

export type ISSPosition = z.infer<typeof ISSPositionSchema>;
export type StoredAstronaut = z.infer<typeof StoredAstronautSchema>;
export type StoredTLE = z.infer<typeof StoredTLESchema>;
