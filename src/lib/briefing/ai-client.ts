/**
 * AI Briefing Client
 *
 * Server function for generating AI pass briefings using Cloudflare Workers AI.
 * Includes Sentry instrumentation per project rules.
 */

import { env } from "cloudflare:workers";
import * as Sentry from "@sentry/tanstackstart-react";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildBriefingPrompt, parseAIResponse, SYSTEM_PROMPT } from "./prompt";
import { ensureSentryInitialized } from "./sentry-init";
import type {
	GenerateBriefingResponse,
	LatLng,
	PassBriefing,
	PassPrediction,
	WeatherConditions,
} from "./types";
import {
	derivePassQuality,
	estimateBrightness,
	getBrightnessDescription,
	LatLngSchema,
	PassPredictionSchema,
} from "./types";
import { getWeatherForPass } from "./weather";

// =============================================================================
// FALLBACK BRIEFING
// =============================================================================

/**
 * Create a fallback briefing when AI is unavailable
 */
function createFallbackBriefing(
	passData: PassPrediction,
	_location: LatLng,
	weather: WeatherConditions | null,
): PassBriefing {
	const quality = derivePassQuality(passData.maxElevation);
	const magnitude = estimateBrightness(passData.maxElevation);
	const brightnessDesc = getBrightnessDescription(magnitude);

	const startTime = passData.startTime.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
	const date = passData.startTime.toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
	});

	// Determine visibility based on weather
	const isVisible = !weather || weather.cloudCover < 80;

	// Generate weather-aware summary
	let summary: string;
	if (weather && weather.cloudCover >= 95) {
		summary = `ISS pass on ${date} at ${startTime} - Not visible due to heavy cloud cover (${weather.cloudCover}%)`;
	} else if (weather && weather.cloudCover >= 80) {
		summary = `${quality.charAt(0).toUpperCase() + quality.slice(1)} ISS pass on ${date} at ${startTime} - Likely not visible (${weather.cloudCover}% clouds)`;
	} else {
		summary = `${quality.charAt(0).toUpperCase() + quality.slice(1)} ISS pass on ${date} at ${startTime}`;
	}
	const visibilityPhrase = isVisible
		? "will be visible"
		: weather.cloudCover >= 95
			? "will NOT be visible"
			: "may not be visible";

	let narrative = `The International Space Station ${visibilityPhrase} on ${date} starting at ${startTime}. `;

	if (isVisible) {
		narrative += `The pass will last approximately ${Math.round(passData.duration)} minutes with a maximum elevation of ${Math.round(passData.maxElevation)} degrees. `;
		narrative += `The ISS will appear ${brightnessDesc.toLowerCase()}, making it easy to spot in the night sky. `;
		narrative += `Look for a bright, steady light moving smoothly across the sky from west to east.`;
	} else {
		narrative += `Unfortunately, heavy cloud cover (${weather.cloudCover}%) will prevent viewing the ISS during this pass. `;
		narrative += `The pass would have lasted approximately ${Math.round(passData.duration)} minutes with a maximum elevation of ${Math.round(passData.maxElevation)} degrees, `;
		narrative += `but the ISS will be obscured by clouds.`;
	}

	if (weather) {
		if (weather.isFavorable && weather.cloudCover < 50) {
			narrative += ` Weather conditions look favorable with ${weather.cloudCover}% cloud cover.`;
		} else if (weather.cloudCover >= 80) {
			narrative += ` Heavy cloud cover (${weather.cloudCover}%) means the ISS will not be visible during this pass.`;
		} else {
			narrative += ` Note: Weather conditions may affect visibility with ${weather.cloudCover}% cloud cover.`;
		}
	}

	return {
		id: passData.id,
		passId: passData.id,
		summary,
		narrative,
		viewingWindow: {
			optimalStart: passData.startTime,
			description: `Start watching at ${startTime}`,
		},
		elevation: {
			max: passData.maxElevation,
			direction: "West to East",
		},
		brightness: {
			magnitude,
			description: brightnessDesc,
		},
		conditions: weather
			? {
					cloudCover: weather.cloudCover,
					visibility: weather.visibility,
					recommendation:
						weather.cloudCover >= 95
							? "Not visible - heavy cloud cover will block view"
							: weather.cloudCover >= 80
								? "Poor visibility - heavy cloud cover likely to block view"
								: weather.isFavorable
									? "Good viewing conditions expected"
									: "Check sky conditions before heading out",
				}
			: undefined,
		tips: [
			"Find a location with a clear view of the sky",
			"Allow your eyes 10-15 minutes to adjust to darkness",
			"The ISS moves faster than an airplane - track smoothly",
		],
		generatedAt: Date.now(),
		weatherIncluded: weather !== null,
	};
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate that AI-generated briefing matches source pass data (FR-006, SC-002)
 */
