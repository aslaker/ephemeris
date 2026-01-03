/**
 * Copilot Prompts
 *
 * System prompt and suggested prompts for the Observation Copilot.
 * Feature: 007-observation-copilot
 */

import type { SuggestedPrompt } from "./types";

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

export const COPILOT_SYSTEM_PROMPT = `You are an ISS Observation Copilot, helping users track and observe the International Space Station.

You have access to these tools:
- get_iss_position: Get current ISS location (latitude, longitude, altitude, velocity)
- get_upcoming_passes: Get visible ISS passes for a location (returns pass times, durations, and visibility quality)
- get_pass_weather: Get weather conditions for a specific pass time (cloud cover, visibility, viewing recommendation)
- get_user_location: Get the user's saved location from their preferences
- search_knowledge_base: Search ISS facts about the space station, orbital mechanics, crew, and observation tips

IMPORTANT: After using any tools, you MUST provide a natural language response that incorporates the tool results. Never stop without providing a text response to the user.

Guidelines:
- Be conversational and enthusiastic about space
- Always use tools to get accurate data - never make up pass times, positions, or facts
- After calling tools, ALWAYS respond with natural language that uses the data you received
- If user has no saved location, ask them to set one and provide a link to the location selector
- Include relevant links when mentioning maps or pass details (use format: [text](/iss/map) or [text](/iss/passes))
- Keep responses concise but informative (2-4 sentences typically)
- When discussing passes, mention quality (excellent/good/fair/poor), duration, and direction
- Use natural, friendly language - avoid technical jargon unless the user asks for it
- If weather data is unavailable, still provide pass information and note that weather couldn't be checked

Response format:
- Use natural language
- Include specific times and dates in user's local timezone when possible
- Mention weather conditions when relevant
- Suggest next steps when appropriate (e.g., "You can view this pass on the map" with a link)
- ALWAYS end with a complete response - never stop after just calling tools`;

// =============================================================================
// SUGGESTED PROMPTS
// =============================================================================

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
	{
		id: "prompt-1",
		text: "When is my next visible ISS pass?",
		category: "passes",
		contextCondition: { type: "has_location" },
	},
	{
		id: "prompt-2",
		text: "What passes are coming up this week?",
		category: "passes",
		contextCondition: { type: "has_location" },
	},
	{
		id: "prompt-3",
		text: "Is tonight's pass worth watching?",
		category: "weather",
		contextCondition: { type: "has_upcoming_pass" },
	},
	{
		id: "prompt-4",
		text: "How fast is the ISS traveling right now?",
		category: "position",
		contextCondition: { type: "always" },
	},
	{
		id: "prompt-5",
		text: "What is the ISS?",
		category: "knowledge",
		contextCondition: { type: "always" },
	},
	{
		id: "prompt-6",
		text: "Tell me about the current crew on the ISS",
		category: "crew",
		contextCondition: { type: "always" },
	},
	{
		id: "prompt-7",
		text: "Where is the ISS right now?",
		category: "position",
		contextCondition: { type: "always" },
	},
	{
		id: "prompt-8",
		text: "What should I know about tonight's pass?",
		category: "passes",
		contextCondition: { type: "has_upcoming_pass" },
	},
	{
		id: "prompt-9",
		text: "How high does the ISS orbit?",
		category: "knowledge",
		contextCondition: { type: "always" },
	},
	{
		id: "prompt-10",
		text: "Set my location to see passes",
		category: "passes",
		contextCondition: { type: "no_location" },
	},
];

/**
 * Get suggested prompts filtered by context
 */
export function getSuggestedPrompts(context: {
	hasLocation: boolean;
	hasUpcomingPass: boolean;
}): SuggestedPrompt[] {
	// Defensive check for SUGGESTED_PROMPTS array
	if (!Array.isArray(SUGGESTED_PROMPTS) || SUGGESTED_PROMPTS.length === 0) {
		return [];
	}

	// Defensive check for context
	const safeContext = {
		hasLocation: context?.hasLocation ?? false,
		hasUpcomingPass: context?.hasUpcomingPass ?? false,
	};

	return SUGGESTED_PROMPTS.filter((prompt) => {
		// Defensive check for prompt
		if (!prompt) return false;

		if (!prompt.contextCondition) return true;

		const { type } = prompt.contextCondition;
		if (type === "always") return true;
		if (type === "has_location" && safeContext.hasLocation) return true;
		if (type === "has_upcoming_pass" && safeContext.hasUpcomingPass)
			return true;
		if (type === "no_location" && !safeContext.hasLocation) return true;

		return false;
	});
}
