/**
 * ISS Tracker API Layer
 * All external API calls with Sentry instrumentation and fallback chains.
 */

import * as Sentry from "@sentry/tanstackstart-react";
import { createServerFn } from "@tanstack/react-start";
import { findMissionProfile } from "./mission-db";
import type { Astronaut, ISSPosition, TLEData } from "./types";
import { generateEntityId } from "./types";

// API Response Types
interface WTIAResponse {
	latitude: number;
	longitude: number;
	timestamp: number;
	altitude: number;
	velocity: number;
	visibility: string;
}

interface LegacyPositionResponse {
	iss_position: {
		latitude: string;
		longitude: string;
	};
	timestamp: number;
}

// API Endpoints
const WTIA_API = "https://api.wheretheiss.at/v1/satellites/25544";
const POSITION_API_LEGACY = "http://api.open-notify.org/iss-now.json";
const CREW_API = "http://api.open-notify.org/astros.json";
const PROXY_URL = "https://api.allorigins.win/raw?url=";

// TLE Sources
const TLE_API_PRIMARY =
	"https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE";
const TLE_API_BACKUP = "https://live.ariss.org/iss.txt";

// Hardcoded fallback TLE (updated periodically)
const FALLBACK_TLE: TLEData = [
	"1 25544U 98067A   24140.59865741  .00016717  00000+0  30076-3 0  9995",
	"2 25544  51.6396 235.1195 0005470 216.5982 256.4024 15.49818898442371",
];

/**
 * Fetch current ISS position
 * Fallback chain: WTIA → Open Notify (via proxy)
 */
export const fetchISSPosition = async (): Promise<ISSPosition> => {
	return Sentry.startSpan({ name: "Fetching ISS Position" }, async () => {
		try {
			const response = await fetch(WTIA_API);
			if (!response.ok) throw new Error(`WTIA API Error: ${response.status}`);
			const data = (await response.json()) as WTIAResponse;

			return {
				id: generateEntityId.position(data.timestamp),
				latitude: data.latitude,
				longitude: data.longitude,
				timestamp: data.timestamp,
				altitude: data.altitude,
				velocity: data.velocity,
				visibility: data.visibility,
			};
		} catch (_primaryError) {
			const url = `${PROXY_URL}${encodeURIComponent(POSITION_API_LEGACY)}`;
			const response = await fetch(url);
			if (!response.ok) throw new Error("Legacy Proxy Error");
			const data = (await response.json()) as LegacyPositionResponse;
			if (!data.iss_position) throw new Error("Invalid legacy structure");

			return {
				id: generateEntityId.position(data.timestamp),
				latitude: Number.parseFloat(data.iss_position.latitude),
				longitude: Number.parseFloat(data.iss_position.longitude),
				timestamp: data.timestamp,
				altitude: 417.5, // Average altitude
				velocity: 27600, // Average velocity km/h
				visibility: "orbiting",
			};
		}
	});
};

/**
 * Fetch TLE orbital data
 * Fallback chain: CelesTrak → ARISS → Hardcoded
 */
export const fetchTLE = async (): Promise<TLEData> => {
	return Sentry.startSpan({ name: "Fetching TLE Data" }, async () => {
		try {
			return await fetchTLEFromUrl(TLE_API_PRIMARY);
		} catch {
			try {
				return await fetchTLEFromUrl(TLE_API_BACKUP);
			} catch {
				// Return hardcoded fallback
				return FALLBACK_TLE;
			}
		}
	});
};

const fetchTLEFromUrl = async (url: string): Promise<TLEData> => {
	try {
		const response = await fetch(url);
		if (response.ok) {
			const text = await response.text();
			return parseTLELines(text);
		}
	} catch {
		/* try proxy */
	}

	// Try via proxy
	const proxyUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
	const response = await fetch(proxyUrl);
	if (!response.ok) throw new Error(`TLE fetch failed from ${url}`);
	const text = await response.text();
	return parseTLELines(text);
};

const parseTLELines = (text: string): TLEData => {
	const lines = text.trim().split("\n");
	const line1 = lines.find((l) => l.startsWith("1 25544U"));
	const line2 = lines.find((l) => l.startsWith("2 25544"));
	if (line1 && line2) return [line1.trim(), line2.trim()];
	throw new Error("Invalid TLE format");
};

/**
 * Open Notify API response type
 */
interface OpenNotifyAstrosResponse {
	message: "success" | "error";
	number: number;
	people: Array<{ name: string; craft: string }>;
}

/**
 * Validate Open Notify API response structure
 */
const validateOpenNotifyResponse = (
	data: unknown,
): data is OpenNotifyAstrosResponse => {
	if (typeof data !== "object" || data === null) return false;
	const obj = data as Record<string, unknown>;
	return (
		obj.message === "success" &&
		Array.isArray(obj.people) &&
		obj.people.every(
			(p: unknown) =>
				typeof p === "object" &&
				p !== null &&
				typeof (p as Record<string, unknown>).name === "string" &&
				typeof (p as Record<string, unknown>).craft === "string",
		)
	);
};

/**
 * Server function to fetch crew data from Open Notify API
 * Bypasses CORS by making the request server-side
 */
const fetchCrewFromApi = createServerFn({ method: "GET" }).handler(
	async (): Promise<OpenNotifyAstrosResponse> => {
		const response = await fetch(CREW_API);
		if (!response.ok) {
			throw new Error(`Open Notify API Error: ${response.status}`);
		}
		const data = await response.json();
		if (!validateOpenNotifyResponse(data)) {
			throw new Error("Invalid API response structure");
		}
		return data;
	},
);

/**
 * Fetch ISS crew data with enrichment from mission database
 * Errors propagate to TanStack Query for proper error state handling
 */
export const fetchCrewData = async (): Promise<Astronaut[]> => {
	return Sentry.startSpan({ name: "Fetching Crew Data" }, async () => {
		const basicData = await fetchCrewFromApi();

		const issCrew = basicData.people.filter((p) => p.craft === "ISS");

		const enrichedCrew: Astronaut[] = issCrew.map((basicAstronaut) => {
			const dbData = findMissionProfile(basicAstronaut.name);

			return {
				id: generateEntityId.astronaut(basicAstronaut.name),
				name: basicAstronaut.name,
				craft: basicAstronaut.craft,
				image: dbData?.image,
				role: dbData?.role || "Astronaut",
				agency: dbData?.agency || "Unknown",
				launchDate: dbData?.start,
				endDate: dbData?.end,
			};
		});

		return enrichedCrew;
	});
};
