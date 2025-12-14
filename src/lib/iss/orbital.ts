/**
 * Orbital Calculation Utilities
 * Uses satellite.js for TLE propagation and orbital mechanics.
 */

import * as satellite from "satellite.js";
import type {
	LatLng,
	OrbitalParameters,
	OrbitalPoint,
	PassPrediction,
} from "./types";
import { generateEntityId } from "./types";

/**
 * Normalize longitude to -180 to 180 range
 */
const normalizeLongitude = (lon: number): number =>
	((((lon + 180) % 360) + 360) % 360) - 180;

/**
 * Convert radians to degrees
 */
const radiansToDegrees = (radians: number): number => radians * (180 / Math.PI);

/**
 * Get satellite.js library safely (handles various import scenarios)
 */
const getSatelliteLib = () => {
	const lib =
		(satellite as unknown as { default?: typeof satellite }).default ||
		satellite;
	if (!lib || !lib.twoline2satrec) {
		console.warn("Satellite.js library not loaded correctly", lib);
		throw new Error("ORBITAL_LIB_ERROR");
	}
	return lib;
};

/**
 * Calculate orbital path from TLE data
 * @param line1 - First TLE line
 * @param line2 - Second TLE line
 * @param startMins - Start time offset in minutes (negative for past)
 * @param endMins - End time offset in minutes
 * @param stepMins - Time step between points (default: 1)
 * @returns Array of orbital points
 */
export const calculateOrbitPath = (
	line1: string,
	line2: string,
	startMins: number,
	endMins: number,
	stepMins: number = 1,
): OrbitalPoint[] => {
	const points: OrbitalPoint[] = [];
	try {
		const satLib = getSatelliteLib();
		const satrec = satLib.twoline2satrec(line1, line2);
		if (!satrec) return [];

		const now = new Date();
		for (let i = startMins; i <= endMins; i += stepMins) {
			const time = new Date(now.getTime() + i * 60 * 1000);
			const positionAndVelocity = satLib.propagate(satrec, time);
			const pos = positionAndVelocity.position;

			if (pos && typeof pos !== "boolean") {
				const gmst = satLib.gstime(time);
				const geo = satLib.eciToGeodetic(pos, gmst);
				points.push({
					lat: satLib.degreesLat(geo.latitude),
					lng: normalizeLongitude(satLib.degreesLong(geo.longitude)),
					alt: geo.height,
				});
			}
		}
	} catch (e) {
		console.warn("Orbit calculation error:", e);
	}
	return points;
};

/**
 * Predict future orbital path
 * Convenience wrapper for calculateOrbitPath starting from now
 */
export const predictOrbit = (
	line1: string,
	line2: string,
	durationMins: number,
): OrbitalPoint[] => calculateOrbitPath(line1, line2, 0, durationMins);

/**
 * Calculate Keplerian orbital parameters from TLE
 * @param line1 - First TLE line
 * @param line2 - Second TLE line
 * @returns OrbitalParameters or null if calculation fails
 */
export const calculateOrbitalParameters = (
	line1: string,
	line2: string,
): OrbitalParameters | null => {
	try {
		const satLib = getSatelliteLib();
		const satrec = satLib.twoline2satrec(line1, line2);
		if (!satrec) return null;

		// Mean motion in rad/sec (satrec.no is in rad/min)
		const n_rad_s = satrec.no / 60;
		// Earth's gravitational parameter (km³/s²)
		const mu = 398600.4418;
		// Semi-major axis (km)
		const a = (mu / (n_rad_s * n_rad_s)) ** (1 / 3);
		// Earth radius (km)
		const earthRadius = 6378.137;

		return {
			inclination: satrec.inclo * (180 / Math.PI),
			eccentricity: satrec.ecco,
			meanMotion: (satrec.no * 1440) / (2 * Math.PI), // rev/day
			period: (2 * Math.PI) / n_rad_s / 60, // minutes
			apogee: a * (1 + satrec.ecco) - earthRadius,
			perigee: a * (1 - satrec.ecco) - earthRadius,
		};
	} catch (e) {
		console.warn("Orbital parameters calculation error:", e);
		return null;
	}
};

/**
 * Predict next visible ISS pass for observer location
 * @param line1 - First TLE line
 * @param line2 - Second TLE line
 * @param userLoc - Observer's geographic location
 * @returns PassPrediction or null if no pass within 24 hours
 */
export const predictNextPass = (
	line1: string,
	line2: string,
	userLoc: LatLng,
): PassPrediction | null => {
	try {
		const satLib = getSatelliteLib();
		const satrec = satLib.twoline2satrec(line1, line2);

		// Observer geodetic position
		const observerGd = {
			latitude: satLib.degreesToRadians(userLoc.lat),
			longitude: satLib.degreesToRadians(userLoc.lng),
			height: 0.03, // ~30m above sea level
		};

		const now = new Date();
		const stepSeconds = 20;
		const maxHorizon = 24 * 60 * 60 * 1000; // 24 hours in ms
		let t = 0;

		let passStart: Date | null = null;
		let maxEl = 0;
		let passPath: OrbitalPoint[] = [];

		while (t < maxHorizon) {
			const time = new Date(now.getTime() + t);

			const positionAndVelocity = satLib.propagate(satrec, time);
			const posEci = positionAndVelocity.position;
			const gmst = satLib.gstime(time);

			if (!posEci || typeof posEci === "boolean") {
				t += stepSeconds * 1000;
				continue;
			}

			const posEcf = satLib.eciToEcf(posEci, gmst);
			const look = satLib.ecfToLookAngles(observerGd, posEcf);
			const elevationDeg = radiansToDegrees(look.elevation);

			if (elevationDeg > 10) {
				// Above 10° is visible
				if (!passStart) {
					passStart = time;
					passPath = [];
				}

				if (elevationDeg > maxEl) maxEl = elevationDeg;

				const geo = satLib.eciToGeodetic(posEci, gmst);
				passPath.push({
					lat: satLib.degreesLat(geo.latitude),
					lng: normalizeLongitude(satLib.degreesLong(geo.longitude)),
					alt: geo.height,
				});
			} else if (passStart) {
				// Pass ended
				return {
					id: generateEntityId.pass(passStart),
					startTime: passStart,
					endTime: time,
					duration: (time.getTime() - passStart.getTime()) / 1000 / 60,
					maxElevation: maxEl,
					path: passPath,
				};
			}

			t += stepSeconds * 1000;
		}

		return null; // No pass found in 24 hours
	} catch (e) {
		console.error("Pass prediction error:", e);
		return null;
	}
};
