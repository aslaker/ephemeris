import { createFileRoute } from "@tanstack/react-router";
import { Calculator, Minimize, RotateCw } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { GlobeMethods } from "react-globe.gl";
import {
	useISSPosition,
	useISSTLE,
	useStorageCleanup,
	useWindowFocusRefetch,
} from "@/hooks/iss/useISSData";
import { useLocation } from "@/hooks/useLocation";
import { useNextPass } from "@/hooks/useNextPass";
import { terminalAudio } from "@/lib/iss/audio";
import { calculateOrbitPath } from "@/lib/iss/orbital";
import { FlyoverControl } from "./-components/FlyoverControl";
import { ISSLayout } from "./-components/ISSLayout";
import { OrbitalSolver } from "./-components/OrbitalSolver";
import { StatsPanel } from "./-components/StatsPanel";

// Lazy load the Globe component (large bundle with three.js)
const Globe = lazy(() => import("react-globe.gl"));

export const Route = createFileRoute("/iss/")({
	head: () => ({
		meta: [
			{
				title: "Live ISS Tracker - Ephemeris",
			},
			{
				name: "description",
				content:
					"Real-time International Space Station tracking with 3D globe visualization, orbital paths, and live telemetry data.",
			},
			{
				property: "og:title",
				content: "Live ISS Tracker - Ephemeris",
			},
			{
				property: "og:description",
				content:
					"Real-time International Space Station tracking with 3D globe visualization, orbital paths, and live telemetry data.",
			},
			{
				property: "og:url",
				content: "https://ephemeris.observer/iss",
			},
			{
				name: "twitter:url",
				content: "https://ephemeris.observer/iss",
			},
			{
				name: "twitter:title",
				content: "Live ISS Tracker - Ephemeris",
			},
			{
				name: "twitter:description",
				content:
					"Real-time International Space Station tracking with 3D globe visualization, orbital paths, and live telemetry data.",
			},
		],
		links: [
			{
				rel: "canonical",
				href: "https://ephemeris.observer/iss",
			},
		],
	}),
	component: ISSIndexPage,
});

function ISSIndexPage() {
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	if (!isClient) {
		return (
			<ISSLayout>
				<div className="w-full h-full flex items-center justify-center bg-black">
					<div className="text-matrix-text animate-pulse">
						INITIALIZING_RENDERER...
					</div>
				</div>
			</ISSLayout>
		);
	}

	return (
		<ISSLayout>
			<ISSTracker />
		</ISSLayout>
	);
}

