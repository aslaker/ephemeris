/**
 * Copilot Agent
 *
 * Durable Object based agent using Cloudflare Agents SDK.
 * Feature: 008-tanstack-ai-migration
 */

import { env } from "cloudflare:workers";
import * as Sentry from "@sentry/tanstackstart-react";
import { createServerFn } from "@tanstack/react-start";
import { getAgentByName } from "agents";
import { sanitizeData } from "../ai/sanitization";
import { ChatRequestSchema } from "./types";

// =============================================================================
// SERVER FUNCTION
// =============================================================================

/**
 * Chat completion server function that proxies to the CopilotAgent
 */
export const chatCompletion = createServerFn({ method: "POST" })
	.inputValidator(ChatRequestSchema)
	.handler(async ({ data }) => {
		return Sentry.startSpan({ name: "Copilot Chat Proxy" }, async () => {
			try {
				// Get Agent DO binding
				const agentNamespace = (env as any).CopilotAgent;

				if (!agentNamespace) {
					throw new Error("CopilotAgent binding is not configured");
				}

				// Get or create agent instance
				// Use a stable ID for the session or a default one
				const agentId = data.conversationId || "global-copilot";
				const agent = await getAgentByName(agentNamespace, agentId);

				// Call the agent via RPC
				const result = (await (agent as any).chat({
					message: data.message,
					history: data.conversationContext.messages,
					location: data.location,
				})) as { content: string; toolCalls: number };

				// Log success
				Sentry.addBreadcrumb({
					message: "Copilot agent response received",
					level: "info",
					data: {
						toolCalls: result.toolCalls,
						responseLength: result.content.length,
					},
				});

				return {
					status: "success",
					message: {
						id: crypto.randomUUID(),
						role: "assistant",
						content: result.content,
						timestamp: Date.now(),
					},
				};
			} catch (error) {
				const err = error instanceof Error ? error : new Error(String(error));

				// Log error with sanitized data
				const sanitized = sanitizeData(
					{
						message: data.message,
						hasContext: data.conversationContext.messages.length > 0,
					},
					"sentry",
				);

				Sentry.captureException(err, {
					tags: {
						copilot: "chat_proxy_error",
					},
					extra: sanitized as Record<string, unknown>,
				});

				return {
					status: "error",
					error: {
						code: "UNKNOWN_ERROR",
						message: `An error occurred: ${err.message}`,
					},
				};
			}
		});
	});
