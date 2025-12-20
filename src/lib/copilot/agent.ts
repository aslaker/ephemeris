/**
 * Copilot Agent
 *
 * Server function for chat completion with embedded function calling.
 * Uses @cloudflare/ai-utils for automatic tool execution.
 * Feature: 007-observation-copilot
 */

import { env } from "cloudflare:workers";
import { runWithTools } from "@cloudflare/ai-utils";
import * as Sentry from "@sentry/tanstackstart-react";
import { createServerFn } from "@tanstack/react-start";
import { getWeatherForPass } from "../briefing/weather";
import { fetchISSPosition, fetchTLE } from "../iss/api";
import { predictPasses } from "../iss/orbital";
import { searchKnowledgeBase } from "./knowledge";
import { COPILOT_SYSTEM_PROMPT } from "./prompts";
import { ChatRequestSchema } from "./types";
import { sanitizeForLogging } from "./utils";

// =============================================================================
// TOOL FUNCTIONS
// =============================================================================

/**
 * Get current ISS position
 */
async function getISSPosition(): Promise<string> {
	return Sentry.startSpan({ name: "Tool: get_iss_position" }, async () => {
		const position = await fetchISSPosition();
		return JSON.stringify({
			latitude: position.latitude,
			longitude: position.longitude,
			altitude: position.altitude,
			velocity: position.velocity,
			visibility: position.visibility,
			timestamp: position.timestamp * 1000,
		});
	});
}

/**
 * Get upcoming ISS passes for a location
 */
async function getUpcomingPasses(args: {
	lat: number;
	lng: number;
	days?: number;
	maxPasses?: number;
}): Promise<string> {
	return Sentry.startSpan({ name: "Tool: get_upcoming_passes" }, async () => {
		const { lat, lng, days = 7, maxPasses = 5 } = args;
		const tle = await fetchTLE();
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

		return JSON.stringify({
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
		});
	});
}

/**
 * Get weather for a specific pass time
 */
async function getPassWeather(args: {
	lat: number;
	lng: number;
	passTime: string;
}): Promise<string> {
	return Sentry.startSpan({ name: "Tool: get_pass_weather" }, async () => {
		const { lat, lng, passTime } = args;
		const passDate = new Date(passTime);
		const weather = await getWeatherForPass({ lat, lng }, passDate);

		if (!weather) {
			return JSON.stringify({
				cloudCover: 50,
				visibility: 10000,
				isFavorable: false,
				recommendation: "Weather data unavailable. Check local conditions.",
			});
		}

		return JSON.stringify({
			cloudCover: weather.cloudCover,
			visibility: weather.visibility,
			isFavorable: weather.isFavorable,
			recommendation: weather.isFavorable
				? "Weather conditions look favorable for observation."
				: "Cloud cover may obstruct visibility. Check local forecast.",
		});
	});
}

/**
 * Get user's saved location
 */
function getUserLocation(userLocation?: {
	lat: number;
	lng: number;
}): Promise<string> {
	if (!userLocation) {
		return Promise.resolve(
			JSON.stringify({
				available: false,
				message:
					"No location saved. Please set your location to get personalized pass predictions.",
			}),
		);
	}

	return Promise.resolve(
		JSON.stringify({
			available: true,
			coordinates: {
				lat: userLocation.lat,
				lng: userLocation.lng,
			},
		}),
	);
}

/**
 * Search ISS knowledge base
 */
function searchKnowledge(args: {
	query: string;
	maxResults?: number;
}): Promise<string> {
	const results = searchKnowledgeBase({
		query: args.query,
		maxResults: args.maxResults ?? 3,
	});
	return Promise.resolve(JSON.stringify({ results }));
}

// =============================================================================
// SERVER FUNCTION
// =============================================================================

/**
 * Chat completion server function with embedded tool calling
 * Uses @cloudflare/ai-utils for automatic tool execution
 */
