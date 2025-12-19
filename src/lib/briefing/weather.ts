/**
 * Weather Client
 *
 * Integration with Open-Meteo API for weather conditions.
 * Used to enhance AI briefings with real weather data.
 */

import * as Sentry from "@sentry/tanstackstart-react";
import type { LatLng, OpenMeteoResponse, WeatherConditions } from "./types";
import { deriveWeatherFavorability } from "./types";

// =============================================================================
// CONSTANTS
// =============================================================================

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

// =============================================================================
// WEATHER FETCHING
// =============================================================================

/**
 * Get weather conditions for a specific pass time
 *
 * @param location - Observer location
 * @param passTime - Time of the ISS pass
 * @returns Weather conditions or null if unavailable
 */
export async function getWeatherForPass(
	location: LatLng,
	passTime: Date,
	maxRetries: number = 2,
): Promise<WeatherConditions | null> {
	return Sentry.startSpan({ name: "Fetch Weather for Pass" }, async () => {
		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				const url = new URL(OPEN_METEO_URL);
				url.searchParams.set("latitude", String(location.lat));
				url.searchParams.set("longitude", String(location.lng));
				url.searchParams.set("hourly", "cloud_cover,visibility");
				url.searchParams.set("forecast_days", "7");
				// Use timezone to ensure accurate time matching
				url.searchParams.set("timezone", "auto"); // Auto-detect timezone based on location

				// Create timeout controller for fetch
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

				const response = await fetch(url.toString(), {
					signal: controller.signal,
				});

				clearTimeout(timeoutId);

				if (!response.ok) {
					const errorMessage = `Weather API returned ${response.status} ${response.statusText}`;
					Sentry.captureMessage(errorMessage, {
						level: "warning",
						tags: {
							weather_api: "open_meteo",
							status_code: response.status,
							attempt: attempt + 1,
						},
					});

					if (attempt < maxRetries && response.status >= 500) {
						// Retry on server errors
						await new Promise((resolve) =>
							setTimeout(resolve, 1000 * (attempt + 1)),
						);
						continue;
					}
					console.warn(errorMessage);
					return null;
				}

				const data = (await response.json()) as OpenMeteoResponse;

				if (
					!data.hourly?.time ||
					!data.hourly?.cloud_cover ||
					!data.hourly?.visibility
				) {
					const errorMessage = "Weather API response missing required fields";
					Sentry.captureMessage(errorMessage, {
						level: "warning",
						tags: {
							weather_api: "open_meteo",
						},
						extra: {
							hasTime: !!data.hourly?.time,
							hasCloudCover: !!data.hourly?.cloud_cover,
							hasVisibility: !!data.hourly?.visibility,
						},
					});
					console.warn(errorMessage, {
						hasTime: !!data.hourly?.time,
						hasCloudCover: !!data.hourly?.cloud_cover,
						hasVisibility: !!data.hourly?.visibility,
					});
					return null;
				}

				return findClosestWeather(data.hourly, passTime);
			} catch (error) {
				const err = error instanceof Error ? error : new Error(String(error));

				// Don't retry on timeout or abort errors
				if (err.name === "AbortError" || err.name === "TimeoutError") {
					Sentry.captureMessage("Weather fetch timeout", {
						level: "warning",
						tags: {
							weather_api: "open_meteo",
							error_type: err.name,
						},
					});
					console.warn("Weather fetch timeout:", err);
					return null;
				}

				// Retry on network errors
				if (attempt < maxRetries) {
					await new Promise((resolve) =>
						setTimeout(resolve, 1000 * (attempt + 1)),
					);
					continue;
				}

				// Log final failure to Sentry
				Sentry.captureException(err, {
					tags: {
						weather_api: "open_meteo",
						attempts: attempt + 1,
					},
					extra: {
						location,
						passTime: passTime.toISOString(),
					},
				});
				console.warn("Weather fetch failed after retries:", err);
				return null;
			}
		}

		return null;
	});
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Find the closest hourly weather data to the pass time
 */
