/**
 * AI Briefing Prompt Templates
 *
 * Prompt templates for generating AI pass briefings using Cloudflare Workers AI.
 */

import type { PassPrediction } from "@/lib/iss/types";
import type { LatLng, WeatherConditions } from "./types";
import {
	derivePassQuality,
	estimateBrightness,
	getBrightnessDescription,
} from "./types";

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

export const SYSTEM_PROMPT = `You are an astronomy assistant helping people observe the International Space Station (ISS). Generate clear, friendly briefings for ISS passes that explain when and how to see the station. Use simple language suitable for beginners. Keep responses concise but informative.

CRITICAL: Weather conditions directly affect visibility:
- Cloud cover above 80% means the ISS will NOT be visible (it will be obscured by clouds)
- Cloud cover between 50-80% means visibility may be poor or blocked
- Cloud cover below 50% with good visibility (>10km) means favorable viewing conditions
- If weather data shows high cloud cover (>80%), you MUST state that the ISS will NOT be visible or may not be visible due to cloud cover
- Do NOT say the ISS "will be visible" if cloud cover exceeds 80%

Your responses must be valid JSON with exactly this structure:
{
  "summary": "One-sentence summary of the pass opportunity (max 200 chars). If cloud cover >80%, mention that visibility is blocked.",
  "narrative": "2-3 paragraph explanation of when, where, and how to view the ISS pass. If cloud cover >80%, explain that clouds will prevent viewing.",
  "optimalDirection": "The cardinal direction to look at peak visibility (e.g., 'Northwest')",
  "tips": ["tip1", "tip2", "tip3"]
}

Do not include any text outside the JSON object.`;

// =============================================================================
// PROMPT BUILDER
// =============================================================================

/**
 * Build the user prompt for AI briefing generation
 */
export function buildBriefingPrompt(
	pass: PassPrediction,
	location: LatLng,
	weather: WeatherConditions | null,
): string {
	const startTime = pass.startTime.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
	const date = pass.startTime.toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
	});

	const quality = derivePassQuality(pass.maxElevation);
	const magnitude = estimateBrightness(pass.maxElevation);
	const brightnessDesc = getBrightnessDescription(magnitude);

	let prompt = `Generate a viewing briefing for an ISS pass with these details:

**Pass Information:**
- Date: ${date}
- Start time: ${startTime}
- Duration: ${Math.round(pass.duration)} minutes
- Maximum elevation: ${Math.round(pass.maxElevation)}°
- Quality rating: ${quality}
- Expected brightness: ${brightnessDesc} (magnitude ${magnitude.toFixed(1)})

**Observer Location:**
- Latitude: ${location.lat.toFixed(4)}°
- Longitude: ${location.lng.toFixed(4)}°`;

	if (weather) {
		const visibilityStatus =
			weather.cloudCover >= 95
				? "BLOCKED - ISS will NOT be visible due to heavy cloud cover"
				: weather.cloudCover >= 80
					? "POOR - ISS may not be visible due to heavy cloud cover"
					: weather.isFavorable
						? "FAVORABLE - Good viewing conditions expected"
						: "MARGINAL - Visibility may be affected by cloud cover";

		prompt += `

**Weather Conditions (CRITICAL FOR VISIBILITY):**
- Cloud cover: ${weather.cloudCover}%
- Visibility: ${Math.round(weather.visibility / 1000)} km
- Status: ${visibilityStatus}

IMPORTANT: If cloud cover is above 80%, you MUST state that the ISS will NOT be visible or will be obscured by clouds. Do NOT say it "will be visible" if cloud cover exceeds 80%.`;
	} else {
		prompt += `

**Weather:** Not available - assume clear skies for the briefing.`;
	}

	prompt += `

Please generate a helpful viewing briefing that:
1. Provides a concise one-sentence summary (if cloud cover >80%, mention visibility is blocked)
2. Explains when to start looking and in which direction (if visible)
3. Describes how bright the ISS will appear (if visible)
4. Offers 2-3 practical viewing tips (or tips for checking weather if visibility is blocked)

Remember to respond with valid JSON only.`;

	return prompt;
}

// =============================================================================
// RESPONSE PARSER
// =============================================================================

export interface AIBriefingResponse {
	summary: string;
	narrative: string;
	optimalDirection: string;
	tips: string[];
}

/**
 * Parse and validate AI response
 */
export function parseAIResponse(
	responseText: string,
): AIBriefingResponse | null {
	try {
		// Try to extract JSON from the response
		const jsonMatch = responseText.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			console.warn("No JSON found in AI response");
			return null;
		}

		const parsed = JSON.parse(jsonMatch[0]);

		// Validate required fields
		if (
			typeof parsed.summary !== "string" ||
			typeof parsed.narrative !== "string" ||
			!Array.isArray(parsed.tips)
		) {
			console.warn("AI response missing required fields");
			return null;
		}

		return {
			summary: parsed.summary.slice(0, 200), // Enforce max length
			narrative: parsed.narrative.slice(0, 2000),
			optimalDirection: parsed.optimalDirection || "overhead",
			tips: parsed.tips.slice(0, 5).map((t: unknown) => String(t)),
		};
	} catch (e) {
		console.error("Failed to parse AI response:", e);
		return null;
	}
}
