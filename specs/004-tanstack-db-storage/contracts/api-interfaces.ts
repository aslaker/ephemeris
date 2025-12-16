/**
 * API Interfaces: Local-First Data Storage
 *
 * Contract definitions for the TanStack DB storage layer.
 * These interfaces define the public API for storage operations.
 */

import type { z } from "zod";

// =============================================================================
// SCHEMA TYPES (Reference - actual schemas in src/lib/iss/schemas.ts)
// =============================================================================

/**
 * ISS Position record stored in IndexedDB
 */
export interface ISSPosition {
  /** Unique identifier (timestamp string) */
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
  /** Current lighting condition or source indicator */
  visibility: string;
}

/**
 * Astronaut record stored in IndexedDB
 */
export interface Astronaut {
  /** Unique identifier (slugified name) */
  id: string;
  /** Full name of astronaut */
  name: string;
  /** Spacecraft currently aboard */
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
  /** Timestamp when record was fetched */
  fetchedAt: number;
}

/**
 * TLE record stored in IndexedDB
 */
export interface TLERecord {
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
 * Storage metadata singleton
 */
export interface StorageMetadata {
  /** Singleton key */
  id: "storage-meta";
  /** Whether first-visit initialization is complete */
  initialized: boolean;
  /** Timestamp of last successful data fetch */
  lastFetchAt?: number;
  /** Timestamp of last retention cleanup */
  lastCleanupAt?: number;
  /** Schema version for migrations */
  schemaVersion: number;
  /** Total position records count (approximate) */
  positionCount?: number;
}

// =============================================================================
// COLLECTION INTERFACES
// =============================================================================

/**
 * Collection getter functions - lazy initialization for Cloudflare Workers
 */
export interface ISSCollections {
  /**
   * Get the ISS position collection
   * @returns Promise resolving to the position collection
   */
  getPositionCollection(): Promise<ISSPositionCollection>;

  /**
   * Get the crew collection
   * @returns Promise resolving to the crew collection
   */
  getCrewCollection(): Promise<AstronautCollection>;

  /**
   * Get the TLE collection
   * @returns Promise resolving to the TLE collection
   */
  getTleCollection(): Promise<TLECollection>;

  /**
   * Get the storage metadata collection
   * @returns Promise resolving to the metadata collection
   */
  getMetaCollection(): Promise<MetadataCollection>;
}

/**
 * Generic collection interface matching TanStack DB Collection
 */
export interface Collection<T> {
  insert(item: T): Promise<void>;
  update(key: string, partial: Partial<T>): Promise<void>;
  delete(key: string): Promise<void>;
  get(key: string): Promise<T | undefined>;
  query(): CollectionQuery<T>;
}

/**
 * Collection query builder interface
 */
export interface CollectionQuery<T> {
  where(field: keyof T, op: "<" | "<=" | "=" | ">=" | ">", value: unknown): CollectionQuery<T>;
  orderBy(field: keyof T, direction: "asc" | "desc"): CollectionQuery<T>;
  limit(count: number): CollectionQuery<T>;
  execute(): Promise<T[]>;
}

// Type aliases for specific collections
export type ISSPositionCollection = Collection<ISSPosition>;
export type AstronautCollection = Collection<Astronaut>;
export type TLECollection = Collection<TLERecord>;
export type MetadataCollection = Collection<StorageMetadata>;

// =============================================================================
// STORAGE SERVICE INTERFACE
// =============================================================================

/**
 * Configuration for retention policy
 */
export interface RetentionConfig {
  /** Maximum age in days for position records */
  maxAgeDays: number;
  /** Maximum number of position records */
  maxRecords: number;
  /** Batch size for cleanup operations */
  cleanupBatchSize: number;
  /** Interval between cleanup runs in milliseconds */
  cleanupIntervalMs: number;
}

/**
 * Result of a cleanup operation
 */
export interface CleanupResult {
  /** Number of records deleted */
  deleted: number;
  /** Duration of cleanup in milliseconds */
  durationMs: number;
  /** Type of records cleaned */
  type: "position" | "tle" | "crew";
}

/**
 * Main storage service interface
 */
export interface ISSStorageService {
  // Initialization
  /**
   * Check if storage has been initialized
   * @returns Promise resolving to initialization status
   */
  isInitialized(): Promise<boolean>;

  /**
   * Mark storage as initialized
   * @returns Promise resolving when complete
   */
  markInitialized(): Promise<void>;

  /**
   * Run any pending migrations
   * @returns Promise resolving when migrations complete
   */
  runMigrations(): Promise<void>;

  // Position operations
  /**
   * Get the latest stored position
   * @returns Promise resolving to latest position or null
   */
  getLatestPosition(): Promise<ISSPosition | null>;

  /**
   * Get positions within a time range
   * @param startTimestamp - Start of range (Unix seconds)
   * @param endTimestamp - End of range (Unix seconds)
   * @returns Promise resolving to array of positions
   */
  getPositionsInRange(startTimestamp: number, endTimestamp: number): Promise<ISSPosition[]>;

  /**
   * Store a new position record
   * @param position - Position to store
   * @returns Promise resolving when stored
   */
  storePosition(position: ISSPosition): Promise<void>;

