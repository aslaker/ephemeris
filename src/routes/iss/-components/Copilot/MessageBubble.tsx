/**
 * MessageBubble Component
 *
 * Displays a single message in the chat interface.
 * Feature: 007-observation-copilot
 */

import { Link } from "@tanstack/react-router";
import type {
	Message,
	MessageLink as MessageLinkType,
} from "@/lib/copilot/types";

interface MessageBubbleProps {
	message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
	const isUser = message.role === "user";
	const isStreaming = message.isStreaming ?? false;

	return (
		<div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
			<div
				className={`max-w-[80%] rounded-lg p-3 ${
					isUser
						? "bg-matrix-dim text-matrix-text"
						: "bg-matrix-dark border border-matrix-dim text-matrix-text"
				}`}
			>
				{/* Message Content */}
				<div className="text-sm whitespace-pre-wrap break-words">
					{message.content || (
						<span className="text-matrix-dim italic">Thinking...</span>
					)}
					{isStreaming && message.content && (
						<span className="inline-block w-2 h-4 bg-matrix-text ml-1 animate-pulse" />
					)}
				</div>

				{/* Links */}
				{message.links && message.links.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-2">
						{message.links.map((link: MessageLinkType, idx: number) => (
							<MessageLink key={`${link.href}-${idx}`} link={link} />
						))}
					</div>
				)}

				{/* Tool Calls */}
				{message.toolCalls && message.toolCalls.length > 0 && (
					<div className="mt-2 text-xs text-matrix-dim">
						{message.toolCalls.map(
							(toolCall: {
								id: string;
								name: string;
								status: string;
								error?: string;
							}) => (
								<div key={toolCall.id} className="mb-1">
									<span className="font-mono">
										{toolCall.name}
										{toolCall.status === "pending" && " (running...)"}
										{toolCall.status === "error" &&
											` (error: ${toolCall.error})`}
									</span>
								</div>
							),
						)}
					</div>
				)}

				{/* Error */}
				{message.error && (
					<div className="mt-2 text-xs text-matrix-alert">
						{message.error.message}
					</div>
				)}

				{/* Timestamp - hide for empty streaming messages */}
				{message.content && (
					<div className="mt-1 text-xs text-matrix-dim opacity-50">
						{new Date(message.timestamp).toLocaleTimeString("en-US", {
							hour: "numeric",
							minute: "2-digit",
						})}
					</div>
				)}
			</div>
		</div>
	);
}

function MessageLink({ link }: { link: MessageLinkType }) {
	if (link.type === "route") {
		return (
			<Link
				to={link.href}
				className="text-matrix-text underline hover:text-matrix-bright transition-colors"
			>
				{link.text}
			</Link>
		);
	}

	return (
		<a
			href={link.href}
			target="_blank"
			rel="noopener noreferrer"
			className="text-matrix-text underline hover:text-matrix-bright transition-colors"
		>
			{link.text}
		</a>
	);
}
