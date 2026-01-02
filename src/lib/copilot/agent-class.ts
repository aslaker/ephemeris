/**
 * Copilot Agent Class
 *
 * Durable Object based agent using Cloudflare Agents SDK.
 * This file is only intended to be used on the server.
 */

import * as Sentry from "@sentry/tanstackstart-react";
import { callable } from "agents";
import { AIChatAgent } from "agents/ai-chat-agent";
import { autoTransformMessages } from "agents/ai-chat-v5-migration";
import { convertToModelMessages, generateText } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { AI_CONFIG } from "../ai/config";
import { COPILOT_SYSTEM_PROMPT } from "./prompts";
import {
	createGetUserLocationTool,
	getISSPositionTool,
	getPassWeatherTool,
	getUpcomingPassesTool,
	searchKnowledgeBaseTool,
} from "./tools";

/**
 * Durable Object Agent for Copilot
 */
export class CopilotAgent extends AIChatAgent<Cloudflare.Env> {
	/**
	 * Custom RPC method to handle chat completion from server functions
	 */
	@callable()
	async chat(params: {
		message: string;
		history: any[];
		location?: { lat: number; lng: number };
	}) {
		return Sentry.startSpan({ name: "CopilotAgent: chat" }, async () => {
			const { message, history, location } = params;

			// Initialize Workers AI provider
			const workersai = createWorkersAI({ binding: this.env.AI });

			// Build messages for the model
			const messages = [
				{ role: "system", content: COPILOT_SYSTEM_PROMPT },
				...history.map((m) => ({
					role: m.role,
					content: m.content,
				})),
				{ role: "user", content: message },
			];

			// Define tools
			const tools = {
				get_iss_position: getISSPositionTool,
				get_upcoming_passes: getUpcomingPassesTool,
				get_pass_weather: getPassWeatherTool,
				get_user_location: createGetUserLocationTool(location),
				search_knowledge_base: searchKnowledgeBaseTool,
			};

			// Run completion
			const result = await generateText({
				model: workersai(AI_CONFIG.modelId as any),
				messages: convertToModelMessages(messages as any),
				tools,
				// @ts-expect-error - maxSteps is supported in AI SDK v5 generateText
				maxSteps: AI_CONFIG.maxIterations,
			});

			const content =
				result.text ||
				"I apologize, but I couldn't generate a response. Please try again.";

			// Save to persistent history (properly transformed for Agent persistence)
			await this.persistMessages(
				autoTransformMessages([
					{ id: crypto.randomUUID(), role: "user", content: message },
					{ id: crypto.randomUUID(), role: "assistant", content },
				]),
			);

			return {
				content,
				toolCalls: result.toolCalls?.length || 0,
			};
		});
	}
}
