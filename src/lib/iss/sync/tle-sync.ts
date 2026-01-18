/**
 * ISS TLE Sync Handler
 *
 * Fetches TLE (Two-Line Element) orbital data from CelesTrak and inserts into TanStack DB collection.
 * Provides background sync with configurable intervals for reactive updates.
 */

import { tleCollection } from "@/lib/iss/collections/tle";
import { generateEntityId } from "@/lib/iss/types";
import type { SyncResult } from "./types";
import { createSyncError, createSyncSuccess } from "./types";

// =============================================================================
// SYNC CONFIGURATION
// =============================================================================

/**
 * Default TLE sync interval in milliseconds
 * TLE data changes infrequently, so we refresh every hour
 */
export const DEFAULT_TLE_SYNC_INTERVAL = 3600000; // 1 hour

// =============================================================================
// TLE SOURCES
// =============================================================================

const TLE_API_PRIMARY =
	"https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE";
const TLE_API_BACKUP = "https://live.ariss.org/iss.txt";
const PROXY_URL = "https://api.allorigins.win/raw?url=";

// Hardcoded fallback TLE (updated periodically)
// Last updated: 2026-01-03 (day 003 of 2026)
// Note: TLE data becomes inaccurate after ~7-14 days. Update this fallback regularly.
const FALLBACK_TLE = {
	line1:
		"1 25544U 98067A   26003.21020602  .00015578  00000+0  28954-3 0  9990",
	line2:
		"2 25544  51.6329  36.1624 0007549 334.7101  25.3517 15.49059586546183",
};

// =============================================================================
// SYNC RESULT TYPE
// =============================================================================

/**
 * TLE sync result payload
 */
interface TLESyncData {
	source: "celestrak" | "ariss" | "fallback";
	tleId: string;
}

type TLESyncResult = SyncResult<TLESyncData>;

// =============================================================================
// TLE FETCHING WITH SOURCE TRACKING
// =============================================================================

/**
 * Parse TLE lines from text response
 */
const parseTLELines = (
	text: string,
): { line1: string; line2: string } | null => {
	const lines = text.trim().split("\n");
	const line1 = lines.find((l) => l.startsWith("1 25544U"));
	const line2 = lines.find((l) => l.startsWith("2 25544"));
	if (line1 && line2) {
		return {
			line1: line1.trim(),
			line2: line2.trim(),
		};
	}
	return null;
};

/**
 * Fetch TLE from a specific URL
 */
const fetchTLEFromUrl = async (
	url: string,
): Promise<{ line1: string; line2: string }> => {
	try {
		const response = await fetch(url);
		if (response.ok) {
			const text = await response.text();
			const parsed = parseTLELines(text);
			if (parsed) return parsed;
		}
	} catch {
		/* try proxy */
	}

	// Try via proxy
	const proxyUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
	const response = await fetch(proxyUrl);
	if (!response.ok) throw new Error(`TLE fetch failed from ${url}`);
	const text = await response.text();
	const parsed = parseTLELines(text);
	if (!parsed) throw new Error("Invalid TLE format");
	return parsed;
};

/**
 * Extract TLE epoch date and calculate age in days
 */
const getTLEAge = (line1: string): number => {
	// TLE epoch is in format YYDDD.DDDDDDDD (year + day of year)
	// Example: "24140.59865741" = day 140 of 2024
	const epochStr = line1.substring(18, 32).trim();
	const year = Number.parseInt(epochStr.substring(0, 2), 10);
	const dayOfYear = Number.parseFloat(epochStr.substring(2));

	// Convert to full year (20YY for 00-99)
	const fullYear = year < 57 ? 2000 + year : 1900 + year;

	// Calculate epoch date using explicit UTC date calculation
	// This is more clear than using setDate() which can be confusing
	const epochDate = new Date(Date.UTC(fullYear, 0, dayOfYear));

	// Calculate age in days
	const ageMs = Date.now() - epochDate.getTime();
	return ageMs / (1000 * 60 * 60 * 24);
};

/**
 * Fetch TLE with source tracking
 * Fallback chain: CelesTrak → ARISS → Hardcoded
 */
const fetchTLEWithSource = async (): Promise<{
	line1: string;
	line2: string;
	source: "celestrak" | "ariss" | "fallback";
}> => {
	// Try CelesTrak (primary)
	try {
		const tle = await fetchTLEFromUrl(TLE_API_PRIMARY);
		return { ...tle, source: "celestrak" };
	} catch {
		/* continue to backup */
	}

	// Try ARISS (backup)
	try {
		const tle = await fetchTLEFromUrl(TLE_API_BACKUP);
		return { ...tle, source: "ariss" };
	} catch {
		/* use fallback */
	}

	// Use hardcoded fallback
	console.warn("[TLE] Using hardcoded fallback TLE - API sources unavailable");

	// Check TLE age and warn if stale
	const ageInDays = getTLEAge(FALLBACK_TLE.line1);
	if (ageInDays > 7) {
		console.warn(
			`[TLE] WARNING: Fallback TLE is ${Math.floor(ageInDays)} days old! Orbital predictions will be increasingly inaccurate. TLE should be updated.`,
		);
	}

	return { ...FALLBACK_TLE, source: "fallback" };
};

// =============================================================================
// SYNC HANDLER
// =============================================================================

/**
 * Sync current ISS TLE from API to collection
 *
 * Fetches the latest TLE data and inserts it into the TLE collection.
 * Adds fetchedAt timestamp and source tracking for data freshness.
 * This triggers reactive updates for all useLiveQuery hooks watching the collection.
 *
 * @returns Promise resolving to sync result with success status
 */
export async function syncTLE(): Promise<TLESyncResult> {
	try {
		if (!tleCollection) {
			return createSyncError(new Error("TLE collection not available"));
		}

		const { line1, line2, source } = await fetchTLEWithSource();
		const fetchedAt = Date.now();

		// Create TLE record for storage
		const storedTLE = {
			id: generateEntityId.tle(fetchedAt),
			line1,
			line2,
			fetchedAt,
			source,
		};

		// Insert into collection (triggers useLiveQuery updates)
		await tleCollection.insert(storedTLE);

		return createSyncSuccess({
			source,
			tleId: storedTLE.id,
		});
	} catch (error) {
		return createSyncError(
			error instanceof Error ? error : new Error(String(error)),
		);
	}
}

// =============================================================================
// SYNC LIFECYCLE
// =============================================================================

/**
 * Start background TLE sync with interval
 *
 * Performs initial sync immediately, then continues on interval.
 * Returns cleanup function to stop the sync.
 *
 * @param intervalMs - Sync interval in milliseconds (default: 3600000 = 1 hour)
 * @returns Cleanup function to stop sync
 *
 * @example
 * ```typescript
 * // Start syncing every hour
 * const stopSync = startTLESync()
 *
 * // Later, stop the sync
 * stopSync()
 * ```
 */
export function startTLESync(
	intervalMs: number = DEFAULT_TLE_SYNC_INTERVAL,
): () => void {
	// Initial sync with error logging
	syncTLE().catch((err) => console.warn("[TLESync] Initial sync failed:", err));

	// Background sync
	const intervalId = setInterval(() => {
		syncTLE();
	}, intervalMs);

	// Return cleanup function
	return () => clearInterval(intervalId);
}