function findClosestWeather(
	hourly: {
		time: string[];
		cloud_cover: (number | null)[];
		visibility: (number | null)[];
	},
	passTime: Date,
): WeatherConditions {
	const targetTime = passTime.getTime();
	let closestIndex = 0;
	let closestDiff = Number.POSITIVE_INFINITY;

	for (let i = 0; i < hourly.time.length; i++) {
		const diff = Math.abs(new Date(hourly.time[i]).getTime() - targetTime);
		if (diff < closestDiff) {
			closestDiff = diff;
			closestIndex = i;
		}
	}

	// Handle null/undefined values from API (Open-Meteo uses null for missing data)
	const rawCloudCover = hourly.cloud_cover[closestIndex];
	const rawVisibility = hourly.visibility[closestIndex];

	// If we got null values, try to find the nearest non-null value
	let cloudCover = rawCloudCover;
	let visibility = rawVisibility;

	if (cloudCover === null || cloudCover === undefined) {
		// Search forward and backward for a valid value
		for (let offset = 1; offset < hourly.cloud_cover.length; offset++) {
			const forwardIdx = closestIndex + offset;
			const backwardIdx = closestIndex - offset;

			if (
				forwardIdx < hourly.cloud_cover.length &&
				hourly.cloud_cover[forwardIdx] != null
			) {
				cloudCover = hourly.cloud_cover[forwardIdx];
				break;
			}
			if (backwardIdx >= 0 && hourly.cloud_cover[backwardIdx] != null) {
				cloudCover = hourly.cloud_cover[backwardIdx];
				break;
			}
		}
		// If still null, use default
		if (cloudCover === null || cloudCover === undefined) {
			cloudCover = 50;
		}
	}

	if (visibility === null || visibility === undefined) {
		// Search forward and backward for a valid value
		for (let offset = 1; offset < hourly.visibility.length; offset++) {
			const forwardIdx = closestIndex + offset;
			const backwardIdx = closestIndex - offset;

			if (
				forwardIdx < hourly.visibility.length &&
				hourly.visibility[forwardIdx] != null
			) {
				visibility = hourly.visibility[forwardIdx];
				break;
			}
			if (backwardIdx >= 0 && hourly.visibility[backwardIdx] != null) {
				visibility = hourly.visibility[backwardIdx];
				break;
			}
		}
		// If still null, use default
		if (visibility === null || visibility === undefined) {
			visibility = 10000;
		}
	}

	return {
		timestamp: new Date(hourly.time[closestIndex]),
		cloudCover: Number(cloudCover),
		visibility: Number(visibility),
		isFavorable: deriveWeatherFavorability(
			Number(cloudCover),
			Number(visibility),
		),
	};
}

/**
 * Get weather forecast for multiple days (for pass list view)
 *
 * @param location - Observer location
 * @param days - Number of days to forecast (1-14)
 * @returns Array of hourly weather conditions or null if unavailable
 */
export async function getWeatherForecast(
	location: LatLng,
	days: number = 7,
): Promise<WeatherConditions[] | null> {
	return Sentry.startSpan({ name: "Fetch Weather Forecast" }, async () => {
		try {
			const url = new URL(OPEN_METEO_URL);
			url.searchParams.set("latitude", String(location.lat));
			url.searchParams.set("longitude", String(location.lng));
			url.searchParams.set("hourly", "cloud_cover,visibility");
			url.searchParams.set("forecast_days", String(Math.min(days, 14)));
			url.searchParams.set("timezone", "auto"); // Auto-detect timezone based on location

			const response = await fetch(url.toString());

			if (!response.ok) {
				Sentry.captureMessage(
					`Weather forecast API returned ${response.status} ${response.statusText}`,
					{
						level: "warning",
						tags: {
							weather_api: "open_meteo",
							status_code: response.status,
						},
					},
				);
				return null;
			}

			const data = (await response.json()) as OpenMeteoResponse;

			if (!data.hourly?.time) {
				Sentry.captureMessage(
					"Weather forecast API response missing time data",
					{
						level: "warning",
						tags: {
							weather_api: "open_meteo",
						},
					},
				);
				return null;
			}

			return data.hourly.time.map((time, i) => {
				const cloudCover = data.hourly.cloud_cover[i] ?? 50;
				const visibility = data.hourly.visibility[i] ?? 10000;

				return {
					timestamp: new Date(time),
					cloudCover,
					visibility,
					isFavorable: deriveWeatherFavorability(cloudCover, visibility),
				};
			});
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			Sentry.captureException(err, {
				tags: {
					weather_api: "open_meteo",
					function: "getWeatherForecast",
				},
				extra: {
					location,
					days,
				},
			});
			console.warn("Weather forecast fetch failed:", error);
			return null;
		}
	});
}
