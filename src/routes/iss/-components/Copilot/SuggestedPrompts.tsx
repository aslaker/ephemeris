/**
 * SuggestedPrompts Component
 *
 * Displays clickable suggested prompts to help users get started.
 * Feature: 007-observation-copilot
 */

import { useId } from "react";
import { getSuggestedPrompts } from "@/lib/copilot/prompts";

interface SuggestedPromptsProps {
	onSelect: (prompt: string) => void;
	hasLocation: boolean;
	hasUpcomingPass: boolean;
}

export function SuggestedPrompts({
	onSelect,
	hasLocation,
	hasUpcomingPass,
}: SuggestedPromptsProps) {
	const labelId = useId();
	const prompts = getSuggestedPrompts({
		hasLocation,
		hasUpcomingPass,
	});

	if (prompts.length === 0) {
		return null;
	}

	return (
		<div className="p-4 border-b border-matrix-dim">
			<div className="text-xs text-matrix-dim mb-2" id={labelId}>
				SUGGESTED QUESTIONS
			</div>
			<fieldset
				className="flex flex-wrap gap-2 border-0 p-0"
				aria-labelledby={labelId}
			>
				{prompts.map((prompt) => (
					<button
						key={prompt.id}
						type="button"
						onClick={() => onSelect(prompt.text)}
						aria-label={`Ask: ${prompt.text}`}
						className="bg-matrix-dark border border-matrix-dim text-matrix-text text-xs px-3 py-1 rounded hover:bg-matrix-dim hover:border-matrix-text transition-colors"
					>
						{prompt.text}
					</button>
				))}
			</fieldset>
		</div>
	);
}
