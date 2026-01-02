/**
 * ISS Passes Route
 *
 * Page displaying upcoming ISS passes for the user's location
 * with AI briefing generation capabilities.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useLocation } from "@/hooks/useLocation";
import { ISSLayout } from "./-components/ISSLayout";
import { LocationSelector } from "./-components/LocationSelector";
import { PassesList } from "./-components/PassesList";

// =============================================================================
// ROUTE DEFINITION
// =============================================================================

export const Route = createFileRoute("/iss/passes")({
	component: PassesPage,
});

// =============================================================================
// PAGE COMPONENT
// =============================================================================

function PassesPage() {
	const { hasLocation } = useLocation();

	return (
		<ISSLayout>
			<div className="h-full overflow-auto p-4">
				{/* Page Header */}
				<header className="mb-6">
					<h1 className="text-xl font-bold text-matrix-text uppercase tracking-wider mb-1">
						ISS_Passes
					</h1>
					<p className="text-xs text-matrix-dim">
						{"// View upcoming passes and generate AI briefings"}
					</p>
				</header>

				{/* Main Content Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
					{/* Left: Location Selector */}
					<div className="lg:col-span-1">
						<LocationSelector />

						{/* Quick Tips */}
						{hasLocation && (
							<div className="mt-4 bg-black/90 border border-matrix-dim p-4 backdrop-blur-sm">
								<h3 className="text-xs text-matrix-text font-bold uppercase mb-2">
									Quick Tips
								</h3>
								<ul className="space-y-2 text-[10px] text-matrix-dim">
									<li className="flex items-start gap-2">
										<span className="text-matrix-text">▸</span>
										<span>Higher elevation passes are easier to see</span>
									</li>
									<li className="flex items-start gap-2">
										<span className="text-matrix-text">▸</span>
										<span>Best viewing is during twilight hours</span>
									</li>
									<li className="flex items-start gap-2">
										<span className="text-matrix-text">▸</span>
										<span>Click a pass to expand and generate a briefing</span>
									</li>
								</ul>
							</div>
						)}
					</div>

					{/* Right: Passes List */}
					<div className="lg:col-span-2">
						<PassesList />
					</div>
				</div>
			</div>
		</ISSLayout>
	);
}

