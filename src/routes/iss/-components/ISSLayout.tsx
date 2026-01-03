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
import {
	runMigration,
	isMigrationComplete,
	type MigrationResult,
} from "@/lib/iss/migrations/dexie-to-tanstack";
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
 *
 * On first load, runs data migration from legacy Dexie tables to TanStack DB collections
 * to preserve existing user data during the migration to the new data layer.
 */
export const ISSLayout = ({ children }: ISSLayoutProps) => {
	// Current route location for active link styling
	const location = useLocation();

	// Audio mute state
	const [isMuted, setIsMuted] = useState(terminalAudio.isMuted);

	// Error boundary state
	const [hasError, setHasError] = useState(false);

	// Migration state
	const [isMigrating, setIsMigrating] = useState(false);
	const [migrationError, setMigrationError] = useState<string | null>(null);

	// Run migration check on mount, then start sync manager
	useEffect(() => {
		let syncManager: ReturnType<typeof getDefaultSyncManager> | null = null;

		async function initializeDataLayer() {
			try {
				// Check if migration is needed
				if (!isMigrationComplete()) {
					setIsMigrating(true);

					// Run migration
					const result: MigrationResult = await runMigration();

					if (!result.success) {
						// Migration failed but don't block app - just log error
						console.error("[ISSLayout] Migration failed:", result.error);
						setMigrationError(
							result.error || "Data migration encountered errors",
						);
					} else {
						// Log successful migration
						console.log(
							"[ISSLayout] Migration completed successfully:",
							result.positions.inserted,
							"positions,",
							result.crew.inserted,
							"crew,",
							result.tle.inserted,
							"TLE,",
							result.briefings.inserted,
							"briefings",
						);
					}

					setIsMigrating(false);
				}

				// Start sync manager after migration completes (or if not needed)
				syncManager = getDefaultSyncManager();
				syncManager.start();
			} catch (error) {
				console.error("[ISSLayout] Failed to initialize data layer:", error);
				setMigrationError(
					error instanceof Error ? error.message : "Unknown error",
				);
				setIsMigrating(false);

				// Still start sync manager even if migration fails
				syncManager = getDefaultSyncManager();
				syncManager.start();
			}
		}

		initializeDataLayer();

		// Cleanup on unmount
		return () => {
			if (syncManager) {
				syncManager.stop();
			}
		};
	}, []);

	const toggleMute = () => {
		const newMuted = terminalAudio.toggleMute();
		setIsMuted(newMuted);
	};

	// Migration progress state
	if (isMigrating) {
		return (
			<div className="iss-theme h-screen overflow-hidden bg-matrix-bg text-matrix-text flex items-center justify-center">
				<div className="text-center p-8 border border-matrix-text">
					<Satellite className="w-16 h-16 text-matrix-text mx-auto mb-4 animate-pulse" />
					<h1 className="text-2xl font-bold mb-2">INITIALIZING_DATA_LAYER</h1>
					<p className="text-matrix-dim mb-4">
						{"// MIGRATING_CACHED_DATA_TO_NEW_STORAGE"}
					</p>
					<div className="text-sm text-matrix-dim animate-pulse">
						PLEASE_WAIT...
					</div>
				</div>
			</div>
		);
	}

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

			{/* Migration error banner (non-blocking) */}
			{migrationError && (
				<div className="bg-matrix-alert/10 border-b border-matrix-alert px-4 py-2 text-xs">
					<div className="flex items-center gap-2">
						<AlertTriangle className="w-3 h-3 text-matrix-alert" />
						<span className="text-matrix-alert">
							DATA_MIGRATION_WARNING: {migrationError}
						</span>
						<span className="text-matrix-dim ml-auto">
							{"// APP_WILL_CONTINUE_NORMALLY"}
						</span>
					</div>
				</div>
			)}

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
