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
import { ensureSentryInitialized } from "../briefing/sentry-init";
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
		try {
			const position = await fetchISSPosition();
			return JSON.stringify({
				latitude: position.latitude,
				longitude: position.longitude,
				altitude: position.altitude,
				velocity: position.velocity,
				visibility: position.visibility,
				timestamp: position.timestamp * 1000,
			});
		} catch (error) {
			Sentry.captureException(error, {
				tags: { tool: "get_iss_position" },
			});
			return JSON.stringify({
				error: true,
				message: "Unable to fetch ISS position. Please try again later.",
			});
		}
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
		try {
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
		} catch (error) {
			Sentry.captureException(error, {
				tags: { tool: "get_upcoming_passes" },
				extra: { lat: args.lat, lng: args.lng },
			});
			return JSON.stringify({
				error: true,
				message: "Unable to calculate pass predictions. Please try again later.",
			});
		}
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
		try {
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
		} catch (error) {
			Sentry.captureException(error, {
				tags: { tool: "get_pass_weather" },
				extra: { lat: args.lat, lng: args.lng, passTime: args.passTime },
			});
			return JSON.stringify({
				cloudCover: 50,
				visibility: 10000,
				isFavorable: false,
				recommendation: "Weather data unavailable due to an error. Check local conditions.",
			});
		}
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
		// Initialize Sentry for server-side error tracking
		ensureSentryInitialized();

		return Sentry.startSpan({ name: "Copilot Chat Completion" }, async () => {
			// Breadcrumb: Entry point for debugging production failures
			Sentry.addBreadcrumb({
				message: "Copilot chat request received",
				category: "copilot",
				level: "info",
				data: {
					messageLength: data.message.length,
					contextMessageCount: data.conversationContext.messages.length,
					hasLocation: !!data.location,
				},
			});

			try {
				// Get AI binding from Cloudflare environment (TanStack Start pattern)
				let ai: typeof env.AI;
				try {
					ai = env.AI;
				} catch (bindingError) {
					const err =
						bindingError instanceof Error
							? bindingError
							: new Error(String(bindingError));
					Sentry.captureException(err, {
						tags: { copilot: "binding_access_error", binding: "AI" },
						extra: { errorMessage: err.message },
					});
					Sentry.addBreadcrumb({
						message: "Failed to access AI binding from env",
						category: "copilot",
						level: "error",
						data: { errorMessage: err.message },
					});
					return {
						status: "error",
						error: {
							code: "BINDING_ACCESS_ERROR",
							message:
								"Unable to access AI service. The service may not be properly configured.",
						},
					};
				}

				if (!ai) {
					Sentry.addBreadcrumb({
						message: "AI binding not available",
						category: "copilot",
						level: "warning",
						data: {
							envKeys: Object.keys(env || {}),
						},
					});
					Sentry.captureMessage("AI binding is undefined in copilot agent", {
						level: "warning",
						tags: { copilot: "missing_binding", binding: "AI" },
						extra: { envKeys: Object.keys(env || {}) },
					});
					return {
						status: "error",
						error: {
							code: "AI_BINDING_MISSING",
							message:
								"AI service is not configured. Please ensure the AI binding is set up in wrangler.jsonc.",
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

				// Breadcrumb: Before AI call for tracing production failures
				Sentry.addBreadcrumb({
					message: "Calling runWithTools",
					category: "copilot",
					level: "info",
					data: {
						model: "@cf/meta/llama-3.1-8b-instruct",
						toolCount: tools.length,
						messageCount: messages.length,
					},
				});

				// Use embedded function calling - automatically executes tools
				// Wrapped in try-catch to handle AI generation failures specifically
				let aiResponse: unknown;
				try {
					aiResponse = await runWithTools(
						ai,
						"@cf/meta/llama-3.1-8b-instruct",
						{
							messages,
							tools,
							// @ts-expect-error - ai-utils types might not be perfect
							maxIterations: 5, // Max tool call loops
						},
					);
				} catch (aiError) {
					const err =
						aiError instanceof Error ? aiError : new Error(String(aiError));

					// Check for rate limiting
					if (err.message.includes("rate limit")) {
						Sentry.captureException(err, {
							tags: { copilot: "ai_rate_limited" },
							extra: { messageLength: data.message.length },
						});
						return {
							status: "error",
							error: {
								code: "AI_RATE_LIMITED",
								message:
									"The AI service is currently busy. Please wait a moment and try again.",
							},
						};
					}

					// Check for model errors
					if (
						err.message.includes("model") ||
						err.message.includes("inference")
					) {
						Sentry.captureException(err, {
							tags: { copilot: "ai_model_error" },
							extra: { errorMessage: err.message },
						});
						return {
							status: "error",
							error: {
								code: "AI_MODEL_ERROR",
								message:
									"The AI model encountered an issue. Please try again later.",
							},
						};
					}

					// Generic AI failure
					Sentry.captureException(err, {
						tags: { copilot: "ai_generation_failed" },
						extra: {
							errorMessage: err.message,
							messageLength: data.message.length,
						},
					});
					return {
						status: "error",
						error: {
							code: "AI_GENERATION_FAILED",
							message:
								"Failed to generate a response. Please try again.",
						},
					};
				}

				// Extract final response
				// runWithTools returns: { response: "text", usage: {...} }
				// Wrapped in try-catch to handle response parsing failures
				let content: string;
				try {
					content =
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
									null;

					if (!content) {
						throw new Error("Could not extract content from AI response");
					}
				} catch (parseError) {
					const err =
						parseError instanceof Error
							? parseError
							: new Error(String(parseError));

					Sentry.captureException(err, {
						tags: { copilot: "response_parse_error" },
						extra: {
							responseType: typeof aiResponse,
							hasResponse: aiResponse !== null && aiResponse !== undefined,
						},
					});

					// Return a graceful fallback message instead of failing
					content =
						"I apologize, but I couldn't generate a response. Please try again.";
				}

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

				// Breadcrumb: Error occurred for tracing production failures
				Sentry.addBreadcrumb({
					message: "Copilot chat error",
					category: "copilot",
					level: "error",
					data: {
						errorName: err.name,
						errorMessage: err.message,
						hasStack: !!err.stack,
					},
				});

				// Log error with sanitized data
				const sanitized = sanitizeForLogging({
					message: data.message,
					hasContext: data.conversationContext.messages.length > 0,
				});
				Sentry.captureException(err, {
					tags: {
						copilot: "chat_completion_unhandled",
					},
					extra: sanitized as Record<string, unknown>,
				});

				// Determine specific error code based on error message
				let errorCode = "UNKNOWN_ERROR";
				let errorMessage = "An error occurred while processing your request.";

				if (err.message.includes("binding") || err.message.includes("env")) {
					errorCode = "BINDING_ERROR";
					errorMessage =
						"A configuration error occurred. Please contact support.";
				} else if (
					err.message.includes("network") ||
					err.message.includes("fetch")
				) {
					errorCode = "NETWORK_ERROR";
					errorMessage =
						"Unable to connect to required services. Please try again.";
				} else if (err.message.includes("timeout")) {
					errorCode = "TIMEOUT_ERROR";
					errorMessage = "The request took too long. Please try again.";
				}

				return {
					status: "error",
					error: {
						code: errorCode,
						message: errorMessage,
					},
				};
			}
		});
	});
