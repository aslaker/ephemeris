/**
 * PassesList Component
 *
 * Displays a list of upcoming ISS passes with date range controls.
 */

import {
	Calendar,
	ChevronLeft,
	ChevronRight,
	RefreshCw,
	Satellite,
} from "lucide-react";
import { useId, useMemo, useState } from "react";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
} from "@/components/ui/pagination";
import { usePasses } from "@/hooks/iss/usePasses";
import { PassCard } from "./PassCard";

// =============================================================================
// TYPES
// =============================================================================

interface PassesListProps {
	className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * PassesList - List of upcoming ISS passes with controls
 */
export function PassesList({ className = "" }: PassesListProps) {
	// Generate unique IDs for accessibility
	const headingId = useId();
	const daysSelectId = useId();

	// Date range controls
	const [maxDays, setMaxDays] = useState(7);

	// Pagination state
	const [currentPage, setCurrentPage] = useState(1);
	const passesPerPage = 5;

	// Increase maxPasses based on maxDays to ensure we can show all passes in range
	// Roughly 15-16 passes per day for ISS, so scale accordingly
	const maxPasses = Math.ceil(maxDays * 15);

	const { passes, isLoading, isFetching, hasLocation, refetch } = usePasses({
		maxDays,
		maxPasses,
		minElevation: 10,
	});

	// Calculate pagination
	const totalPages = Math.ceil(passes.length / passesPerPage);
	const paginatedPasses = useMemo(() => {
		const startIndex = (currentPage - 1) * passesPerPage;
		return passes.slice(startIndex, startIndex + passesPerPage);
	}, [passes, currentPage]);

	// Reset to page 1 when maxDays changes
	const handleDaysChange = (value: number) => {
		if (value >= 1 && value <= 14) {
			setMaxDays(value);
			setCurrentPage(1);
		}
	};

	// =============================================================================
	// RENDER: NO LOCATION
	// =============================================================================

	if (!hasLocation) {
		return (
			<div
				className={`bg-black/90 border border-matrix-dim p-6 backdrop-blur-sm text-center ${className}`}
			>
				<Satellite className="w-12 h-12 text-matrix-dim mx-auto mb-4" />
				<h2 className="text-sm text-matrix-text font-bold uppercase mb-2">
					Location Required
				</h2>
				<p className="text-xs text-matrix-dim">
					Set your location to see upcoming ISS passes
				</p>
			</div>
		);
	}

	// =============================================================================
	// RENDER: LOADING
	// =============================================================================

	if (isLoading) {
		return (
			<div
				className={`bg-black/90 border border-matrix-dim p-6 backdrop-blur-sm text-center ${className}`}
				aria-live="polite"
				aria-busy="true"
			>
				<RefreshCw className="w-8 h-8 text-matrix-text animate-spin mx-auto mb-4" />
				<p className="text-xs text-matrix-dim animate-pulse">
					CALCULATING_TRAJECTORIES...
				</p>
				{/* Skeleton loader for passes */}
				<div className="mt-4 space-y-2" aria-hidden="true">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="bg-matrix-dark/30 border border-matrix-dim/30 p-3 animate-pulse"
						>
							<div className="h-4 bg-matrix-dim/30 rounded w-3/4 mb-2" />
							<div className="h-3 bg-matrix-dim/20 rounded w-1/2" />
						</div>
					))}
				</div>
			</div>
		);
	}

	// =============================================================================
	// RENDER: MAIN LIST
	// =============================================================================

	return (
		<section className={className} aria-labelledby={headingId}>
			{/* Header with Controls */}
			<div className="flex items-center justify-between mb-4">
				<h2
					id={headingId}
					className="text-sm text-matrix-text font-bold uppercase tracking-wider flex items-center gap-2"
				>
					<Calendar className="w-4 h-4" />
					Upcoming Passes
				</h2>

				<div className="flex items-center gap-3">
					{/* Days selector */}
					<div className="flex items-center gap-2">
						<label
							htmlFor={daysSelectId}
							className="text-[10px] text-matrix-dim uppercase"
						>
							Days:
						</label>
						<select
							id={daysSelectId}
							value={maxDays}
							onChange={(e) => handleDaysChange(Number(e.target.value))}
							className="bg-black border border-matrix-dim text-matrix-text text-xs px-2 py-1 focus:border-matrix-text focus:ring-1 focus:ring-matrix-text outline-none"
							aria-label="Select number of days to show passes for (1-14 days)"
						>
							<option value={3}>3</option>
							<option value={7}>7</option>
							<option value={14}>14</option>
						</select>
					</div>

					{/* Refresh button */}
					<button
						type="button"
						onClick={() => refetch()}
						disabled={isFetching}
						className="text-matrix-dim hover:text-matrix-text disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-matrix-text"
						title="Refresh passes"
						aria-label={
							isFetching ? "Refreshing pass list" : "Refresh pass list"
						}
						aria-busy={isFetching}
					>
						<RefreshCw
							className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
						/>
					</button>
				</div>
			</div>

			{/* Passes Count */}
			<p
				className="text-[10px] text-matrix-dim uppercase mb-3"
				aria-live="polite"
			>
				{passes.length} pass{passes.length !== 1 ? "es" : ""} found in next{" "}
				{maxDays} days
				{totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
			</p>

			{/* Pass List */}
			{passes.length === 0 ? (
				<output
					className="block bg-black/90 border border-matrix-dim p-6 text-center"
					aria-live="polite"
				>
					<p className="text-xs text-matrix-dim mb-2">
						No visible passes found in the selected date range.
					</p>
					<p className="text-[10px] text-matrix-dim">
						Try extending the search to more days (up to 14 days).
					</p>
				</output>
			) : (
				<>
					<ul aria-label="List of upcoming ISS passes" className="space-y-2">
						{paginatedPasses.map((pass) => (
							<li key={pass.id}>
								<PassCard pass={pass} />
							</li>
						))}
					</ul>

					{/* Pagination Controls */}
					{totalPages > 1 && (
						<Pagination className="mt-4">
							<PaginationContent>
								{/* Previous Button */}
								<PaginationItem>
									<button
										type="button"
										onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
										disabled={currentPage === 1}
										className="flex items-center gap-1 px-2 py-1 text-xs text-matrix-dim hover:text-matrix-text disabled:opacity-30 disabled:cursor-not-allowed"
										aria-label="Go to previous page"
									>
										<ChevronLeft className="w-4 h-4" />
										<span className="hidden sm:inline">Prev</span>
									</button>
								</PaginationItem>

								{/* Page Numbers */}
								{(() => {
									type PageItem =
										| { type: "page"; value: number }
										| { type: "ellipsis"; position: "start" | "end" };
									const pages: PageItem[] = [];
									if (totalPages <= 5) {
										for (let i = 1; i <= totalPages; i++)
											pages.push({ type: "page", value: i });
									} else {
										pages.push({ type: "page", value: 1 });
										if (currentPage > 3)
											pages.push({ type: "ellipsis", position: "start" });
										for (
											let i = Math.max(2, currentPage - 1);
											i <= Math.min(totalPages - 1, currentPage + 1);
											i++
										) {
											pages.push({ type: "page", value: i });
										}
										if (currentPage < totalPages - 2)
											pages.push({ type: "ellipsis", position: "end" });
										pages.push({ type: "page", value: totalPages });
									}
									return pages.map((item) =>
										item.type === "ellipsis" ? (
											<PaginationItem key={`ellipsis-${item.position}`}>
												<PaginationEllipsis className="text-matrix-dim" />
											</PaginationItem>
										) : (
											<PaginationItem key={item.value}>
												<PaginationLink
													onClick={() => setCurrentPage(item.value)}
													isActive={currentPage === item.value}
													className={`cursor-pointer text-xs ${
														currentPage === item.value
															? "border-matrix-text text-matrix-text"
															: "text-matrix-dim hover:text-matrix-text border-transparent"
													}`}
												>
													{item.value}
												</PaginationLink>
											</PaginationItem>
										),
									);
								})()}

								{/* Next Button */}
								<PaginationItem>
									<button
										type="button"
										onClick={() =>
											setCurrentPage((p) => Math.min(totalPages, p + 1))
										}
										disabled={currentPage === totalPages}
										className="flex items-center gap-1 px-2 py-1 text-xs text-matrix-dim hover:text-matrix-text disabled:opacity-30 disabled:cursor-not-allowed"
										aria-label="Go to next page"
									>
										<span className="hidden sm:inline">Next</span>
										<ChevronRight className="w-4 h-4" />
									</button>
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					)}
				</>
			)}

			{/* Footer Info */}
			<div className="mt-4 pt-3 border-t border-matrix-dim/30 flex justify-between items-center text-[9px] text-matrix-dim uppercase">
				<span>Min elevation: 10°</span>
				<span>
					{isFetching ? "Updating..." : "Data from orbital prediction"}
				</span>
			</div>
		</section>
	);
}
