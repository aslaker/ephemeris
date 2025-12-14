import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import {
	AlertTriangle,
	Map as MapIcon,
	Satellite,
	Users,
	Volume2,
	VolumeX,
} from "lucide-react";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import { terminalAudio } from "@/lib/iss/audio";
import { predictNextPass } from "@/lib/iss/orbital";
import { issQueries } from "@/lib/iss/queries";
import type {
	LatLng,
	LocationContextType,
	PassPrediction,
} from "@/lib/iss/types";
import { ScanlineOverlay } from "./ScanlineOverlay";

// =============================================================================
// LOCATION CONTEXT
// =============================================================================

const LocationContext = createContext<LocationContextType | undefined>(
	undefined,
);

export const useLocationContext = () => {
	const context = useContext(LocationContext);
	if (!context) {
		throw new Error("useLocationContext must be used within ISSLayout");
	}
	return context;
};

// =============================================================================
// ISS LAYOUT COMPONENT
// =============================================================================

interface ISSLayoutProps {
	children: ReactNode;
}

/**
 * ISSLayout - Wrapper component with Matrix theme, header navigation, and LocationContext
 */
export const ISSLayout = ({ children }: ISSLayoutProps) => {
	// Current location for active link styling
	const location = useLocation();

	// Audio mute state
	const [isMuted, setIsMuted] = useState(terminalAudio.isMuted);

	// Location context state
	const [userLocation, setUserLocation] = useState<LatLng | null>(null);
	const [nextPass, setNextPass] = useState<PassPrediction | null>(null);
	const [isPredicting, setIsPredicting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Error boundary state
	const [hasError, setHasError] = useState(false);

	// TLE data for pass prediction
	const { data: tle } = useQuery(issQueries.tle());

	// Recalculate pass when location or TLE changes
	useEffect(() => {
		if (userLocation && tle && tle.length === 2) {
			setIsPredicting(true);
			const timeoutId = setTimeout(() => {
				try {
					const pass = predictNextPass(tle[0], tle[1], userLocation);
					setNextPass(pass);
				} catch (e) {
					console.error("Prediction failed:", e);
					setNextPass(null);
				} finally {
					setIsPredicting(false);
				}
			}, 500);

			return () => clearTimeout(timeoutId);
		}
	}, [userLocation, tle]);

	const requestLocation = async () => {
		setError(null);
		if (typeof navigator === "undefined" || !navigator.geolocation) {
			setError("GEOLOCATION_MODULE_MISSING");
			return;
		}

		try {
			const position = await new Promise<GeolocationPosition>(
				(resolve, reject) => {
					navigator.geolocation.getCurrentPosition(resolve, reject, {
						enableHighAccuracy: false,
						timeout: 10000,
					});
				},
			);

			setUserLocation({
				lat: position.coords.latitude,
				lng: position.coords.longitude,
			});
		} catch (err: unknown) {
			console.warn("Geolocation failed:", err);
			let errorMessage = "SIGNAL_INTERFERENCE";

			if (err && typeof err === "object" && "code" in err) {
				const geoError = err as GeolocationPositionError;
				if (geoError.code === 1) errorMessage = "PERMISSION_DENIED";
				else if (geoError.code === 2) errorMessage = "POSITION_UNAVAILABLE";
				else if (geoError.code === 3) errorMessage = "TIMEOUT";
			}

			setError(errorMessage);
		}
	};

	const manualLocation = (lat: number, lng: number) => {
		setError(null);
		setUserLocation({ lat, lng });
	};

	const toggleMute = () => {
		const newMuted = terminalAudio.toggleMute();
		setIsMuted(newMuted);
	};

	const locationContextValue: LocationContextType = {
		userLocation,
		nextPass,
		isPredicting,
		error,
		requestLocation,
		manualLocation,
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
		<LocationContext.Provider value={locationContextValue}>
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
		</LocationContext.Provider>
	);
};
