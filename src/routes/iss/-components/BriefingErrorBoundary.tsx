/**
 * BriefingErrorBoundary Component
 *
 * Error boundary wrapper for BriefingCard with graceful degradation fallback.
 * Shows fallback pass data when AI briefing generation fails.
 */

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import type { PassPrediction } from "@/lib/iss/types";

// =============================================================================
// TYPES
// =============================================================================

interface BriefingErrorBoundaryProps {
	children: ReactNode;
	pass: PassPrediction;
	onRetry?: () => void;
}

interface BriefingErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

// =============================================================================
// FALLBACK COMPONENT
// =============================================================================

/**
 * Fallback display when briefing fails - shows raw pass data
 */
function BriefingFallback({
	pass,
	error,
	onRetry,
}: {
	pass: PassPrediction;
	error: Error | null;
	onRetry?: () => void;
}) {
	const formatTime = (date: Date) =>
		date.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		});

	const formatDate = (date: Date) =>
		date.toLocaleDateString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
		});

	return (
		<article
			className="bg-black/90 border border-matrix-alert/50 p-4 backdrop-blur-sm"
			role="alert"
			aria-label="Pass information (briefing unavailable)"
		>
			{/* Header */}
			<div className="flex items-center justify-between mb-3 border-b border-matrix-dim/50 pb-2">
				<div className="flex items-center gap-2 text-matrix-alert">
					<AlertTriangle className="w-4 h-4" />
					<span className="text-xs font-bold uppercase tracking-wider">
						Briefing_Unavailable
					</span>
				</div>
			</div>

			{/* Error message */}
			<p className="text-[10px] text-matrix-dim mb-4">
				{error?.message ||
					"Unable to display AI briefing. Showing raw pass data."}
			</p>

			{/* Fallback pass data */}
			<div className="bg-matrix-dark/30 border border-matrix-dim/30 p-3 mb-4">
				<h3 className="text-xs text-matrix-text font-bold mb-2 uppercase">
					Pass Data
				</h3>
				<div className="grid grid-cols-2 gap-2 text-[10px]">
					<div>
						<span className="text-matrix-dim block">Date</span>
						<span className="text-matrix-text">
							{formatDate(pass.startTime)}
						</span>
					</div>
					<div>
						<span className="text-matrix-dim block">Time</span>
						<span className="text-matrix-text">
							{formatTime(pass.startTime)}
						</span>
					</div>
					<div>
						<span className="text-matrix-dim block">Duration</span>
						<span className="text-matrix-text">
							{Math.round(pass.duration)} minutes
						</span>
					</div>
					<div>
						<span className="text-matrix-dim block">Max Elevation</span>
						<span className="text-matrix-text">
							{Math.round(pass.maxElevation)}°
						</span>
					</div>
				</div>
			</div>

			{/* Retry button */}
			{onRetry && (
				<button
					type="button"
					onClick={onRetry}
					className="border border-matrix-text text-matrix-text hover:bg-matrix-text hover:text-black px-4 py-2 text-xs uppercase font-bold transition-colors flex items-center gap-2"
				>
					<RefreshCw className="w-3 h-3" />
					Retry
				</button>
			)}
		</article>
	);
}

// =============================================================================
// ERROR BOUNDARY
// =============================================================================

/**
 * Error boundary for BriefingCard - catches errors and shows fallback
 */
export class BriefingErrorBoundary extends Component<
	BriefingErrorBoundaryProps,
	BriefingErrorBoundaryState
> {
	constructor(props: BriefingErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): BriefingErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error("BriefingCard error:", error, errorInfo);
	}

	handleRetry = () => {
		this.setState({ hasError: false, error: null });
		this.props.onRetry?.();
	};

	render() {
		if (this.state.hasError) {
			return (
				<BriefingFallback
					pass={this.props.pass}
					error={this.state.error}
					onRetry={this.handleRetry}
				/>
			);
		}

		return this.props.children;
	}
}
