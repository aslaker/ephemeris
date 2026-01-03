import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useISSPositionDB, useISSTLEDB } from "@/hooks/iss/useISSDataDB";
import { useLocation } from "@/hooks/useLocation";
import { useNextPass } from "@/hooks/useNextPass";
import { calculateOrbitPath } from "@/lib/iss/orbital";
import { FlyoverControl } from "./-components/FlyoverControl";
import { ISSLayout } from "./-components/ISSLayout";
import { StatsPanel } from "./-components/StatsPanel";

const MAP_IMAGE_URL =
	"https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg";

export const Route = createFileRoute("/iss/map")({
	head: () => ({
		meta: [
			{
				title: "ISS Orbital Map - Ephemeris",
			},
			{
				name: "description",
				content:
					"2D orbital map visualization of the International Space Station showing current position, orbital paths, and flyover predictions.",
			},
			{
				property: "og:title",
				content: "ISS Orbital Map - Ephemeris",
			},
			{
				property: "og:description",
				content:
					"2D orbital map visualization of the International Space Station showing current position, orbital paths, and flyover predictions.",
			},
			{
				property: "og:url",
				content: "https://ephemeris.observer/iss/map",
			},
			{
				name: "twitter:url",
				content: "https://ephemeris.observer/iss/map",
			},
			{
				name: "twitter:title",
				content: "ISS Orbital Map - Ephemeris",
			},
			{
				name: "twitter:description",
				content:
					"2D orbital map visualization of the International Space Station showing current position, orbital paths, and flyover predictions.",
			},
		],
		links: [
			{
				rel: "canonical",
				href: "https://ephemeris.observer/iss/map",
			},
		],
	}),
	component: MapPage,
});

function MapPage() {
	return (
		<ISSLayout>
			<MapView />
		</ISSLayout>
	);
}

/**
 * Convert lat/lng to SVG viewbox coordinates (0-100 range)
 */
const getXY = (lat: number | undefined, lon: number | undefined) => {
	if (
		lat === undefined ||
		lon === undefined ||
		typeof lat !== "number" ||
		typeof lon !== "number" ||
		Number.isNaN(lat) ||
		Number.isNaN(lon)
	) {
		return { x: -999, y: -999 };
	}
	const x = ((lon + 180) / 360) * 100;
	const y = ((90 - lat) / 180) * 100;
	return { x, y };
};

/**
 * Create path segments that handle anti-meridian crossing
 */
const createSafePathSegments = (points: { lat: number; lng: number }[]) => {
	if (!points || !Array.isArray(points) || points.length < 2) return [];

	const segments: string[] = [];
	let currentSegmentPoints: { x: number; y: number }[] = [];

	for (let i = 0; i < points.length; i++) {
		const curr = points[i];
		if (!curr) continue;

		const prev = i > 0 ? points[i - 1] : null;

		// Anti-meridian crossing check (>180° longitude jump)
		if (prev && Math.abs(curr.lng - prev.lng) > 180) {
			if (currentSegmentPoints.length > 1) {
				segments.push(
					currentSegmentPoints.map((p) => `${p.x},${p.y}`).join(" "),
				);
			}
			currentSegmentPoints = [];
		}

		const point = getXY(curr.lat, curr.lng);

		if (point.x !== -999 && point.y !== -999) {
			currentSegmentPoints.push(point);
		}
	}

	if (currentSegmentPoints.length > 1) {
		segments.push(currentSegmentPoints.map((p) => `${p.x},${p.y}`).join(" "));
	}
	return segments;
};

