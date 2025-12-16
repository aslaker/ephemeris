import { Activity, Clock, Globe, Navigation, Radio, Zap } from "lucide-react";
import { useEffect } from "react";
import { terminalAudio } from "@/lib/iss/audio";
import type { StatsPanelProps } from "@/lib/iss/types";
import { formatCoordinate } from "@/lib/iss/types";
import { MatrixText } from "./MatrixText";

interface StatBoxProps {
	label: string;
	value: string;
	unit?: string;
	icon?: React.ComponentType<{ className?: string }>;
	subtext?: string;
	className?: string;
}

const StatBox = ({
	label,
	value,
	unit,
	icon: Icon,
	subtext,
	className = "",
}: StatBoxProps) => (
	<div
		className={`bg-matrix-dark/50 border border-matrix-dim p-1.5 lg:p-2 xl:p-3 hover:border-matrix-text transition-colors group relative overflow-hidden ${className}`}
	>
		<div className="flex justify-between items-start">
			<span className="text-[8px] lg:text-[9px] xl:text-[10px] uppercase text-matrix-dim group-hover:text-matrix-text transition-colors">
				{label}
			</span>
			{Icon && <Icon className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-matrix-dim" />}
		</div>
		<div className="text-base lg:text-lg xl:text-xl font-bold tracking-wider text-white leading-tight">
			<MatrixText text={String(value)} />
			{unit && (
				<span className="text-[10px] lg:text-xs xl:text-sm ml-0.5 text-matrix-text font-normal">
					{unit}
				</span>
			)}
		</div>
		{subtext && (
			<div className="text-[7px] lg:text-[8px] xl:text-[9px] text-matrix-dim/70 mt-0.5">
				{subtext}
			</div>
		)}
	</div>
);

/**
 * StatsPanel - Responsive telemetry display panel showing ISS position data
 * Shows more data on larger screens
 */
export const StatsPanel = ({ data, isLoading, fromCache }: StatsPanelProps) => {
	// Play sound when data updates
	useEffect(() => {
		if (data) {
			terminalAudio.playDataUpdate();
		}
	}, [data]);

	if (isLoading || !data) {
		return (
			<div className="h-full w-full flex items-center justify-center p-2">
				<div className="text-center animate-pulse">
					<p className="text-sm">ACQUIRING_SIGNAL...</p>
					<p className="text-[10px] text-matrix-dim mt-1">
						ESTABLISHING UPLINK
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="p-2 lg:p-3 xl:p-4 bg-matrix-bg/80 backdrop-blur-md h-full flex flex-col">
			{/* Header */}
			<div className="flex items-center gap-1.5 border-b border-matrix-dim pb-1.5 lg:pb-2 mb-1.5 lg:mb-2 xl:mb-3">
				<Activity className="w-3 h-3 lg:w-4 lg:h-4 text-matrix-alert animate-pulse" />
				<h2 className="text-[10px] lg:text-xs xl:text-sm font-bold uppercase">
					<MatrixText text="Telemetry Data" speed={50} />
				</h2>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-2 md:grid-cols-1 gap-1 lg:gap-1.5 xl:gap-2 flex-1 content-start">
				{/* Core stats - always visible */}
				<StatBox
					label="Latitude"
					value={formatCoordinate(data.latitude, "lat")}
					icon={Navigation}
					subtext="Current Position"
				/>
				<StatBox
					label="Longitude"
					value={formatCoordinate(data.longitude, "lon")}
					icon={Navigation}
					subtext="Current Position"
				/>
				<StatBox
					label="Altitude"
					value={data.altitude.toFixed(1)}
					unit="km"
					icon={Activity}
					subtext="Orbital Height (Avg)"
				/>
				<StatBox
					label="Velocity"
					value={Math.round(data.velocity).toLocaleString()}
					unit="km/h"
					icon={Zap}
					subtext="Orbital Speed (Avg)"
				/>
				<StatBox
					label="Period"
					value="92.6"
					unit="min"
					icon={Clock}
					subtext="Full Orbit Duration"
				/>
				<StatBox
					label="Last Update"
					value={new Date(data.timestamp * 1000).toLocaleTimeString([], {
						hour12: false,
					})}
					icon={Activity}
					subtext="UTC Standard Time"
				/>

				{/* Extra stats - only on xl screens */}
				<StatBox
					label="Visibility"
					value={data.visibility === "daylight" ? "DAYLIGHT" : "ECLIPSED"}
					icon={Globe}
					subtext="Orbital Illumination"
					className="hidden xl:block"
				/>
				<StatBox
					label="Signal"
					value="NOMINAL"
					icon={Radio}
					subtext="Uplink Status"
					className="hidden xl:block"
				/>
			</div>

			{/* System Logs */}
			<div className="mt-2 lg:mt-3 pt-2 border-t border-matrix-dim/50">
				<h3 className="text-[8px] lg:text-[9px] uppercase text-matrix-dim mb-1">
					System Status
				</h3>
				<div className="font-mono text-[7px] lg:text-[8px] xl:text-[9px] text-matrix-dim/60 space-y-0.5">
					<p>&gt; DATA_SOURCE: WHERE_THE_ISS_AT_API</p>
					<p>&gt; SIGNAL_STRENGTH: 98%</p>
					<p className="hidden lg:block">&gt; ENCRYPTION: AES-256</p>
					<p className="hidden xl:block">&gt; REFRESH_RATE: 5000ms</p>
					<p className="hidden xl:block">&gt; CONNECTION: STABLE</p>
					{fromCache && (
						<p className="text-matrix-text/50">&gt; CACHE_MODE: LOCAL_FIRST</p>
					)}
				</div>
			</div>
		</div>
	);
};
