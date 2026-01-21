/**
 * Copilot Tools
 *
 * Tool wrappers for ISS APIs that the agent can call.
 * Feature: 008-tanstack-ai-migration
 */

import * as Sentry from "@sentry/tanstackstart-react";
import { tool } from "ai";
import { z } from "zod";
import { sanitizeData } from "../ai/sanitization";
import { getWeatherForPass } from "../briefing/weather";
import { fetchISSPosition, fetchTLE } from "../iss/api";
import { predictPasses } from "../iss/orbital";
import { searchKnowledgeBase } from "./knowledge";
import type {
	GetPassesParams,
	GetWeatherParams,
	ISSPositionResult,
	LocationResult,
	PassesResult,
	ToolName,
	WeatherResult,
} from "./types";
import { sanitizeForLogging } from "./utils";

// =============================================================================
// CACHING INFRASTRUCTURE
// =============================================================================

// ISS Position cache (60 second TTL - position updates frequently but 60s is acceptable for chat)
let issPositionCache: {
	data: ISSPositionResult | null;
	timestamp: number;
} = { data: null, timestamp: 0 };
const ISS_POSITION_CACHE_TTL_MS = 60 * 1000; // 60 seconds

// TLE cache (24 hour TTL - orbital elements rarely change)
let tleCache: {
	data: [string, string] | null;
	timestamp: number;
} = { data: null, timestamp: 0 };
const TLE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get cached ISS position or fetch fresh data
 */
async function getCachedISSPosition(): Promise<ISSPositionResult> {
	const now = Date.now();
	if (
		issPositionCache.data &&
		now - issPositionCache.timestamp < ISS_POSITION_CACHE_TTL_MS
	) {
		console.log("[Copilot Tools] ISS position cache HIT");
		return issPositionCache.data;
	}

	console.log("[Copilot Tools] ISS position cache MISS - fetching fresh data");
	const position = await fetchISSPosition();
	const result: ISSPositionResult = {
		latitude: position.latitude,
		longitude: position.longitude,
		altitude: position.altitude,
		velocity: position.velocity,
		visibility: position.visibility,
		timestamp: position.timestamp * 1000,
	};

	issPositionCache = { data: result, timestamp: now };
	return result;
}

/**
 * Get cached TLE data or fetch fresh data
 */
async function getCachedTLE(): Promise<[string, string]> {
	const now = Date.now();
	if (tleCache.data && now - tleCache.timestamp < TLE_CACHE_TTL_MS) {
		console.log("[Copilot Tools] TLE cache HIT");
		return tleCache.data;
	}

	console.log("[Copilot Tools] TLE cache MISS - fetching fresh data");
	const tle = await fetchTLE();
	tleCache = { data: tle, timestamp: now };
	return tle;
}

// =============================================================================
// TOOL DEFINITIONS (AI SDK format)
// =============================================================================

/**
 * Get current ISS position tool
 */
export const getISSPositionTool = tool({
	description:
		"Get the current position of the International Space Station including latitude, longitude, altitude, and velocity.",
	inputSchema: z.object({}),
	execute: async () => {
		return Sentry.startSpan({ name: "Tool: get_iss_position" }, async () => {
			return getCachedISSPosition();
		});
	},
});

/**
 * Get upcoming ISS passes tool
 */