export const chatCompletion = createServerFn({ method: "POST" })
	.inputValidator(ChatRequestSchema)
	.handler(async ({ data }) => {
		return Sentry.startSpan({ name: "Copilot Chat Completion" }, async () => {
			try {
				// Get AI binding from Cloudflare environment (TanStack Start pattern)
				const ai = env.AI;

				if (!ai) {
					return {
						status: "error",
						error: {
							code: "AI_UNAVAILABLE",
							message:
								"AI service is currently unavailable. Please try again later.",
						},
					};
				}

				// Build messages array with system prompt and context
				const messages: Array<{ role: string; content: string }> = [
					{ role: "system", content: COPILOT_SYSTEM_PROMPT },
					...data.conversationContext.messages,
					{ role: "user", content: data.message },
				];

				// Define tools with embedded execution functions
				const tools = [
					{
						name: "get_iss_position",
						description:
							"Get the current position of the International Space Station including latitude, longitude, altitude, and velocity.",
						parameters: {
							type: "object",
							properties: {},
						},
						function: getISSPosition,
					},
					{
						name: "get_upcoming_passes",
						description:
							"Get upcoming visible ISS passes for a specific location. Returns pass times, durations, and visibility quality.",
						parameters: {
							type: "object",
							properties: {
								lat: {
									type: "number",
									description: "Observer latitude in degrees (-90 to 90)",
								},
								lng: {
									type: "number",
									description: "Observer longitude in degrees (-180 to 180)",
								},
								days: {
									type: "number",
									description:
										"Number of days to look ahead (default: 7, max: 14)",
								},
								maxPasses: {
									type: "number",
									description: "Maximum passes to return (default: 5, max: 20)",
								},
							},
							required: ["lat", "lng"],
						},
						function: getUpcomingPasses,
					},
					{
						name: "get_pass_weather",
						description:
							"Get weather conditions for a specific ISS pass time. Returns cloud cover, visibility, and viewing recommendation.",
						parameters: {
							type: "object",
							properties: {
								lat: {
									type: "number",
									description: "Observer latitude in degrees",
								},
								lng: {
									type: "number",
									description: "Observer longitude in degrees",
								},
								passTime: {
									type: "string",
									description: "ISO 8601 datetime string for the pass",
								},
							},
							required: ["lat", "lng", "passTime"],
						},
						function: getPassWeather,
					},
					{
						name: "get_user_location",
						description:
							"Get the user's saved location from their preferences. Returns coordinates and display name if available.",
						parameters: {
							type: "object",
							properties: {},
						},
						function: () => getUserLocation(data.location),
					},
					{
						name: "search_knowledge_base",
						description:
							"Search the ISS knowledge base for facts about the space station, orbital mechanics, crew, and observation tips.",
						parameters: {
							type: "object",
							properties: {
								query: {
									type: "string",
									description: "Search query for ISS-related information",
								},
								maxResults: {
									type: "number",
									description: "Maximum results to return (default: 3)",
								},
							},
							required: ["query"],
						},
						function: searchKnowledge,
					},
				];

				// Use embedded function calling - automatically executes tools
				const aiResponse = await runWithTools(
					ai,
					"@cf/meta/llama-3.1-8b-instruct",
					{
						messages,
						tools,
						// @ts-expect-error - ai-utils types might not be perfect
						maxIterations: 5, // Max tool call loops
					},
				);

				// Extract final response
				// runWithTools returns: { response: "text", usage: {...} }
				const content =
					typeof aiResponse === "string"
						? aiResponse
						: // biome-ignore lint/suspicious/noExplicitAny: checking response type dynamically
							typeof (aiResponse as any)?.response === "string"
							? // biome-ignore lint/suspicious/noExplicitAny: extracting validated string response
								(aiResponse as any).response
							: // biome-ignore lint/suspicious/noExplicitAny: fallback extraction attempts
								(aiResponse as any)?.response?.message?.content ||
								// biome-ignore lint/suspicious/noExplicitAny: alternative response format
								(aiResponse as any)?.content ||
								// biome-ignore lint/suspicious/noExplicitAny: final fallback format
								(aiResponse as any)?.message ||
								"I apologize, but I couldn't generate a response. Please try again.";

				// Log successful completion
				Sentry.addBreadcrumb({
					message: "Chat completion successful",
					level: "info",
					data: {
						hasContext: data.conversationContext.messages.length > 0,
						hasLocation: !!data.location,
						responseLength: content.length,
					},
				});

				return {
					status: "success",
					message: {
						id: crypto.randomUUID(),
						role: "assistant",
						content,
						timestamp: Date.now(),
					},
				};
			} catch (error) {
				const err = error instanceof Error ? error : new Error(String(error));

				// Log error with sanitized data
				const sanitized = sanitizeForLogging({
					message: data.message,
					hasContext: data.conversationContext.messages.length > 0,
				});
				Sentry.captureException(err, {
					tags: {
						copilot: "chat_completion",
					},
					extra: sanitized as Record<string, unknown>,
				});

				return {
					status: "error",
					error: {
						code: "UNKNOWN_ERROR",
						message: "An error occurred while processing your request.",
					},
				};
			}
		});
	});
