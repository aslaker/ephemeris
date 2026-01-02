/**
 * Briefing Collection
 *
 * Simple in-memory cache for AI-generated pass briefings.
 * This is a lightweight implementation that stores briefings in memory
 * with optional localStorage persistence for session continuity.
 */

import type { PassBriefing } from "./types";

// =============================================================================
// BRIEFING CACHE
// =============================================================================

const STORAGE_KEY = "ephemeris-briefings-cache";

// In-memory cache
const briefingsCache: Map<string, PassBriefing> = new Map();

// Load from localStorage on init
function loadFromStorage(): void {
	if (typeof window === "undefined") return;

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored) as Array<[string, PassBriefing]>;
			// Convert date strings back to Date objects
			for (const [key, briefing] of parsed) {
				if (briefing.viewingWindow?.optimalStart) {
					briefing.viewingWindow.optimalStart = new Date(
						briefing.viewingWindow.optimalStart,
					);
				}
				briefingsCache.set(key, briefing);
			}
		}
	} catch (e) {
		console.warn("Failed to load briefings from storage:", e);
	}
}

// Save to localStorage
function saveToStorage(): void {
	if (typeof window === "undefined") return;

	try {
		const entries = Array.from(briefingsCache.entries());
		localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
	} catch (e) {
		console.warn("Failed to save briefings to storage:", e);
	}
}

// Initialize cache
if (typeof window !== "undefined") {
	loadFromStorage();
}

// =============================================================================
// COLLECTION HELPERS
// =============================================================================

/**
 * Get a briefing by pass ID
 */
export function getBriefingByPassId(passId: string): PassBriefing | undefined {
	return briefingsCache.get(passId);
}

/**
 * Find a briefing by pass start time (within 1 hour tolerance)
 * Useful when pass IDs change due to recalculation
 * Now that IDs are hour-based, this should rarely be needed but kept as fallback
 */
export function findBriefingByTime(
	startTime: Date,
	toleranceHours: number = 1,
): PassBriefing | undefined {
	const targetTime = startTime.getTime();
	const toleranceMs = toleranceHours * 60 * 60 * 1000;

	for (const briefing of briefingsCache.values()) {
		const briefingTime = briefing.viewingWindow?.optimalStart?.getTime();
		if (briefingTime && Math.abs(briefingTime - targetTime) <= toleranceMs) {
			return briefing;
		}
	}

	return undefined;
}

/**
 * Insert or update a briefing in the collection
 */
export function upsertBriefing(briefing: PassBriefing): void {
	briefingsCache.set(briefing.passId, briefing);
	saveToStorage();
}

/**
 * Delete a briefing from the collection
 */
export function deleteBriefing(passId: string): void {
	briefingsCache.delete(passId);
	saveToStorage();
}

/**
 * Clear all briefings from the collection
 */
export function clearBriefings(): void {
	briefingsCache.clear();
	saveToStorage();
}

/**
 * Get all briefings
 */
export function getAllBriefings(): PassBriefing[] {
	return Array.from(briefingsCache.values());
}

