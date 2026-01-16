/**
 * Copilot Agent
 *
 * Server function for chat completion with embedded function calling.
 * Uses Cloudflare Agents SDK for automatic tool execution.
 * Feature: 008-tanstack-ai-migration
 */

import { env } from "cloudflare:workers";
import * as Sentry from "@sentry/tanstackstart-react";
import { createServerFn } from "@tanstack/react-start";
import { generateText, stepCountIs } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { AI_CONFIG } from "../ai/config";
import { ensureSentryInitialized } from "../briefing/sentry-init";
import { COPILOT_SYSTEM_PROMPT } from "./prompts";
import {
	createGetUserLocationTool,
	getISSPositionTool,
	getPassWeatherTool,
	getUpcomingPassesTool,
	searchKnowledgeBaseTool,
} from "./tools";
import { ChatRequestSchema } from "./types";
import { sanitizeForLogging } from "./utils";

// =============================================================================
// SERVER FUNCTION
// =============================================================================

/**
 * Chat completion server function with embedded tool calling
 * Uses Cloudflare Agents SDK for automatic tool execution
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
				// Ensure messages array exists and is valid
				const contextMessages = (data.conversationContext?.messages ?? [])
					.filter((m) => !m.content.startsWith("Error:"))
					.map((m) => ({
						role: m.role as "user" | "assistant" | "system",
						content: m.content,
					}));

				// Use the CopilotAgent Durable Object if available
				try {
					const copilotDO = (env as any).CopilotAgent;
					if (copilotDO) {
						console.error(
							"[Copilot Agent] Using Durable Object for completion",
						);
						const id = copilotDO.idFromName(
							data.conversationId || "default-session",
						);
						const stub = copilotDO.get(id);

						// Breadcrumb: Calling DO
						Sentry.addBreadcrumb({
							message: "Calling CopilotAgent DO",
							category: "copilot",
							level: "info",
							data: {
								conversationId: data.conversationId || "default-session",
							},
						});

						const doResult = await stub.chat({
							message: data.message,
							history: contextMessages,
							location: data.location,
						});

						console.error(
							"[Copilot Agent] DO result received content length:",
							(doResult.content || "").length,
						);

						return {
							status: "success",
							message: {
								id: crypto.randomUUID(),
								role: "assistant",
								content: doResult.content,
								timestamp: Date.now(),
							},
						};
					}
				} catch (doError) {
					console.error(
						"[Copilot Agent] Durable Object call failed, falling back to local completion:",
						doError,
					);
					Sentry.captureException(doError, {
						tags: { copilot: "do_call_failed" },
					});
				}

				// Fallback to local completion (the previous logic)
				// Initialize Workers AI provider
				console.error(
					"[Copilot Agent] Initializing Workers AI provider with binding:",
					!!ai,
				);
				const workersai = createWorkersAI({ binding: ai });

				// Consolidate consecutive messages of the same role
				const consolidatedMessages: Array<{
					role: "user" | "assistant" | "system";
					content: string;
				}> = [];
				for (const msg of contextMessages) {
					if (
						consolidatedMessages.length > 0 &&
						consolidatedMessages[consolidatedMessages.length - 1].role ===
							msg.role
					) {
						consolidatedMessages[consolidatedMessages.length - 1].content +=
							`\n${msg.content}`;
					} else {
						consolidatedMessages.push(msg);
					}
				}

				const messages = [
					{ role: "system" as const, content: COPILOT_SYSTEM_PROMPT },
					...consolidatedMessages,
					{ role: "user" as const, content: data.message },
				];

				// If the last message before the new user message was also a user message, consolidate
				if (
					messages.length >= 2 &&
					messages[messages.length - 2].role === "user"
				) {
					const lastUserMsg = messages.pop()!;
					messages[messages.length - 1].content += `\n${lastUserMsg.content}`;
				}

				// Define tools using imported tool definitions
				const tools = {
					get_iss_position: getISSPositionTool,
					get_upcoming_passes: getUpcomingPassesTool,
					get_pass_weather: getPassWeatherTool,
					get_user_location: createGetUserLocationTool(data.location),
					search_knowledge_base: searchKnowledgeBaseTool,
				};

				console.error(
					"[Copilot Agent] Running generateText with model:",
					AI_CONFIG.modelId,
				);

				// Run completion with automatic tool execution
				let result: any;
				try {
					console.error("[Copilot Agent] Calling generateText...");
					result = await generateText({
						model: workersai(AI_CONFIG.modelId as any),
						messages: messages as any,
						tools,
						stopWhen: stepCountIs(AI_CONFIG.maxIterations),
					});

					console.error(
						"[Copilot Agent] generateText completed. Text length:",
						(result.text || "").length,
						"FinishReason:",
						result.finishReason,
						"Steps:",
						result.steps?.length ?? 0,
					);
				} catch (aiError) {
					console.error("[Copilot Agent] generateText failed:", aiError);
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
							message: "Failed to generate a response. Please try again.",
						},
					};
				}

				// Extract final response
				let content: string;
				try {
					content =
						result.text ||
						"I apologize, but I couldn't generate a response. Please try again.";

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
							hasResponse: !!result,
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
						code: errorCode as any,
						message: errorMessage,
					},
				};
			}
		});
	});
