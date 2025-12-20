/**
 * ChatInput Component
 *
 * Input field for user messages with send button.
 * Feature: 007-observation-copilot
 */

import { Send } from "lucide-react";
import { type KeyboardEvent, useId, useState } from "react";
import { isLikelyNonEnglish } from "@/lib/copilot/utils";

interface ChatInputProps {
	onSend: (message: string) => void;
	disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
	const [input, setInput] = useState("");
	const [error, setError] = useState<string | null>(null);
	const hintId = useId();

	const handleSend = () => {
		const trimmed = input.trim();
		if (!trimmed) return;

		// Validate message length
		if (trimmed.length > 1000) {
			setError("Message is too long (max 1000 characters)");
			return;
		}

		// Check language
		if (isLikelyNonEnglish(trimmed)) {
			setError("Please ask your question in English.");
			return;
		}

		setError(null);
		onSend(trimmed);
		setInput("");
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	return (
		<div className="border-t border-matrix-dim p-4 bg-matrix-bg">
			{error && <div className="mb-2 text-xs text-matrix-alert">{error}</div>}
			<div className="flex gap-2">
				<textarea
					value={input}
					onChange={(e) => {
						setInput(e.target.value);
						setError(null);
					}}
					onKeyDown={handleKeyDown}
					placeholder="Ask about ISS passes, position, weather..."
					disabled={disabled}
					rows={2}
					aria-label="Chat message input"
					aria-describedby={hintId}
					className="flex-1 bg-matrix-dark border border-matrix-dim text-matrix-text p-2 rounded resize-none focus:outline-none focus:border-matrix-text disabled:opacity-50 disabled:cursor-not-allowed"
				/>
				<span id={hintId} className="sr-only">
					Press Enter to send, Shift+Enter for new line
				</span>
				<button
					type="button"
					onClick={handleSend}
					disabled={disabled || !input.trim()}
					className="bg-matrix-dim border border-matrix-text text-matrix-text p-2 rounded hover:bg-matrix-text hover:text-matrix-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-matrix-dim disabled:hover:text-matrix-text"
					aria-label="Send message"
				>
					<Send className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
}
