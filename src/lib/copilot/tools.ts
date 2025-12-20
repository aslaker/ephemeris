/**
 * Copilot Tools
 *
 * Tool wrappers for ISS APIs that the agent can call.
 * Feature: 007-observation-copilot
 */

import * as Sentry from "@sentry/tanstackstart-react";
import { getWeatherForPass } from "../briefing/weather";
import { fetchISSPosition } from "../iss/api";
import { predictPasses } from "../iss/orbital";
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
// TOOL EXECUTORS
// =============================================================================

/**
 * Execute a tool by name with parameters
 * Returns result in format expected by agent
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
				// Will be implemented in Phase 5
				result = { results: [] };
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
 * Get current ISS position
 */
async function executeGetISSPosition(): Promise<ISSPositionResult> {
	return Sentry.startSpan({ name: "Tool: get_iss_position" }, async () => {
		const position = await fetchISSPosition();

		return {
			latitude: position.latitude,
			longitude: position.longitude,
			altitude: position.altitude,
			velocity: position.velocity,
			visibility: position.visibility,
			timestamp: position.timestamp * 1000, // Convert to milliseconds
		};
	});
}

/**
 * Get upcoming ISS passes for a location
 */
async function executeGetUpcomingPasses(
	params: GetPassesParams,
): Promise<PassesResult> {
	return Sentry.startSpan({ name: "Tool: get_upcoming_passes" }, async () => {
		// Note: This function needs TLE data which should be fetched in the agent
		// For now, return empty array - will be fixed when tool calling is fully implemented
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
				cloudCover: 50, // Default if unavailable
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
 * Note: This should be called client-side, location is passed from client
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

// =============================================================================
// HELPER: Get passes with TLE
// =============================================================================

/**
 * Helper function to get passes when TLE is available
 * This will be used by the agent server function
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