function ISSTracker() {
	const globeEl = useRef<GlobeMethods | undefined>(undefined);
	const containerRef = useRef<HTMLDivElement>(null);
	const [globeReady, setGlobeReady] = useState(false);
	const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
	const [showOrbitalSolver, setShowOrbitalSolver] = useState(false);

	// Location from shared store and next pass prediction
	const { coordinates: userLocation } = useLocation();
	const { nextPass } = useNextPass();

	// Live ISS Position with cache-first loading
	const { data, isLoading, error, fromCache } = useISSPosition();
	const isError = !!error;

	// TLE Data for orbital path calculations with cache-first loading
	const { data: tleData } = useISSTLE();

	// Initialize storage cleanup scheduler and window focus refetch
	useStorageCleanup();
	useWindowFocusRefetch();

	// Handle window resize with delayed initial measurement
	useEffect(() => {
		const handleResize = () => {
			if (containerRef.current) {
				setDimensions({
					width: containerRef.current.clientWidth,
					height: containerRef.current.clientHeight,
				});
			}
		};

		// Initial measurement
		handleResize();

		// Delayed measurement to catch layout shifts
		const timeoutId = setTimeout(handleResize, 100);
		const timeoutId2 = setTimeout(handleResize, 500);

		window.addEventListener("resize", handleResize);
		return () => {
			window.removeEventListener("resize", handleResize);
			clearTimeout(timeoutId);
			clearTimeout(timeoutId2);
		};
	}, []);

	// Center globe on ISS when data updates
	useEffect(() => {
		if (
			data &&
			globeEl.current &&
			typeof data.latitude === "number" &&
			!Number.isNaN(data.latitude) &&
			typeof data.longitude === "number" &&
			!Number.isNaN(data.longitude)
		) {
			globeEl.current.pointOfView(
				{
					lat: data.latitude,
					lng: data.longitude,
					altitude: 1.8,
				},
				1000,
			);
		}
	}, [data]);

	// Calculate orbital paths from TLE data
	const { historyPath, predictedPath } = useMemo(() => {
		if (!tleData || !Array.isArray(tleData) || tleData.length < 2) {
			return { historyPath: [], predictedPath: [] };
		}

		const hist = calculateOrbitPath(tleData[0], tleData[1], -45, 0);
		const pred = calculateOrbitPath(tleData[0], tleData[1], 0, 60);

		return {
			historyPath: hist.length > 0 ? hist : [],
			predictedPath: pred.length > 0 ? pred : [],
		};
	}, [tleData]);

	// Consolidate paths for globe (including flyover arc if available)
	const globePathsData = useMemo(() => {
		const paths = [];
		if (historyPath.length > 1) paths.push(historyPath);
		if (predictedPath.length > 1) paths.push(predictedPath);

		if (nextPass?.path && nextPass.path.length > 1) {
			paths.push(nextPass.path);
		}
		return paths;
	}, [historyPath, predictedPath, nextPass]);

	// Points data: ISS + User Location
	const gData = useMemo(() => {
		const points = [];

		// ISS position
		if (
			data &&
			typeof data.latitude === "number" &&
			!Number.isNaN(data.latitude) &&
			typeof data.longitude === "number" &&
			!Number.isNaN(data.longitude)
		) {
			points.push({
				lat: data.latitude,
				lng: data.longitude,
				alt: 0.1,
				radius: 1.5,
				color: "#00FF41",
				label: "ISS",
			});
		}

		// User location
		if (userLocation) {
			points.push({
				lat: userLocation.lat,
				lng: userLocation.lng,
				alt: 0.02,
				radius: 0.8,
				color: "#FFD700",
				label: "USER",
			});
		}

		return points;
	}, [data, userLocation]);

	// Rings data (pulsing markers)
	const ringsData = useMemo(() => {
		const rings = [];

		if (data && !Number.isNaN(data.latitude)) {
			rings.push({
				lat: data.latitude,
				lng: data.longitude,
				alt: 0.1,
				maxR: 8,
				propagationSpeed: 4,
				repeatPeriod: 1000,
				color: "#00FF41",
			});
		}

		if (userLocation) {
			rings.push({
				lat: userLocation.lat,
				lng: userLocation.lng,
				alt: 0.02,
				maxR: 5,
				propagationSpeed: 2,
				repeatPeriod: 2000,
				color: "#FFD700",
			});
		}

		return rings;
	}, [data, userLocation]);

	const handleTrackISS = () => {
		terminalAudio.playClick();
		if (data && !Number.isNaN(data.latitude) && !Number.isNaN(data.longitude)) {
			globeEl.current?.pointOfView(
				{ lat: data.latitude, lng: data.longitude, altitude: 1.8 },
				1000,
			);
		}
	};

	const handleResetCamera = () => {
		terminalAudio.playClick();
		globeEl.current?.pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 1000);
	};

	const handleToggleOrbitalSolver = () => {
		terminalAudio.playClick();
		setShowOrbitalSolver(!showOrbitalSolver);
	};

	return (
		<div className="flex flex-col md:flex-row h-full w-full relative">
			{/* Globe Container */}
			<div
				ref={containerRef}
				className="flex-1 relative bg-black overflow-hidden border-r border-matrix-dim"
			>
				{/* HUD Controls */}
				<div className="absolute top-4 left-4 z-10 flex gap-2">
					<button
						type="button"
						onClick={handleTrackISS}
						onMouseEnter={() => terminalAudio.playHover()}
						className="bg-matrix-dark/80 border border-matrix-dim text-matrix-text p-2 hover:bg-matrix-dim/20 transition group"
						title="Track ISS"
					>
						<Minimize className="w-4 h-4 group-hover:scale-110 transition-transform" />
					</button>
					<button
						type="button"
						onClick={handleResetCamera}
						onMouseEnter={() => terminalAudio.playHover()}
						className="bg-matrix-dark/80 border border-matrix-dim text-matrix-text p-2 hover:bg-matrix-dim/20 transition group"
						title="Reset Camera"
					>
						<RotateCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
					</button>
					<button
						type="button"
						onClick={handleToggleOrbitalSolver}
						onMouseEnter={() => terminalAudio.playHover()}
						className={`bg-matrix-dark/80 border text-matrix-text p-2 hover:bg-matrix-dim/20 transition group flex items-center gap-2 ${
							showOrbitalSolver
								? "border-matrix-text shadow-[0_0_10px_rgba(0,255,65,0.3)]"
								: "border-matrix-dim"
						}`}
						title="Orbital Parameters"
					>
						<Calculator className="w-4 h-4" />
						<span className="text-xs font-bold hidden md:inline">
							ORBIT_DATA
						</span>
					</button>
				</div>

				{/* Orbital Solver Modal */}
				{showOrbitalSolver && (
					<OrbitalSolver
						onClose={() => {
							terminalAudio.playClick();
							setShowOrbitalSolver(false);
						}}
					/>
				)}

				{/* Flyover Control Panel */}
				<FlyoverControl />

				{/* Path Legend */}
				{predictedPath.length > 0 && (
					<div className="absolute top-4 right-4 z-10 pointer-events-none">
						<div className="flex flex-col items-end gap-1">
							<div className="flex items-center gap-2 text-[10px] text-matrix-dim bg-black/50 p-1 border border-matrix-dim/30">
								<span className="w-3 h-0.5 bg-[#00FF41] opacity-50 border-t border-b border-black" />
								<span>ORBITAL_PATH (TLE_PROJECTION)</span>
							</div>
							{nextPass && (
								<div className="flex items-center gap-2 text-[10px] text-yellow-500 bg-black/50 p-1 border border-yellow-900/50">
									<span className="w-3 h-0.5 bg-yellow-500 border-t border-b border-black" />
									<span>FLYOVER_ARC</span>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Loading State */}
				{isLoading && !globeReady && (
					<div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
						<div className="text-matrix-text animate-pulse font-mono text-xl">
							INITIALIZING TERRAIN GENERATION...
						</div>
					</div>
				)}

				{/* Error State */}
				{isError && (
					<div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
						<div className="bg-matrix-dark border border-matrix-alert text-matrix-alert p-4 rounded animate-pulse">
							{"SIGNAL_LOST // RETRYING"}
						</div>
					</div>
				)}

				{/* Globe */}
				<Suspense
					fallback={
						<div className="w-full h-full flex items-center justify-center bg-black">
							<div className="text-matrix-text animate-pulse">
								LOADING_GLOBE_RENDERER...
							</div>
						</div>
					}
				>
					<Globe
						ref={globeEl}
						width={dimensions.width}
						height={dimensions.height}
						globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
						backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
						atmosphereColor="#00FF41"
						atmosphereAltitude={0.15}
						pointsData={gData}
						pointAltitude="alt"
						pointColor="color"
						pointRadius="radius"
						ringsData={ringsData}
						ringColor="color"
						ringMaxRadius="maxR"
						ringPropagationSpeed="propagationSpeed"
						ringRepeatPeriod="repeatPeriod"
						pathsData={globePathsData}
						pathPointLat={(p: { lat: number }) => p.lat}
						pathPointLng={(p: { lng: number }) => p.lng}
						pathPointAlt={() => 0.1}
						pathColor={(path: unknown) => {
							if (path === nextPass?.path) return "#FFD700";
							if (path === predictedPath) return "rgba(0, 255, 65, 0.5)";
							return "#00FF41";
						}}
						pathDashLength={(path: unknown) =>
							path === predictedPath ? 0.5 : 0.05
						}
						pathDashGap={(path: unknown) => (path === predictedPath ? 0.2 : 0)}
						pathDashAnimateTime={(path: unknown) =>
							path === predictedPath ? 0 : 20000
						}
						pathResolution={2}
						onGlobeReady={() => setGlobeReady(true)}
					/>
				</Suspense>

				{/* Vignette overlay */}
				<div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#000000_120%)]" />
			</div>

			{/* Stats Panel Sidebar */}
			<div className="w-full md:w-56 lg:w-72 xl:w-80 flex-none flex flex-col h-[35vh] md:h-auto border-t md:border-t-0 border-matrix-dim overflow-y-auto custom-scrollbar bg-matrix-bg">
				<StatsPanel />
			</div>
		</div>
	);
}
