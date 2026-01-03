import { createFileRoute } from "@tanstack/react-router";
import { useISSCrewDB } from "@/hooks/iss/useISSDataDB";
import { CrewCard } from "./-components/CrewCard";
import { ISSLayout } from "./-components/ISSLayout";

export const Route = createFileRoute("/iss/crew")({
	head: () => ({
		meta: [
			{
				title: "ISS Crew Manifest - Ephemeris",
			},
			{
				name: "description",
				content:
					"View the current International Space Station crew members, their roles, and mission details.",
			},
			{
				property: "og:title",
				content: "ISS Crew Manifest - Ephemeris",
			},
			{
				property: "og:description",
				content:
					"View the current International Space Station crew members, their roles, and mission details.",
			},
			{
				property: "og:url",
				content: "https://ephemeris.observer/iss/crew",
			},
			{
				name: "twitter:url",
				content: "https://ephemeris.observer/iss/crew",
			},
			{
				name: "twitter:title",
				content: "ISS Crew Manifest - Ephemeris",
			},
			{
				name: "twitter:description",
				content:
					"View the current International Space Station crew members, their roles, and mission details.",
			},
		],
		links: [
			{
				rel: "canonical",
				href: "https://ephemeris.observer/iss/crew",
			},
		],
	}),
	component: CrewPage,
});

function CrewPage() {
	return (
		<ISSLayout>
			<CrewManifest />
		</ISSLayout>
	);
}

function CrewManifest() {
	const { data: crew, isLoading, error } = useISSCrewDB();
	const isError = !!error;

	const crewCount = crew?.length || 0;

	return (
		<div className="h-full w-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
			<div className="max-w-6xl mx-auto pb-12">
				{/* Header */}
				<div className="mb-8 border-b border-matrix-dim pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
					<div>
						<h2
							className="text-3xl font-bold tracking-wider mb-2 glitch-text"
							data-text="PERSONNEL MANIFEST"
						>
							PERSONNEL MANIFEST
						</h2>
						<p className="text-matrix-dim text-sm uppercase flex items-center gap-2">
							<span className="w-2 h-2 bg-matrix-dim rounded-full animate-pulse" />
							Live Uplink | Open Notify API
						</p>
					</div>
					<div className="flex gap-8 text-right bg-matrix-dark/50 p-2 border border-matrix-dim/30">
						<div>
							<div className="text-2xl font-bold text-matrix-text">
								{crewCount}
							</div>
							<div className="text-[9px] text-matrix-dim uppercase tracking-wider">
								Active Crew
							</div>
						</div>
						<div>
							<div className="text-2xl font-bold text-matrix-text">ISS</div>
							<div className="text-[9px] text-matrix-dim uppercase tracking-wider">
								Sector 4
							</div>
						</div>
					</div>
				</div>

				{/* Loading State */}
				{isLoading && (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
						{[1, 2, 3, 4].map((i) => (
							<div
								key={i}
								className="h-64 bg-matrix-dark border border-matrix-dim relative overflow-hidden"
							>
								<div className="absolute top-4 left-4 w-12 h-12 bg-matrix-dim/20 rounded" />
								<div className="absolute top-20 left-4 w-3/4 h-4 bg-matrix-dim/20 rounded" />
								<div className="absolute top-28 left-4 w-1/2 h-4 bg-matrix-dim/20 rounded" />
							</div>
						))}
					</div>
				)}

				{/* Error State */}
				{isError && (
					<div className="text-center py-12">
						<p className="text-matrix-alert text-lg">CREW_DATA_UNAVAILABLE</p>
						<p className="text-matrix-dim text-sm mt-2">
							Unable to fetch personnel manifest
						</p>
					</div>
				)}

				{/* Crew Grid */}
				{!isLoading && !isError && crew && (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{crew.map((person) => (
							<CrewCard key={person.id} astronaut={person} />
						))}
					</div>
				)}

				{/* Empty State */}
				{!isLoading && !isError && (!crew || crew.length === 0) && (
					<div className="text-center py-12">
						<p className="text-matrix-dim text-lg">NO_CREW_DATA</p>
						<p className="text-matrix-dim/50 text-sm mt-2">
							Awaiting personnel data stream
						</p>
					</div>
				)}

				{/* Footer */}
				<div className="mt-12 p-4 border border-matrix-dim border-dashed bg-matrix-dark/30 text-xs text-matrix-dim font-mono flex flex-col md:flex-row justify-between gap-4">
					<div className="space-y-1">
						<p>&gt; DATA_SOURCE: OPEN_NOTIFY (LIVE_FEED)</p>
						<p>&gt; FILTER_MODE: ISS_ONLY</p>
						<p>&gt; CACHE_STATUS: {isLoading ? "REFRESHING" : "VALID"}</p>
					</div>
					<div className="text-right opacity-50">
						<p>PERSONNEL_TRACKING_SYSTEM</p>
						<p>SECURE_LINK | TERMINAL_V2</p>
					</div>
				</div>
			</div>
		</div>
	);
}
