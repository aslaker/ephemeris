/**
 * Conversation Store
 *
 * TanStack Store for managing conversation state with context trimming.
 * Feature: 007-observation-copilot
 */

import { Store } from "@tanstack/store";
import type { Conversation, ConversationStoreState, Message } from "./types";
import { RequestQueue } from "./utils";

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_MESSAGES = 10;
const MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes

// =============================================================================
// REQUEST QUEUE INSTANCE
// =============================================================================

const requestQueue = new RequestQueue();

// =============================================================================
// STORE INSTANCE
// =============================================================================

const initialState: ConversationStoreState = {
	conversation: null,
	isLoading: false,
	requestQueue: {
		activeCount: 0,
		queuedCount: 0,
	},
};

export const conversationStore = new Store<ConversationStoreState>(
	initialState,
);

// Sync request queue state to store
function updateQueueState(): void {
	const state = requestQueue.getState();
	conversationStore.setState((prev) => ({
		...prev,
		requestQueue: state,
	}));
}

// Update queue state periodically (only in browser)
if (typeof window !== "undefined") {
	setInterval(updateQueueState, 100);
}

// =============================================================================
// CONTEXT TRIMMING
// =============================================================================

/**
 * Trim conversation context according to limits
 * - Maximum 10 messages OR 15 minutes, whichever is shorter
 */
function trimContext(messages: Message[]): Message[] {
	const now = Date.now();
	const fifteenMinsAgo = now - MAX_AGE_MS;

	// Filter by time first
	const recent = messages.filter((m) => m.timestamp > fifteenMinsAgo);

	// Then limit to last MAX_MESSAGES
	return recent.slice(-MAX_MESSAGES);
}

// =============================================================================
// ACTIONS
// =============================================================================

export const conversationActions = {
	/**
	 * Start a new conversation
	 */
	startConversation(): void {
		const conversation: Conversation = {
			id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Safe ID generation
			messages: [],
			createdAt: Date.now(),
			lastActivityAt: Date.now(),
		};

		conversationStore.setState((prev) => ({
			...prev,
			conversation,
		}));
	},

	/**
	 * Add a user message
	 */
	addUserMessage(content: string): void {
		const message: Message = {
			id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Safe ID generation
			role: "user",
			content,
			timestamp: Date.now(),
		};

		conversationStore.setState((prev) => {
			if (!prev.conversation) {
				// Auto-start conversation if none exists
				const conversation: Conversation = {
					id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					messages: [message],
					createdAt: Date.now(),
					lastActivityAt: Date.now(),
				};
				return {
					...prev,
					conversation,
				};
			}

			const messages = trimContext([...prev.conversation.messages, message]);
			return {
				...prev,
				conversation: {
					...prev.conversation,
					messages,
					lastActivityAt: Date.now(),
				},
			};
		});
	},

	/**
	 * Add an assistant message
	 */
	addAssistantMessage(message: Message): void {
		conversationStore.setState((prev) => {
			if (!prev.conversation) {
				// Auto-start conversation if none exists
				const conversation: Conversation = {
					id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					messages: [message],
					createdAt: Date.now(),
					lastActivityAt: Date.now(),
				};
				return {
					...prev,
					conversation,
				};
			}

			const messages = trimContext([...prev.conversation.messages, message]);
			return {
				...prev,
				conversation: {
					...prev.conversation,
					messages,
					lastActivityAt: Date.now(),
				},
			};
		});
	},

	/**
	 * Clear conversation
	 */
	clearConversation(): void {
		conversationStore.setState((prev) => ({
			...prev,
			conversation: null,
		}));
	},

	/**
	 * Set loading state
	 */
	setLoading(isLoading: boolean): void {
		conversationStore.setState((prev) => ({
			...prev,
			isLoading,
		}));
	},

	/**
	 * Get trimmed conversation context for API requests
	 */
	getContext(): Array<{ role: "user" | "assistant"; content: string }> {
		const state = conversationStore.state;
		if (!state.conversation) return [];

		const trimmed = trimContext(state.conversation.messages);
		return trimmed.map((m) => ({
			role: m.role,
			content: m.content,
		}));
	},
};

// =============================================================================
// REQUEST QUEUE EXPORTS
// =============================================================================

export { requestQueue };