function validateBriefingAccuracy(
	briefing: PassBriefing,
	passData: PassPrediction,
): boolean {
	// Verify elevation matches within tolerance
	const elevationDiff = Math.abs(
		briefing.elevation.max - passData.maxElevation,
	);
	if (elevationDiff > 1) {
		console.warn(
			`Briefing elevation mismatch: ${briefing.elevation.max} vs ${passData.maxElevation}`,
		);
		// Correct the briefing
		briefing.elevation.max = passData.maxElevation;
	}

	// Verify viewing window time matches pass start
	const timeDiff = Math.abs(
		briefing.viewingWindow.optimalStart.getTime() -
			passData.startTime.getTime(),
	);
	if (timeDiff > 60000) {
		// More than 1 minute difference
		console.warn(
			`Briefing time mismatch: correcting optimal start to match pass start`,
		);
		briefing.viewingWindow.optimalStart = passData.startTime;
	}

	return true;
}

// =============================================================================
// SERVER FUNCTION
// =============================================================================

/**
 * Generate an AI briefing for a pass
 */
export const generateBriefing = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			passData: PassPredictionSchema,
			location: LatLngSchema,
		}),
	)
	.handler(async ({ data, context }) => {
		ensureSentryInitialized();
		return Sentry.startSpan(
			{ name: "Generate AI Briefing" },
			async (): Promise<GenerateBriefingResponse> => {
				const { passData, location } = data;

				// Fetch weather data (optional enhancement)
				let weather: WeatherConditions | null = null;
				try {
					weather = await getWeatherForPass(location, passData.startTime, 2);
				} catch (e) {
					const err = e instanceof Error ? e : new Error(String(e));
					console.log("[AI Briefing] Capturing weather fetch error to Sentry");
					try {
						Sentry.captureException(err, {
							tags: {
								component: "ai_briefing",
								operation: "weather_fetch",
							},
							extra: {
								location,
								passTime: passData.startTime.toISOString(),
							},
						});
						console.log("[AI Briefing] Error captured successfully");
					} catch (sentryError) {
						console.error(
							"[AI Briefing] Failed to capture to Sentry:",
							sentryError,
						);
					}
					console.warn("Weather fetch failed, continuing without:", err);
				}

				// Get AI binding from Cloudflare environment
				// When running via 'wrangler pages dev --proxy', this is available in 'env'
				const ai =
					(env as Cloudflare.Env)?.AI ||
					(context &&
						(context as unknown as { cloudflare?: { env?: Cloudflare.Env } })
							.cloudflare?.env?.AI);

				if (!ai) {
					// Fallback: Return structured data without AI narrative
					const fallbackBriefing = createFallbackBriefing(
						passData,
						location,
						weather,
					);
					return {
						status: "success",
						briefing: fallbackBriefing,
					};
				}

				const prompt = buildBriefingPrompt(passData, location, weather);

				// Retry logic for AI generation
				let aiResponse: unknown = null;
				let aiError: Error | null = null;
				const maxRetries = 2;

				for (let attempt = 0; attempt <= maxRetries; attempt++) {
					try {
						aiResponse = await ai.run(
							"@cf/meta/llama-3.1-8b-instruct" as Parameters<typeof ai.run>[0],
							{
								messages: [
									{ role: "system", content: SYSTEM_PROMPT },
									{ role: "user", content: prompt },
								],
								max_tokens: 500,
							},
						);
						aiError = null;
						break; // Success, exit retry loop
					} catch (error) {
						aiError = error instanceof Error ? error : new Error(String(error));

						// Don't retry on certain errors
						if (
							attempt < maxRetries &&
							!aiError.message.includes("rate limit")
						) {
							await new Promise((resolve) =>
								setTimeout(resolve, 1000 * (attempt + 1)),
							);
							continue;
						}

						// If last attempt or rate limited, break and use fallback
						break;
					}
				}

				if (!aiResponse) {
					throw aiError || new Error("AI generation failed after retries");
				}

				const response = aiResponse;

				try {
					// Parse AI response
					const responseText =
						typeof response === "object" && "response" in response
							? (response as { response: string }).response
							: String(response);

					const parsed = parseAIResponse(responseText);

					if (!parsed) {
						console.warn("Failed to parse AI response, using fallback");
						const fallbackBriefing = createFallbackBriefing(
							passData,
							location,
							weather,
						);
						return {
							status: "success",
							briefing: fallbackBriefing,
						};
					}

					// Validate and correct summary if it doesn't account for weather
					let correctedSummary = parsed.summary;
					if (weather && weather.cloudCover >= 80) {
						// If weather blocks visibility but summary doesn't mention it, correct it
						const lowerSummary = correctedSummary.toLowerCase();
						if (
							!lowerSummary.includes("not visible") &&
							!lowerSummary.includes("blocked") &&
							!lowerSummary.includes("cloud")
						) {
							const summaryDate = passData.startTime.toLocaleDateString(
								"en-US",
								{
									weekday: "long",
									month: "long",
									day: "numeric",
								},
							);
							const summaryTime = passData.startTime.toLocaleTimeString(
								"en-US",
								{
									hour: "numeric",
									minute: "2-digit",
									hour12: true,
								},
							);
							if (weather.cloudCover >= 95) {
								correctedSummary = `ISS pass on ${summaryDate} at ${summaryTime} - Not visible due to heavy cloud cover (${weather.cloudCover}%)`;
							} else {
								correctedSummary = `${correctedSummary} - Likely not visible (${weather.cloudCover}% clouds)`;
							}
						}
					}

					// Build briefing from AI response
					const magnitude = estimateBrightness(passData.maxElevation);

					// Determine recommendation based on weather
					let recommendation: string;
					if (weather) {
						if (weather.cloudCover >= 95) {
							recommendation =
								"Not visible - heavy cloud cover will block view";
						} else if (weather.cloudCover >= 80) {
							recommendation =
								"Poor visibility - heavy cloud cover likely to block view";
						} else if (weather.isFavorable) {
							recommendation = "Good viewing conditions expected";
						} else {
							recommendation = "Check sky conditions before heading out";
						}
					} else {
						recommendation = "Weather data unavailable";
					}

					const briefing: PassBriefing = {
						id: passData.id,
						passId: passData.id,
						summary: correctedSummary,
						narrative: parsed.narrative,
						viewingWindow: {
							optimalStart: passData.startTime,
							description: `Start watching at ${passData.startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`,
						},
						elevation: {
							max: passData.maxElevation,
							direction: parsed.optimalDirection,
						},
						brightness: {
							magnitude,
							description: getBrightnessDescription(magnitude),
						},
						conditions: weather
							? {
									cloudCover: weather.cloudCover,
									visibility: weather.visibility,
									recommendation,
								}
							: undefined,
						tips:
							parsed.tips.length > 0
								? parsed.tips
								: [
										"Find a location with a clear view of the sky",
										"Allow your eyes to adjust to darkness",
									],
						generatedAt: Date.now(),
						weatherIncluded: weather !== null,
					};

					// Validate accuracy (FR-006, SC-002)
					validateBriefingAccuracy(briefing, passData);

					return {
						status: "success",
						briefing,
					};
				} catch (error) {
					Sentry.captureException(error);
					console.error("AI generation failed:", error);

					// Fallback on error
					const fallbackBriefing = createFallbackBriefing(
						passData,
						location,
						weather,
					);
					return {
						status: "success",
						briefing: fallbackBriefing,
					};
				}
			},
		);
	});
