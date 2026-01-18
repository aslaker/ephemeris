/**
 * MessageList Component
 *
 * Displays the conversation message history.
 * Feature: 007-observation-copilot
 */

import { useEffect, useRef } from "react";
import type { Message } from "@/lib/copilot/types";
import { MessageBubble } from "./MessageBubble";
import { ThinkingIndicator } from "./ThinkingIndicator";

interface MessageListProps {
	messages: Message[];
	isLoading?: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
	const scrollRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to bottom when new messages arrive or loading state changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: Need to scroll when messages or loading change
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages, isLoading]);

	if (messages.length === 0) {
		return (
			<div className="flex-1 flex items-center justify-center text-matrix-dim text-sm">
				Start a conversation by asking about ISS passes, position, or weather.
			</div>
		);
	}

	return (
		<div
			ref={scrollRef}
			className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
			role="log"
			aria-live="polite"
			aria-label="Chat conversation"
		>
			{messages.map((message) => (
				<MessageBubble key={message.id} message={message} />
			))}
			{isLoading && <ThinkingIndicator />}
		</div>
	);
}
