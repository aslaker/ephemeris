/**
 * ThinkingIndicator Component
 *
 * Displays animated hopping dots while waiting for Copilot response.
 * Feature: 007-observation-copilot
 */

export function ThinkingIndicator() {
	return (
		<div className="flex items-center gap-2 px-4 py-3 text-matrix-dim">
			<div className="flex items-center gap-1">
				<span
					className="w-2 h-2 bg-matrix-text rounded-full animate-hopping-dot"
					style={{ animationDelay: "0ms" }}
				/>
				<span
					className="w-2 h-2 bg-matrix-text rounded-full animate-hopping-dot"
					style={{ animationDelay: "150ms" }}
				/>
				<span
					className="w-2 h-2 bg-matrix-text rounded-full animate-hopping-dot"
					style={{ animationDelay: "300ms" }}
				/>
			</div>
			<span className="text-xs uppercase tracking-wider">Processing...</span>
		</div>
	);
}
