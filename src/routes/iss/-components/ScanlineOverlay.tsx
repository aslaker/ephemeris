import type { ScanlineOverlayProps } from "@/lib/iss/types";

/**
 * ScanlineOverlay - CRT scanline effect overlay
 * Creates authentic retro terminal appearance with moving scan lines.
 */
export const ScanlineOverlay = ({
	visible = true,
	className = "",
}: ScanlineOverlayProps) => {
	if (!visible) return null;

	return (
		<div className={`absolute inset-0 pointer-events-none z-50 ${className}`}>
			{/* Scanlines */}
			<div
				className="absolute inset-0 scanlines opacity-30"
				style={{
					backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent 0px,
            transparent 2px,
            rgba(0, 0, 0, 0.3) 2px,
            rgba(0, 0, 0, 0.3) 4px
          )`,
				}}
			/>

			{/* CRT flicker effect */}
			<div className="absolute inset-0 crt-flicker bg-matrix-text/3" />

			{/* Vignette */}
			<div
				className="absolute inset-0"
				style={{
					background:
						"radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%)",
				}}
			/>

			{/* Screen glow */}
			<div
				className="absolute inset-0"
				style={{
					boxShadow: "inset 0 0 100px rgba(0, 255, 65, 0.05)",
				}}
			/>
		</div>
	);
};
