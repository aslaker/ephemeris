/**
 * CopilotPanel Component
 *
 * Main chat interface container for the Observation Copilot.
 * Feature: 007-observation-copilot
 */

import { useStore } from "@tanstack/react-store";
import { useCallback, useState } from "react";
import { useLocation } from "@/hooks/useLocation";
import { useNextPass } from "@/hooks/useNextPass";
import { chatCompletion } from "@/lib/copilot/agent";
import {
	conversationActions,
	conversationStore,
	requestQueue,
} from "@/lib/copilot/store";
import type { ChatResponse, Message } from "@/lib/copilot/types";
import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";
import { SuggestedPrompts } from "./SuggestedPrompts";
import { ToolExecutionIndicator } from "./ToolExecutionIndicator";

export function CopilotPanel() {
	const conversation = useStore(conversationStore, (s) => s.conversation);
	const isLoading = useStore(conversationStore, (s) => s.isLoading);
	const { coordinates } = useLocation();
	const { nextPass } = useNextPass();

	// Clear conversation when unmounting (session-scoped)
	// useEffect(() => {
	// 	return () => conversationActions.clearConversation();
	// }, []);

	const [currentToolCalls, setCurrentToolCalls] = useState<
		Array<{ id: string; name: string; status: "pending" | "success" | "error" }>
	>([]);

	const messages: Message[] = conversation?.messages ?? [];

	const handleSend = useCallback(
		async (text: string) => {
			// Add user message to store
			conversationActions.addUserMessage(text);
			conversationActions.setLoading(true);

			try {
				// Enqueue request through rate limiter
				await requestQueue.enqueue(async () => {
					const context = conversationActions.getContext();
					const location = coordinates
						? { lat: coordinates.lat, lng: coordinates.lng }
						: undefined;

					const response = (await chatCompletion({
						data: {
							message: text,
							conversationContext: {
								messages: context,
							},
							location,
						},
					})) as ChatResponse;

					if (response.status === "success" && response.message) {
						conversationActions.addAssistantMessage(response.message);
					} else if (response.error) {
						// Add error message
						const errorMessage: Message = {
							id: crypto.randomUUID(),
							role: "assistant",
							content: `Error: ${response.error.message}`,
							timestamp: Date.now(),
							error: {
								code: response.error.code,
								message: response.error.message,
								retryable: response.error.code === "AI_UNAVAILABLE",
							},
						};
						conversationActions.addAssistantMessage(errorMessage);
					}
				});
			} catch (error) {
				const err = error instanceof Error ? error : new Error(String(error));
				const errorMessage: Message = {
					id: crypto.randomUUID(),
					role: "assistant",
					content: `Error: ${err.message}`,
					timestamp: Date.now(),
					error: {
						code: "UNKNOWN_ERROR",
						message: err.message,
						retryable: true,
					},
				};
				conversationActions.addAssistantMessage(errorMessage);
			} finally {
				conversationActions.setLoading(false);
				setCurrentToolCalls([]);
			}
		},
		[coordinates],
	);

	return (
		<div className="flex flex-col h-full bg-matrix-bg">
			{/* Suggested Prompts */}
			<SuggestedPrompts
				onSelect={handleSend}
				hasLocation={coordinates !== null}
				hasUpcomingPass={nextPass !== null}
			/>

			{/* Tool Execution Indicator */}
			{currentToolCalls.length > 0 && (
				<ToolExecutionIndicator
					toolCalls={currentToolCalls.map((tc) => ({
						id: tc.id,
						name: tc.name as
							| "get_iss_position"
							| "get_upcoming_passes"
							| "get_pass_weather"
							| "get_user_location"
							| "search_knowledge_base",
						parameters: {},
						status: tc.status,
					}))}
				/>
			)}

			{/* Message List */}
			<MessageList messages={messages} isLoading={isLoading} />

			{/* Chat Input */}
			<ChatInput onSend={handleSend} disabled={isLoading} />
		</div>
	);
}
