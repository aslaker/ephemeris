import { Link, useLocation } from "@tanstack/react-router";
import {
	AlertTriangle,
	Calendar,
	Map as MapIcon,
	MessageSquare,
	Satellite,
	Users,
	Volume2,
	VolumeX,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { terminalAudio } from "@/lib/iss/audio";
import { getDefaultSyncManager } from "@/lib/iss/sync";
import { ScanlineOverlay } from "./ScanlineOverlay";

// =============================================================================
// ISS LAYOUT COMPONENT
// =============================================================================

interface ISSLayoutProps {
	children: ReactNode;
}

/**
 * ISSLayout - Wrapper component with Matrix theme and header navigation
 *
 * Location state has been moved to TanStack Store (@/lib/location/store.ts)
 * Components should use useLocation and useNextPass hooks directly.
 *
 * Initializes the TanStack DB sync manager for background data synchronization:
 * - Position data syncs every 5 seconds
 * - Crew data syncs every 1 hour
 * - TLE data syncs every 1 hour
 * - Automatically pauses when tab is hidden to save resources
 */
export const ISSLayout = ({ children }: ISSLayoutProps) => {
	// Current route location for active link styling
	const location = useLocation();

	// Audio mute state
	const [isMuted, setIsMuted] = useState(terminalAudio.isMuted);

	// Error boundary state
	const [hasError, setHasError] = useState(false);

	// Initialize sync manager for background data synchronization
	useEffect(() => {
		const syncManager = getDefaultSyncManager();
		syncManager.start();

		// Cleanup on unmount
		return () => {
			syncManager.stop();
		};
	}, []);

	const toggleMute = () => {
		const newMuted = terminalAudio.toggleMute();
		setIsMuted(newMuted);
	};

	// Error state
	if (hasError) {
		return (
			<div className="iss-theme h-screen overflow-hidden bg-matrix-bg text-matrix-text flex items-center justify-center">
				<div className="text-center p-8 border border-matrix-alert">
					<AlertTriangle className="w-16 h-16 text-matrix-alert mx-auto mb-4 animate-pulse" />
					<h1 className="text-2xl font-bold mb-2">SIGNAL_LOST</h1>
					<p className="text-matrix-dim mb-4">{"// CONNECTION_TERMINATED"}</p>
					<button
						type="button"
						onClick={() => setHasError(false)}
						className="border border-matrix-text text-matrix-text px-4 py-2 hover:bg-matrix-text hover:text-black transition-colors"
					>
						RETRY_CONNECTION
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="iss-theme h-screen overflow-hidden bg-matrix-bg text-matrix-text flex flex-col relative">
			{/* Scanline overlay */}
			<ScanlineOverlay visible />

			{/* Header */}
			<header className="border-b border-matrix-dim bg-matrix-dark/80 backdrop-blur-sm">
				<div className="flex items-center justify-between px-4 py-2">
					{/* Logo / Title */}
					<div className="flex items-center gap-3">
						<Satellite className="w-5 h-5 text-matrix-text animate-pulse" />
						<span className="font-bold tracking-wider text-sm uppercase">
							ISS_TRACKER
						</span>
						<span className="text-[10px] text-matrix-dim hidden sm:inline">
							{"// ORBITAL_TELEMETRY_SYSTEM"}
						</span>
					</div>

					{/* Navigation */}
					<nav className="flex items-center gap-1">
						<Link
							to="/iss"
							className={`px-3 py-1 text-xs uppercase border transition-colors hover:border-matrix-dim ${
								location.pathname === "/iss" || location.pathname === "/iss/"
									? "border-matrix-text text-matrix-text"
									: "border-transparent"
							}`}
						>
							Globe
						</Link>
						<Link
							to="/iss/map"
							className={`px-3 py-1 text-xs uppercase border transition-colors hover:border-matrix-dim ${
								location.pathname === "/iss/map"
									? "border-matrix-text text-matrix-text"
									: "border-transparent"
							}`}
						>
							<MapIcon className="w-3 h-3 inline mr-1" />
							Map
						</Link>
						<Link
							to="/iss/crew"
							className={`px-3 py-1 text-xs uppercase border transition-colors hover:border-matrix-dim ${
								location.pathname === "/iss/crew"
									? "border-matrix-text text-matrix-text"
									: "border-transparent"
							}`}
						>
							<Users className="w-3 h-3 inline mr-1" />
							Crew
						</Link>
						<Link
							to="/iss/passes"
							className={`px-3 py-1 text-xs uppercase border transition-colors hover:border-matrix-dim ${
								location.pathname === "/iss/passes"
									? "border-matrix-text text-matrix-text"
									: "border-transparent"
							}`}
						>
							<Calendar className="w-3 h-3 inline mr-1" />
							Passes
						</Link>
						<a
							href="/iss/copilot"
							className={`px-3 py-1 text-xs uppercase border transition-colors hover:border-matrix-dim ${
								location.pathname === "/iss/copilot"
									? "border-matrix-text text-matrix-text"
									: "border-transparent"
							}`}
						>
							<MessageSquare className="w-3 h-3 inline mr-1" />
							Copilot
						</a>

						{/* Mute Toggle */}
						<button
							type="button"
							onClick={toggleMute}
							className="ml-2 p-1 text-matrix-dim hover:text-matrix-text transition-colors"
							title={isMuted ? "Unmute" : "Mute"}
						>
							{isMuted ? (
								<VolumeX className="w-4 h-4" />
							) : (
								<Volume2 className="w-4 h-4" />
							)}
						</button>
					</nav>
				</div>
			</header>

			{/* Main Content */}
			<main className="flex-1 min-h-0 overflow-hidden">{children}</main>

			{/* Footer */}
			<footer className="border-t border-matrix-dim bg-matrix-dark/50 px-4 py-1">
				<div className="flex justify-between items-center text-[9px] text-matrix-dim uppercase">
					<span>{"EPHEMERIS // ISS_MODULE v1.0"}</span>
					<span>SECURE_LINK: ESTABLISHED</span>
				</div>
			</footer>
		</div>
	);
};
