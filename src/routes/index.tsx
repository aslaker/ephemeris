import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Satellite, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { terminalAudio } from "@/lib/iss/audio";

// Storage key for initialization state
const ISS_INITIALIZED_KEY = "iss_tracker_initialized";

export const Route = createFileRoute("/")({ component: InitializePage });

function InitializePage() {
	const navigate = useNavigate();
	const [isAnimating, setIsAnimating] = useState(false);

	// Check if already initialized and redirect
	useEffect(() => {
		if (typeof window !== "undefined") {
			const isInitialized =
				localStorage.getItem(ISS_INITIALIZED_KEY) === "true";
			if (isInitialized) {
				navigate({ to: "/iss" });
			}
		}
	}, [navigate]);

	const handleInitialize = async () => {
		// Resume audio context (requires user gesture)
		await terminalAudio.resume();
		terminalAudio.playStartup();

		// Start CRT turn-on animation
		setIsAnimating(true);

		// After animation completes, mark as initialized and redirect
		setTimeout(() => {
			localStorage.setItem(ISS_INITIALIZED_KEY, "true");
			navigate({ to: "/iss" });
		}, 600);
	};

	return (
		<div
			className={`iss-theme h-screen overflow-hidden bg-matrix-bg text-matrix-text flex items-center justify-center ${
				isAnimating ? "crt-turn-on" : ""
			}`}
		>
			{isAnimating ? (
				<div className="w-full h-screen bg-matrix-text/20 animate-pulse" />
			) : (
				<div className="text-center p-8 max-w-md">
					{/* Logo */}
					<div className="mb-8">
						<Satellite className="w-20 h-20 text-matrix-text mx-auto mb-4 animate-pulse" />
						<h1 className="text-3xl font-bold tracking-widest mb-2">
							ISS_TRACKER
						</h1>
						<p className="text-matrix-dim text-sm">
							{"// ORBITAL_TELEMETRY_SYSTEM v1.0"}
						</p>
					</div>

					{/* Boot sequence text */}
					<div className="text-left font-mono text-[10px] text-matrix-dim mb-8 space-y-1 border border-matrix-dim/30 p-4 bg-matrix-dark/50">
						<p>&gt; SYSTEM_CHECK: COMPLETE</p>
						<p>&gt; NETWORK_LINK: STANDBY</p>
						<p>&gt; TLE_DATABASE: LOADED</p>
						<p>&gt; AUDIO_ENGINE: READY</p>
						<p>&gt; RENDERER: WebGL_2.0</p>
						<p className="text-matrix-text animate-pulse">
							&gt; AWAITING_USER_AUTHORIZATION...
						</p>
					</div>

					{/* Initialize button */}
					<button
						type="button"
						onClick={handleInitialize}
						onMouseEnter={() => terminalAudio.playHover()}
						className="group border-2 border-matrix-text text-matrix-text px-8 py-3 text-lg font-bold tracking-widest hover:bg-matrix-text hover:text-black transition-all duration-300 flex items-center justify-center gap-3 mx-auto"
					>
						<Zap className="w-5 h-5 group-hover:animate-pulse" />
						INITIALIZE_UPLINK
					</button>

					<p className="text-[9px] text-matrix-dim/50 mt-6 uppercase">
						Click to enable audio and start tracking
					</p>
				</div>
			)}
		</div>
	);
}