  /**
   * Store multiple position records (batch)
   * @param positions - Array of positions to store
   * @returns Promise resolving when all stored
   */
  storePositions(positions: ISSPosition[]): Promise<void>;

  // Crew operations
  /**
   * Get all stored crew members
   * @returns Promise resolving to array of astronauts
   */
  getCrew(): Promise<Astronaut[]>;

  /**
   * Store crew data (replaces existing)
   * @param crew - Array of astronauts to store
   * @returns Promise resolving when stored
   */
  storeCrew(crew: Astronaut[]): Promise<void>;

  // TLE operations
  /**
   * Get the latest TLE record
   * @returns Promise resolving to latest TLE or null
   */
  getLatestTle(): Promise<TLERecord | null>;

  /**
   * Store a new TLE record
   * @param tle - TLE record to store
   * @returns Promise resolving when stored
   */
  storeTle(tle: TLERecord): Promise<void>;

  // Cleanup operations
  /**
   * Run retention cleanup for all data types
   * @returns Promise resolving to cleanup results
   */
  runCleanup(): Promise<CleanupResult[]>;

  /**
   * Clear all stored data (for testing/reset)
   * @returns Promise resolving when cleared
   */
  clearAll(): Promise<void>;
}

// =============================================================================
// GAP FILLING INTERFACE
// =============================================================================

/**
 * Gap detection result
 */
export interface GapInfo {
  /** Start of gap (Unix seconds) */
  startTimestamp: number;
  /** End of gap (Unix seconds) */
  endTimestamp: number;
  /** Gap duration in hours */
  durationHours: number;
  /** Whether orbital calculations should be used */
  useOrbitalCalculation: boolean;
}

/**
 * Gap filling service interface
 */
export interface GapFillingService {
  /**
   * Detect gaps in position history
   * @param positions - Array of stored positions
   * @param expectedIntervalSeconds - Expected interval between positions (default: 5)
   * @returns Array of detected gaps
   */
  detectGaps(positions: ISSPosition[], expectedIntervalSeconds?: number): GapInfo[];

  /**
   * Fill a gap using orbital calculations
   * @param gap - Gap information
   * @param tle - TLE data for calculations
   * @returns Array of synthetic position records
   */
  fillGapWithOrbital(gap: GapInfo, tle: TLERecord): ISSPosition[];

  /**
   * Check if gap should use orbital vs interpolation
   * @param durationHours - Gap duration in hours
   * @returns True if orbital calculations should be used
   */
  shouldUseOrbitalCalculation(durationHours: number): boolean;
}

/**
 * Gap filling configuration
 */
export interface GapFillingConfig {
  /** Threshold in hours for switching to orbital calculations */
  orbitalThresholdHours: number;
  /** Step size in seconds for synthetic positions */
  syntheticStepSeconds: number;
  /** Maximum gap size to fill (hours) */
  maxGapHours: number;
}

// =============================================================================
// HOOKS INTERFACE
// =============================================================================

/**
 * Return type for useISSData hook
 */
export interface UseISSDataResult {
  /** Current position data */
  position: ISSPosition | null;
  /** Current crew data */
  crew: Astronaut[];
  /** Current TLE data */
  tle: TLERecord | null;
  /** Whether initial data is loading */
  isLoading: boolean;
  /** Any error that occurred */
  error: Error | null;
  /** Whether data came from cache */
  fromCache: boolean;
  /** Force a refresh of all data */
  refresh: () => Promise<void>;
}

/**
 * Return type for useInitialize hook
 */
export interface UseInitializeResult {
  /** Whether initialization is complete */
  isInitialized: boolean;
  /** Whether initialization is in progress */
  isInitializing: boolean;
  /** Progress of pre-fetching (0-100) */
  progress: number;
  /** Any error during initialization */
  error: Error | null;
  /** Start the initialization process */
  initialize: () => Promise<void>;
}

/**
 * Return type for usePositionHistory hook
 */
export interface UsePositionHistoryResult {
  /** Array of position records in range */
  positions: ISSPosition[];
  /** Whether history is loading */
  isLoading: boolean;
  /** Any error that occurred */
  error: Error | null;
  /** Fetch positions for a specific time range */
  fetchRange: (startMs: number, endMs: number) => Promise<void>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default retention configuration
 */
export const DEFAULT_RETENTION_CONFIG: RetentionConfig = {
  maxAgeDays: 30,
  maxRecords: 600_000,
  cleanupBatchSize: 10_000,
  cleanupIntervalMs: 60_000,
};

/**
 * Default gap filling configuration
 */
export const DEFAULT_GAP_FILLING_CONFIG: GapFillingConfig = {
  orbitalThresholdHours: 24,
  syntheticStepSeconds: 300, // 5 minutes
  maxGapHours: 168, // 1 week
};

/**
 * IndexedDB database name
 */
export const DB_NAME = "ephemeris-iss";

/**
 * Current schema version
 */
export const SCHEMA_VERSION = 1;

/**
 * Collection/table names
 */
export const COLLECTION_NAMES = {
  positions: "iss-positions",
  crew: "iss-crew",
  tle: "iss-tle",
  meta: "iss-meta",
} as const;