export const getUpcomingPassesTool = tool({
	description:
		"Get upcoming visible ISS passes for a specific location. Returns pass times, durations, and visibility quality.",
	inputSchema: z.object({
		lat: z
			.number()
			.min(-90)
			.max(90)
			.describe("Observer latitude in degrees (-90 to 90)"),
		lng: z
			.number()
			.min(-180)
			.max(180)
			.describe("Observer longitude in degrees (-180 to 180)"),
		days: z
			.number()
			.min(1)
			.max(14)
			.optional()
			.default(7)
			.describe("Number of days to look ahead (default: 7, max: 14)"),
		maxPasses: z
			.number()
			.min(1)
			.max(20)
			.optional()
			.default(5)
			.describe("Maximum passes to return (default: 5, max: 20)"),
	}),
	execute: async (params) => {
		return Sentry.startSpan({ name: "Tool: get_upcoming_passes" }, async () => {
			const {
				lat,
				lng,
				days = 7,
				maxPasses = 5,
			} = sanitizeData(params, "ai_prompt");
			const tle = await getCachedTLE();
			const passes = predictPasses(
				tle[0],
				tle[1],
				{ lat, lng },
				{
					maxPasses,
					maxDays: days,
					minElevation: 10,
				},
			);

			return {
				passes: passes.map((pass) => ({
					id: pass.id,
					startTime: pass.startTime.toISOString(),
					endTime: pass.endTime.toISOString(),
					duration: Math.round(
						(pass.endTime.getTime() - pass.startTime.getTime()) / 1000 / 60,
					),
					maxElevation: pass.maxElevation,
					quality: pass.quality,
				})),
				location: { lat, lng },
			};
		});
	},
});

/**
 * Get weather for a specific pass time tool
 */
export const getPassWeatherTool = tool({
	description:
		"Get weather conditions for a specific ISS pass time. Returns cloud cover, visibility, and viewing recommendation.",
	inputSchema: z.object({
		lat: z.number().describe("Observer latitude in degrees"),
		lng: z.number().describe("Observer longitude in degrees"),
		passTime: z.string().describe("ISO 8601 datetime string for the pass"),
	}),
	execute: async (params) => {
		return Sentry.startSpan({ name: "Tool: get_pass_weather" }, async () => {
			const { lat, lng, passTime } = sanitizeData(params, "ai_prompt");
			const passDate = new Date(passTime);
			const weather = await getWeatherForPass({ lat, lng }, passDate);

			if (!weather) {
				return {
					cloudCover: 50,
					visibility: 10000,
					isFavorable: false,
					recommendation: "Weather data unavailable. Check local conditions.",
				};
			}

			return {
				cloudCover: weather.cloudCover,
				visibility: weather.visibility,
				isFavorable: weather.isFavorable,
				recommendation: weather.isFavorable
					? "Weather conditions look favorable for observation."
					: "Cloud cover may obstruct visibility. Check local forecast.",
			};
		});
	},
});

/**
 * Tool factory for user location (needs context)
 */
export const createGetUserLocationTool = (userLocation?: {
	lat: number;
	lng: number;
}) =>
	tool({
		description:
			"Get the user's saved location from their preferences. Returns coordinates and display name if available.",
		inputSchema: z.object({}),
		execute: async () => {
			if (!userLocation) {
				return {
					available: false,
					message:
						"No location saved. Please set your location to get personalized pass predictions.",
				};
			}

			return {
				available: true,
				coordinates: {
					lat: userLocation.lat,
					lng: userLocation.lng,
				},
			};
		},
	});

/**
 * Search ISS knowledge base tool
 */
export const searchKnowledgeBaseTool = tool({
	description:
		"Search the ISS knowledge base for facts about the space station, orbital mechanics, crew, and observation tips.",
	inputSchema: z.object({
		query: z.string().describe("Search query for ISS-related information"),
		maxResults: z
			.number()
			.optional()
			.default(3)
			.describe("Maximum results to return (default: 3)"),
	}),
	execute: async (params) => {
		const { query, maxResults = 3 } = params;
		const results = searchKnowledgeBase({
			query,
			maxResults,
		});
		return { results };
	},
});

// =============================================================================
// TOOL EXECUTORS (Legacy support if needed)
// =============================================================================

/**
 * Execute a tool by name with parameters
 */
