import {
	BadgeCheck,
	Calendar,
	Clock,
	Network,
	Rocket,
	UserCircle,
} from "lucide-react";
import { useState } from "react";
import type { Astronaut, CrewCardProps } from "@/lib/iss/types";
import { MatrixText } from "./MatrixText";

/**
 * Calculate mission statistics from astronaut data
 */
const getMissionStats = (person: Astronaut) => {
	const { launchDate, endDate, role } = person;

	// Missing date - unknown status
	if (!launchDate) {
		return {
			role: role || "Flight Engineer",
			daysInOrbit: "N/A",
			progress: 0,
			startStr: "UNKNOWN",
			endStr: "UNKNOWN",
			isUnknown: true,
		};
	}

	// Active mission
	const start = new Date(launchDate).getTime();
	const now = Date.now();

	let end: number;
	let isEstimatedEnd = true;

	if (endDate) {
		end = new Date(endDate).getTime();
		isEstimatedEnd = false;
	} else {
		// Estimate 180 days if no end date
		const ESTIMATED_DURATION_MS = 180 * 24 * 60 * 60 * 1000;
		end = start + ESTIMATED_DURATION_MS;
	}

	const elapsed = now - start;
	const totalDuration = end - start;

	const daysInOrbit = Math.floor(elapsed / (1000 * 60 * 60 * 24));
	const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

	return {
		role: role || "Mission Specialist",
		daysInOrbit: daysInOrbit > 0 ? daysInOrbit : 0,
		progress,
		startStr: new Date(launchDate).toISOString().split("T")[0],
		endStr: `${isEstimatedEnd ? "Est. " : ""}${new Date(end).toISOString().split("T")[0]}`,
		isUnknown: false,
	};
};

/**
 * CrewImage - Handles image loading states
 */
const CrewImage = ({ src, alt }: { src?: string; alt: string }) => {
	const [error, setError] = useState(false);

	if (!src || error) {
		return <UserCircle className="w-12 h-12 text-matrix-dim" />;
	}

	return (
		<>
			<img
				src={src}
				alt={alt}
				onError={() => setError(true)}
				className="w-full h-full object-cover grayscale sepia brightness-75 contrast-125 hue-rotate-[70deg] hover:grayscale-0 hover:sepia-0 hover:brightness-100 hover:contrast-100 hover:hue-rotate-0 transition-all duration-500"
			/>
			<div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
		</>
	);
};

/**
 * CrewCard - Individual astronaut card with mission data
 */
export const CrewCard = ({
	astronaut,
	className = "",
}: CrewCardProps & { idx?: number }) => {
	const stats = getMissionStats(astronaut);
	const idx = Number.parseInt(astronaut.id.replace(/\D/g, ""), 10) || 1;

	return (
		<div
			className={`bg-matrix-dark/90 backdrop-blur-sm border border-matrix-dim p-5 relative overflow-hidden group hover:border-matrix-text transition-all duration-300 flex flex-col justify-between ${className}`}
		>
			{/* Decorative corner accent */}
			<div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-matrix-dim group-hover:border-matrix-text transition-colors" />

			{/* Header Section */}
			<div className="flex items-start gap-4 mb-6 relative z-10">
				<div className="w-20 h-20 rounded bg-matrix-dim/10 flex items-center justify-center border border-matrix-dim/50 group-hover:bg-matrix-text/10 transition-colors shrink-0 overflow-hidden relative">
					<CrewImage src={astronaut.image} alt={astronaut.name} />
				</div>

				<div className="flex-1 min-w-0">
					<div className="flex justify-between items-start">
						<h3 className="font-bold text-xl leading-tight truncate text-white group-hover:text-matrix-text transition-colors pr-2">
							{astronaut.name}
						</h3>
						<span className="text-[10px] font-mono text-matrix-dim border border-matrix-dim px-1 rounded opacity-50">
							ID: {String(idx).padStart(3, "0")}
						</span>
					</div>

					<div className="text-sm text-matrix-text/80 font-bold mb-1 uppercase tracking-wider flex items-center gap-2">
						{stats.role}
						{astronaut.agency && (
							<span className="text-[9px] text-black bg-matrix-dim px-1 rounded font-bold">
								{astronaut.agency}
							</span>
						)}
					</div>

					<div className="flex items-center gap-3 text-xs text-matrix-dim mt-2">
						<div className="flex items-center gap-1">
							<Rocket className="w-3 h-3" />
							<span>{astronaut.craft}</span>
						</div>
						<div className="w-px h-3 bg-matrix-dim/50" />
						<div className="flex items-center gap-1">
							{astronaut.image ? (
								<BadgeCheck className="w-3 h-3 text-matrix-text" />
							) : (
								<Network className="w-3 h-3" />
							)}
							<span className="uppercase">
								{astronaut.image ? "VERIFIED_ID" : "NO_IMAGE"}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Timeline Section */}
			<div className="bg-black/40 border border-matrix-dim/30 p-3 relative z-10 min-h-[100px] flex flex-col justify-center">
				{stats.isUnknown ? (
					<div className="flex flex-col items-center justify-center py-2 text-matrix-dim/60 gap-1 text-center">
						<Network className="w-5 h-5 opacity-50 mb-1" />
						<div className="text-xs font-bold tracking-widest text-matrix-text/70 uppercase">
							STATUS: ACTIVE
						</div>
						<div className="text-[9px] uppercase tracking-wider opacity-60">
							DATA STREAM LIMITED
							<br />
							CONFIRMED ONBOARD
						</div>
					</div>
				) : (
					<>
						<div className="flex justify-between items-end mb-2">
							<div className="flex flex-col">
								<span className="text-[9px] uppercase text-matrix-dim mb-0.5">
									Time in Orbit
								</span>
								<span className="text-2xl font-bold font-mono leading-none text-white">
									T+
									<MatrixText text={String(stats.daysInOrbit)} speed={50} />
									<span className="text-xs ml-1 text-matrix-dim font-normal">
										DAYS
									</span>
								</span>
							</div>
							<div className="flex items-center gap-1 text-xs text-matrix-dim font-mono">
								<Clock className="w-3 h-3" />
								<span>{Math.round(stats.progress)}% EST.</span>
							</div>
						</div>

						{/* Progress Bar */}
						<div className="w-full h-2 bg-matrix-dim/10 border border-matrix-dim/30 relative overflow-hidden mb-2">
							<div
								className="h-full bg-matrix-text shadow-[0_0_10px_rgba(0,255,65,0.5)] relative transition-all duration-1000"
								style={{ width: `${stats.progress}%` }}
							>
								{/* Stripes effect */}
								<div
									className="absolute inset-0 w-full h-full"
									style={{
										backgroundImage:
											"linear-gradient(45deg,rgba(0,0,0,0.3) 25%,transparent 25%,transparent 50%,rgba(0,0,0,0.3) 50%,rgba(0,0,0,0.3) 75%,transparent 75%,transparent)",
										backgroundSize: "8px 8px",
									}}
								/>
							</div>
						</div>

						<div className="flex justify-between text-[9px] font-mono text-matrix-dim uppercase">
							<div className="flex items-center gap-1">
								<Calendar className="w-3 h-3 opacity-50" />
								<span>Launch: {stats.startStr}</span>
							</div>
							<span>Return: {stats.endStr}</span>
						</div>
					</>
				)}
			</div>

			{/* Background decoration */}
			<div className="absolute -bottom-6 -right-6 text-[80px] font-bold text-matrix-dim/5 select-none pointer-events-none font-mono z-0">
				MK-{String(idx).padStart(2, "0")}
			</div>
		</div>
	);
};
