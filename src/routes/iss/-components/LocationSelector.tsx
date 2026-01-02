/**
 * LocationSelector Component
 *
 * Unified location picker with geolocation, manual input, and address search.
 * Uses the shared location store for app-wide persistence.
 */

import { AlertTriangle, MapPin, Navigation, X } from "lucide-react";
import { useId, useState } from "react";
import { useLocation } from "@/hooks/useLocation";

// =============================================================================
// TYPES
// =============================================================================

interface LocationSelectorProps {
	className?: string;
	compact?: boolean;
	onLocationSet?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * LocationSelector - Multi-mode location input component
 */
export function LocationSelector({
	className = "",
	compact = false,
	onLocationSet,
}: LocationSelectorProps) {
	// Generate unique IDs for accessibility
	const latInputId = useId();
	const lngInputId = useId();

	const {
		coordinates,
		displayName,
		hasLocation,
		error,
		isRequesting,
		requestGeolocation,
		setManual,
		clear,
		clearError,
	} = useLocation();

	// Manual input state
	const [showManualInput, setShowManualInput] = useState(false);
	const [manualLat, setManualLat] = useState("");
	const [manualLng, setManualLng] = useState("");
	const [inputError, setInputError] = useState<string | null>(null);

	/**
	 * Handle geolocation request
	 */
	const handleGeolocation = async () => {
		clearError();
		await requestGeolocation();
		onLocationSet?.();
	};

	/**
	 * Handle manual coordinate input
	 */
	const handleManualSubmit = () => {
		const lat = Number.parseFloat(manualLat);
		const lng = Number.parseFloat(manualLng);

		if (Number.isNaN(lat) || Number.isNaN(lng)) {
			setInputError("Please enter valid numbers");
			return;
		}

		if (lat < -90 || lat > 90) {
			setInputError("Latitude must be between -90 and 90");
			return;
		}

		if (lng < -180 || lng > 180) {
			setInputError("Longitude must be between -180 and 180");
			return;
		}

		setInputError(null);
		setManual(lat, lng);
		setShowManualInput(false);
		setManualLat("");
		setManualLng("");
		onLocationSet?.();
	};

	/**
	 * Handle clearing location
	 */
	const handleClear = () => {
		clear();
		setShowManualInput(false);
	};

	// =============================================================================
	// RENDER: COMPACT MODE (inline display)
	// =============================================================================

	if (compact && hasLocation && coordinates) {
		return (
			<div className={`flex items-center gap-2 text-xs ${className}`}>
				<MapPin className="w-3 h-3 text-matrix-dim" />
				<span className="text-matrix-text font-mono">
					{displayName ||
						`${coordinates.lat.toFixed(2)}, ${coordinates.lng.toFixed(2)}`}
				</span>
				<button
					type="button"
					onClick={handleClear}
					className="text-matrix-dim hover:text-matrix-text"
					title="Clear location"
					aria-label="Clear location"
				>
					<X className="w-3 h-3" />
				</button>
			</div>
		);
	}

	// =============================================================================
	// RENDER: FULL MODE (card display)
	// =============================================================================

	return (
		<div
			className={`bg-black/90 border border-matrix-dim p-4 backdrop-blur-sm ${className}`}
		>
			{/* Header */}
			<div className="flex items-center justify-between mb-3 border-b border-matrix-dim/50 pb-2">
				<div className="flex items-center gap-2 text-matrix-text">
					<Navigation className="w-4 h-4" />
					<span className="text-xs font-bold uppercase tracking-wider">
						Location
					</span>
				</div>
				{hasLocation && (
					<button
						type="button"
						onClick={handleClear}
						className="text-matrix-dim hover:text-matrix-text text-[10px] uppercase"
						aria-label="Clear location"
					>
						Clear
					</button>
				)}
			</div>

			{/* Current Location Display */}
			{hasLocation && coordinates && (
				<div className="mb-4 bg-matrix-dark/30 border border-matrix-dim/30 p-3">
					<div className="flex items-center gap-2 text-matrix-text mb-1">
						<MapPin className="w-3 h-3" />
						<span className="text-xs font-bold">Current Location</span>
					</div>
					{displayName && (
						<p className="text-xs text-matrix-dim mb-1">{displayName}</p>
					)}
					<p className="text-[10px] text-matrix-dim font-mono">
						{coordinates.lat.toFixed(4)}°, {coordinates.lng.toFixed(4)}°
					</p>
				</div>
			)}

			{/* Action Buttons */}
			<div className="space-y-2">
				{/* Geolocation Button */}
				<button
					type="button"
					onClick={handleGeolocation}
					disabled={isRequesting}
					className="w-full border border-matrix-text text-matrix-text hover:bg-matrix-text hover:text-black px-4 py-2 text-xs uppercase font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-matrix-text"
					aria-label={
						isRequesting
							? "Acquiring location"
							: hasLocation
								? "Update location"
								: "Use my current location"
					}
				>
					<Navigation
						className={`w-3 h-3 ${isRequesting ? "animate-spin" : ""}`}
					/>
					{isRequesting
						? "Acquiring..."
						: hasLocation
							? "Update Location"
							: "Use My Location"}
				</button>

				{/* Manual Input Toggle */}
				{!showManualInput ? (
					<button
						type="button"
						onClick={() => setShowManualInput(true)}
						className="w-full border border-matrix-dim text-matrix-dim hover:border-matrix-text hover:text-matrix-text px-4 py-2 text-xs uppercase transition-colors"
					>
						Enter Coordinates Manually
					</button>
				) : (
					<div className="border border-matrix-dim p-3 space-y-3">
						<div className="grid grid-cols-2 gap-2">
							<div>
								<label
									htmlFor={latInputId}
									className="text-[10px] text-matrix-dim uppercase block mb-1"
								>
									Latitude
								</label>
								<input
									id={latInputId}
									type="number"
									step="any"
									value={manualLat}
									onChange={(e) => setManualLat(e.target.value)}
									placeholder="-90 to 90"
									className="w-full bg-black border border-matrix-dim text-matrix-text px-2 py-1 text-xs font-mono focus:border-matrix-text focus:ring-1 focus:ring-matrix-text outline-none"
									aria-describedby={
										inputError ? `${latInputId}-error` : undefined
									}
								/>
							</div>
							<div>
								<label
									htmlFor={lngInputId}
									className="text-[10px] text-matrix-dim uppercase block mb-1"
								>
									Longitude
								</label>
								<input
									id={lngInputId}
									type="number"
									step="any"
									value={manualLng}
									onChange={(e) => setManualLng(e.target.value)}
									placeholder="-180 to 180"
									className="w-full bg-black border border-matrix-dim text-matrix-text px-2 py-1 text-xs font-mono focus:border-matrix-text focus:ring-1 focus:ring-matrix-text outline-none"
									aria-describedby={
										inputError ? `${lngInputId}-error` : undefined
									}
								/>
							</div>
						</div>

						{inputError && (
							<p
								id={`${latInputId}-error`}
								className="text-[10px] text-red-500"
								role="alert"
							>
								{inputError}
							</p>
						)}

						<div className="flex gap-2">
							<button
								type="button"
								onClick={handleManualSubmit}
								className="flex-1 border border-matrix-text text-matrix-text hover:bg-matrix-text hover:text-black px-3 py-1 text-xs uppercase font-bold transition-colors focus:outline-none focus:ring-1 focus:ring-matrix-text"
								aria-label="Set location from entered coordinates"
							>
								Set Location
							</button>
							<button
								type="button"
								onClick={() => {
									setShowManualInput(false);
									setInputError(null);
								}}
								className="border border-matrix-dim text-matrix-dim hover:text-matrix-text px-3 py-1 text-xs uppercase transition-colors focus:outline-none focus:ring-1 focus:ring-matrix-text"
								aria-label="Cancel manual coordinate entry"
							>
								Cancel
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Error Display */}
			{error && (
				<div className="mt-3 flex items-center gap-2 text-red-500 text-[10px]">
					<AlertTriangle className="w-3 h-3" />
					<span>
						{error === "PERMISSION_DENIED"
							? "Location access denied. Please enable location services."
							: error === "POSITION_UNAVAILABLE"
								? "Unable to determine location."
								: error === "TIMEOUT"
									? "Location request timed out."
									: error}
					</span>
				</div>
			)}
		</div>
	);
}