export async function executeTool(
	name: ToolName,
	parameters: Record<string, unknown>,
): Promise<unknown> {
	const startTime = Date.now();

	try {
		let result: unknown;

		switch (name) {
			case "get_iss_position":
				result = await executeGetISSPosition();
				break;
			case "get_upcoming_passes":
				result = await executeGetUpcomingPasses(
					parameters as unknown as GetPassesParams,
				);
				break;
			case "get_pass_weather":
				result = await executeGetPassWeather(
					parameters as unknown as GetWeatherParams,
				);
				break;
			case "get_user_location":
				result = await executeGetUserLocation();
				break;
			case "search_knowledge_base":
				result = searchKnowledgeBase({
					query: (parameters as any).query || "",
					maxResults: (parameters as any).maxResults || 3,
				});
				break;
			default:
				throw new Error(`Unknown tool: ${name}`);
		}

		const executionTime = Date.now() - startTime;

		// Log tool execution to Sentry (sanitized)
		const sanitizedData = sanitizeForLogging({
			tool: name,
			executionTimeMs: executionTime,
			parameters: sanitizeForLogging(parameters),
		});
		Sentry.addBreadcrumb({
			message: `Tool executed: ${name}`,
			level: "info",
			data: sanitizedData as Record<string, unknown>,
		});

		return result;
	} catch (error) {
		const executionTime = Date.now() - startTime;
		const err = error instanceof Error ? error : new Error(String(error));

		// Log error to Sentry
		const sanitizedExtra = sanitizeForLogging({
			tool: name,
			parameters: sanitizeForLogging(parameters),
		});
		Sentry.captureException(err, {
			tags: {
				tool: name,
				execution_time_ms: executionTime,
			},
			extra: sanitizedExtra as Record<string, unknown>,
		});

		throw err;
	}
}

// =============================================================================
// TOOL IMPLEMENTATIONS
// =============================================================================

/**
 * Get current ISS position (uses cache for performance)
 */
async function executeGetISSPosition(): Promise<ISSPositionResult> {
	return Sentry.startSpan({ name: "Tool: get_iss_position" }, async () => {
		return getCachedISSPosition();
	});
}

/**
 * Get upcoming ISS passes for a location
 */
async function executeGetUpcomingPasses(
	params: GetPassesParams,
): Promise<PassesResult> {
	return Sentry.startSpan({ name: "Tool: get_upcoming_passes" }, async () => {
		const { lat, lng } = params;
		return {
			passes: [],
			location: {
				lat,
				lng,
			},
		};
	});
}

/**
 * Get weather for a specific pass time
 */
async function executeGetPassWeather(
	params: GetWeatherParams,
): Promise<WeatherResult> {
	return Sentry.startSpan({ name: "Tool: get_pass_weather" }, async () => {
		const { lat, lng, passTime } = params;
		const passDate = new Date(passTime);

		const weather = await getWeatherForPass({ lat, lng }, passDate);

		if (!weather) {
			return {
				cloudCover: 50,
				visibility: 10000,
				isFavorable: false,
				recommendation: "Weather data unavailable. Check local conditions.",
			};
		}

		return {
			cloudCover: weather.cloudCover,
			visibility: weather.visibility,
			isFavorable: weather.isFavorable,
			recommendation: weather.isFavorable
				? "Weather conditions look favorable for observation."
				: "Cloud cover may obstruct visibility. Check local forecast.",
		};
	});
}

/**
 * Get user's saved location
 */
function executeGetUserLocation(location?: {
	lat: number;
	lng: number;
}): LocationResult {
	if (!location) {
		return {
			available: false,
		};
	}

	return {
		available: true,
		coordinates: {
			lat: location.lat,
			lng: location.lng,
		},
	};
}

/**
 * Helper function to get passes when TLE is available
 */
export async function getPassesWithTLE(
	tle: [string, string],
	params: GetPassesParams,
): Promise<PassesResult> {
	const { lat, lng, days = 7, maxPasses = 5 } = params;

	const passes = predictPasses(
		tle[0],
		tle[1],
		{ lat, lng },
		{
			maxPasses,
			maxDays: days,
			minElevation: 10,
		},
	);

	return {
		passes: passes.map(
			(pass: {
				id: string;
				startTime: Date;
				endTime: Date;
				maxElevation: number;
				quality: "excellent" | "good" | "fair" | "poor";
			}) => ({
				id: pass.id,
				startTime: pass.startTime.toISOString(),
				endTime: pass.endTime.toISOString(),
				duration: Math.round(
					(pass.endTime.getTime() - pass.startTime.getTime()) / 1000 / 60,
				),
				maxElevation: pass.maxElevation,
				quality: pass.quality,
			}),
		),
		location: {
			lat,
			lng,
		},
	};
}