function MapView() {
	const { data } = useISSPositionDB();
	const { data: tleData } = useISSTLEDB();
	const { coordinates: userLocation } = useLocation();
	const { nextPass } = useNextPass();
	const [mapError, setMapError] = useState(false);

	// Calculate orbital path segments
	const { historySegments, predictedSegments } = useMemo(() => {
		if (!tleData) return { historySegments: [], predictedSegments: [] };

		const histPoints = calculateOrbitPath(tleData[0], tleData[1], -45, 0);
		const histSegments = createSafePathSegments(histPoints);

		const predPoints = calculateOrbitPath(tleData[0], tleData[1], 0, 90);
		const predSegments = createSafePathSegments(predPoints);

		return { historySegments: histSegments, predictedSegments: predSegments };
	}, [tleData]);

	// Flyover arc segments
	const passSegments = useMemo(() => {
		if (!nextPass?.path) return [];
		return createSafePathSegments(nextPass.path);
	}, [nextPass]);

	// Current ISS position
	const currentPos = useMemo(() => {
		if (
			data &&
			typeof data.latitude === "number" &&
			typeof data.longitude === "number" &&
			!Number.isNaN(data.latitude)
		) {
			return getXY(data.latitude, data.longitude);
		}
		return null;
	}, [data]);

	// User position
	const userPos = useMemo(() => {
		if (userLocation) {
			return getXY(userLocation.lat, userLocation.lng);
		}
		return null;
	}, [userLocation]);

	return (
		<div className="flex flex-col md:flex-row h-full w-full">
			{/* Map Container */}
			<div className="flex-1 bg-matrix-bg relative overflow-hidden border-r border-matrix-dim flex items-center justify-center p-4">
				{/* Flyover Control Panel */}
				<FlyoverControl />

				{/* Grid background */}
				<div
					className="absolute inset-0 z-0 pointer-events-none"
					style={{
						backgroundImage:
							"linear-gradient(rgba(0, 255, 65, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 65, 0.05) 1px, transparent 1px)",
						backgroundSize: "40px 40px",
					}}
				/>

				{/* Map viewport */}
				<div className="relative w-full max-w-6xl aspect-2/1 border border-matrix-dim bg-matrix-dark shadow-[0_0_20px_rgba(0,255,65,0.1)] overflow-hidden">
					{/* World map background */}
					{!mapError ? (
						<img
							src={MAP_IMAGE_URL}
							alt="World Map"
							onError={() => setMapError(true)}
							className="absolute inset-0 w-full h-full select-none pointer-events-none"
							style={{
								filter:
									"sepia(1) saturate(5) hue-rotate(70deg) brightness(0.6) contrast(1.2)",
								opacity: 0.4,
							}}
						/>
					) : (
						<div className="absolute inset-0 flex items-center justify-center">
							<div className="text-matrix-dim text-xs font-mono border border-matrix-dim p-4">
								{"[!] MAP_DATA_OFFLINE // RENDERING GRID_ONLY"}
							</div>
						</div>
					)}

					{/* SVG overlay */}
					<svg
						className="absolute inset-0 w-full h-full z-10"
						viewBox="0 0 100 100"
						preserveAspectRatio="none"
						role="img"
						aria-label="ISS orbital map visualization"
					>
						<title>ISS Orbital Map</title>
						{/* Predicted path (dashed) */}
						{predictedSegments.map((points) => (
							<polyline
								key={`pred-${points.slice(0, 20)}`}
								points={points}
								fill="none"
								stroke="#00FF41"
								strokeWidth="0.3"
								strokeDasharray="1 1"
								className="opacity-50"
							/>
						))}

						{/* History path (solid) */}
						{historySegments.map((points) => (
							<polyline
								key={`hist-${points.slice(0, 20)}`}
								points={points}
								fill="none"
								stroke="#00FF41"
								strokeWidth="0.5"
								className="opacity-90"
							/>
						))}

						{/* Flyover arc (gold) */}
						{passSegments.map((points) => (
							<polyline
								key={`pass-${points.slice(0, 20)}`}
								points={points}
								fill="none"
								stroke="#FFD700"
								strokeWidth="0.6"
								strokeLinecap="round"
								className="drop-shadow-[0_0_2px_#FFD700]"
							/>
						))}

						{/* User location reticle */}
						{userPos && userPos.x !== -999 && (
							<g transform={`translate(${userPos.x}, ${userPos.y})`}>
								<circle r="0.5" fill="#FFD700" />
								<line
									x1="-2"
									y1="0"
									x2="2"
									y2="0"
									stroke="#FFD700"
									strokeWidth="0.2"
								/>
								<line
									x1="0"
									y1="-2"
									x2="0"
									y2="2"
									stroke="#FFD700"
									strokeWidth="0.2"
								/>
								<circle
									r="2"
									fill="none"
									stroke="#FFD700"
									strokeWidth="0.1"
									strokeDasharray="0.5 0.5"
									className="animate-spin-slow"
								/>
							</g>
						)}

						{/* ISS marker */}
						{currentPos && currentPos.x !== -999 && (
							<g transform={`translate(${currentPos.x}, ${currentPos.y})`}>
								{/* Pulse ring */}
								<circle
									r="1.5"
									fill="none"
									stroke="#00FF41"
									strokeWidth="0.1"
									className="opacity-0"
								>
									<animate
										attributeName="r"
										from="0.5"
										to="4"
										dur="2s"
										repeatCount="indefinite"
									/>
									<animate
										attributeName="opacity"
										from="1"
										to="0"
										dur="2s"
										repeatCount="indefinite"
									/>
								</circle>
								{/* ISS dot */}
								<circle
									r="0.8"
									fill="#00FF41"
									className="drop-shadow-[0_0_4px_#00FF41]"
								/>
								{/* Crosshairs */}
								<line
									x1="-3"
									y1="0"
									x2="3"
									y2="0"
									stroke="#00FF41"
									strokeWidth="0.1"
									opacity="0.6"
								/>
								<line
									x1="0"
									y1="-3"
									x2="0"
									y2="3"
									stroke="#00FF41"
									strokeWidth="0.1"
									opacity="0.6"
								/>
								{/* Label */}
								<text
									x="1.5"
									y="-1.5"
									fontSize="2"
									fill="#00FF41"
									fontFamily="monospace"
									fontWeight="bold"
								>
									ISS
								</text>
							</g>
						)}
					</svg>

					{/* Position readout */}
					{data && (
						<div className="absolute top-2 right-2 font-mono text-[10px] text-matrix-text bg-black/80 p-1 border border-matrix-dim z-20">
							POS: {data.latitude?.toFixed(2)}, {data.longitude?.toFixed(2)}
						</div>
					)}

					{/* Flyover indicator */}
					{passSegments.length > 0 && (
						<div className="absolute bottom-2 left-2 font-mono text-[8px] text-yellow-500 z-20 bg-black/50 p-1 border border-yellow-900/50">
							-- -- FLYOVER ARC ACQUIRED
						</div>
					)}
				</div>

				{/* Corner decorations */}
				<div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-matrix-dim" />
				<div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-matrix-dim" />
				<div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-matrix-dim" />
				<div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-matrix-dim" />
			</div>

			{/* Stats Panel */}
			<div className="w-full md:w-56 lg:w-72 xl:w-80 flex-none h-[35vh] md:h-auto border-t md:border-t-0 border-matrix-dim overflow-y-auto custom-scrollbar">
				<StatsPanel />
			</div>
		</div>
	);
}
