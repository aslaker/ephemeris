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
import { generateText, stepCountIs } from "ai";
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
			console.error(
				"[CopilotAgent] Running generateText with messages:",
				messages.length,
				"model:",
				AI_CONFIG.modelId,
			);

			try {
				const result = await generateText({
					model: workersai(AI_CONFIG.modelId as any),
					messages: messages as any,
					tools,
					stopWhen: stepCountIs(AI_CONFIG.maxIterations),
				});

				console.error(
					"[CopilotAgent] generateText finished. Text:",
					(result.text || "").substring(0, 100),
					"FinishReason:",
					result.finishReason,
					"Steps:",
					result.steps?.length,
				);

				if (result.steps) {
					for (let i = 0; i < result.steps.length; i++) {
						const step = result.steps[i];
						console.error(
							`[CopilotAgent] Step ${i}:`,
							"Text:",
							(step.text || "").substring(0, 50),
							"ToolCalls:",
							step.toolCalls?.length,
							"ToolResults:",
							step.toolResults?.length,
						);
					}
				}

				// Extract content from result, with fallback to step text if main text is empty
				let content = result.text;
				if (!content && result.steps && result.steps.length > 0) {
					// Try to find text in the last step
					const lastStep = result.steps[result.steps.length - 1];
					content = lastStep.text || "";
					console.error(
						"[CopilotAgent] No text in result, using last step text:",
						content.substring(0, 50),
					);
				}

				// If still no content, provide fallback
				if (!content) {
					console.error(
						"[CopilotAgent] WARNING: No text response generated despite successful tool calls",
					);
					content =
						"I apologize, but I couldn't generate a response. Please try again.";
				}

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
			} catch (error) {
				console.error("[CopilotAgent] Fatal error during generateText:", error);
				return {
					content:
						"I encountered an error while processing your request. Please try again.",
					toolCalls: 0,
					error: String(error),
				};
			}
		});
	}
}
