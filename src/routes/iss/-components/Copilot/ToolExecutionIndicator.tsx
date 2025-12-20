/**
 * ToolExecutionIndicator Component
 *
 * Shows when tools are being executed.
 * Feature: 007-observation-copilot
 */

import type { ToolCall } from "@/lib/copilot/types";

interface ToolExecutionIndicatorProps {
	toolCalls: ToolCall[];
}

export function ToolExecutionIndicator({
	toolCalls,
}: ToolExecutionIndicatorProps) {
	const pendingTools = toolCalls.filter((tc) => tc.status === "pending");

	if (pendingTools.length === 0) {
		return null;
	}

	return (
		<div className="bg-matrix-dark border border-matrix-dim p-2 rounded text-xs text-matrix-text mb-2">
			<div className="flex items-center gap-2">
				<div className="w-2 h-2 bg-matrix-text rounded-full animate-pulse" />
				<span className="font-mono">
					Executing {pendingTools.length} tool
					{pendingTools.length > 1 ? "s" : ""}...
				</span>
			</div>
			<div className="mt-1 text-matrix-dim">
				{pendingTools.map((tool) => (
					<div key={tool.id} className="ml-4">
						• {tool.name}
					</div>
				))}
			</div>
		</div>
	);
}
