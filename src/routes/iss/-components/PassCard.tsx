/**
 * PassCard Component
 *
 * Displays a single ISS pass with date, time, elevation, and briefing trigger.
 */

import { ChevronDown, ChevronUp, Clock, Gauge, Sparkles } from "lucide-react";
import { useState } from "react";
import { getBriefingByPassId } from "@/lib/briefing/collection";
import { derivePassQuality } from "@/lib/briefing/types";
import type { PassPrediction } from "@/lib/iss/types";
import { BriefingCard } from "./BriefingCard";
import { BriefingErrorBoundary } from "./BriefingErrorBoundary";

// =============================================================================
// TYPES
// =============================================================================

interface PassCardProps {
	pass: PassPrediction;
	className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get quality color based on pass quality
 */
function getQualityColor(quality: string): string {
	switch (quality) {
		case "excellent":
			return "text-green-400";
		case "good":
			return "text-yellow-400";
		case "fair":
			return "text-orange-400";
		default:
			return "text-matrix-dim";
	}
}

/**
 * Format time for display
 */
function formatTime(date: Date): string {
	return date.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
	return date.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
	});
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * PassCard - Expandable card showing pass details with briefing option
 */
export function PassCard({ pass, className = "" }: PassCardProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	// Auto-show briefing if one already exists for this pass
	const [showBriefing, setShowBriefing] = useState(
		() => !!getBriefingByPassId(pass.id),
	);

	const quality = derivePassQuality(pass.maxElevation);
	const qualityColor = getQualityColor(quality);

	/**
	 * Handle keyboard navigation
	 */
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			setIsExpanded(!isExpanded);
		} else if (e.key === "Escape" && isExpanded) {
			setIsExpanded(false);
		}
	};

	return (
		<article
			className={`bg-black/90 border border-matrix-dim backdrop-blur-sm transition-all ${
				isExpanded ? "border-matrix-text" : "hover:border-matrix-dim/80"
			} ${className}`}
			aria-label={`ISS pass on ${formatDate(pass.startTime)} at ${formatTime(pass.startTime)}`}
		>
			{/* Main Row - Always visible */}
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				onKeyDown={handleKeyDown}
				className="w-full p-3 text-left focus:outline-none focus:ring-1 focus:ring-matrix-text"
				aria-expanded={isExpanded}
				aria-controls={`pass-details-${pass.id}`}
			>
				<div className="flex items-center justify-between">
					{/* Left: Date and Time */}
					<div className="flex items-center gap-4">
						<div>
							<p className="text-xs text-matrix-text font-bold">
								{formatDate(pass.startTime)}
							</p>
							<p className="text-[10px] text-matrix-dim font-mono">
								{formatTime(pass.startTime)}
							</p>
						</div>

						{/* Duration */}
						<div className="flex items-center gap-1 text-[10px] text-matrix-dim">
							<Clock className="w-3 h-3" />
							<span>{Math.round(pass.duration)}m</span>
						</div>
					</div>

					{/* Right: Elevation and Quality */}
					<div className="flex items-center gap-4">
						<div className="text-right">
							<div className="flex items-center gap-1">
								<Gauge className="w-3 h-3 text-matrix-dim" />
								<span className="text-xs text-matrix-text">
									{Math.round(pass.maxElevation)}°
								</span>
							</div>
							<p className={`text-[10px] uppercase ${qualityColor}`}>
								{quality}
							</p>
						</div>

						{/* Expand indicator */}
						{isExpanded ? (
							<ChevronUp className="w-4 h-4 text-matrix-dim" />
						) : (
							<ChevronDown className="w-4 h-4 text-matrix-dim" />
						)}
					</div>
				</div>
			</button>

			{/* Expanded Content */}
			{isExpanded && (
				<div
					id={`pass-details-${pass.id}`}
					className="border-t border-matrix-dim/50 p-3 space-y-3"
				>
					{/* Pass Details */}
					<div className="grid grid-cols-3 gap-2 text-[10px]">
						<div>
							<span className="text-matrix-dim uppercase block">Start</span>
							<span className="text-matrix-text">
								{formatTime(pass.startTime)}
							</span>
						</div>
						<div>
							<span className="text-matrix-dim uppercase block">End</span>
							<span className="text-matrix-text">
								{formatTime(pass.endTime)}
							</span>
						</div>
						<div>
							<span className="text-matrix-dim uppercase block">Pass ID</span>
							<span className="text-matrix-dim font-mono text-[9px]">
								{pass.id.slice(0, 15)}...
							</span>
						</div>
					</div>

					{/* Generate Briefing Button */}
					{!showBriefing ? (
						<button
							type="button"
							onClick={() => setShowBriefing(true)}
							className="w-full border border-matrix-text text-matrix-text hover:bg-matrix-text hover:text-black px-4 py-2 text-xs uppercase font-bold transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-1 focus:ring-matrix-text"
							aria-label={`Generate AI briefing for pass on ${formatDate(pass.startTime)}`}
						>
							<Sparkles className="w-3 h-3" aria-hidden="true" />
							Generate AI Briefing
						</button>
					) : (
						<BriefingErrorBoundary pass={pass}>
							<BriefingCard
								pass={pass}
								onClose={() => setShowBriefing(false)}
							/>
						</BriefingErrorBoundary>
					)}
				</div>
			)}
		</article>
	);
}
