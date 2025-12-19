/**
 * Weather Client
 *
 * Integration with Open-Meteo API for weather conditions.
 * Used to enhance AI briefings with real weather data.
 * Includes caching and rate limiting to prevent 429 errors.
 */

import * as Sentry from "@sentry/tanstackstart-react";
import { ensureSentryInitialized } from "./sentry-init";
import type { LatLng, OpenMeteoResponse, WeatherConditions } from "./types";
import { deriveWeatherFavorability } from "./types";

// =============================================================================
// CONSTANTS
// =============================================================================

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

// Cache settings
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes - weather doesn't change that fast
const CACHE_MAX_SIZE = 100; // Maximum cache entries

// Rate limiting settings
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 requests per minute
const MIN_REQUEST_INTERVAL_MS = 100; // Minimum 100ms between requests

// =============================================================================
// CACHE IMPLEMENTATION
// =============================================================================

interface CacheEntry {
	data: OpenMeteoResponse;
	timestamp: number;
}

// In-memory cache for weather data
const weatherCache = new Map<string, CacheEntry>();

/**
 * Generate cache key from location and forecast days
 */
function getCacheKey(location: LatLng, forecastDays: number): string {
	// Round to 2 decimal places to improve cache hit rate for nearby locations
	const lat = Math.round(location.lat * 100) / 100;
	const lng = Math.round(location.lng * 100) / 100;
	return `${lat},${lng},${forecastDays}`;
}

/**
 * Get cached weather data if available and fresh
 */
function getCachedWeather(
	location: LatLng,
	forecastDays: number,
): OpenMeteoResponse | null {
	const key = getCacheKey(location, forecastDays);
	const entry = weatherCache.get(key);

	if (!entry) {
		return null;
	}

	// Check if cache entry is still fresh
	const age = Date.now() - entry.timestamp;
	if (age > CACHE_TTL_MS) {
		weatherCache.delete(key);
		return null;
	}

	console.log(
		`[Weather Cache] Hit for ${key} (age: ${Math.round(age / 1000)}s)`,
	);
	return entry.data;
}

/**
 * Store weather data in cache
 */
function setCachedWeather(
	location: LatLng,
	forecastDays: number,
	data: OpenMeteoResponse,
): void {
	const key = getCacheKey(location, forecastDays);

	// Implement simple LRU by removing oldest entry if cache is full
	if (weatherCache.size >= CACHE_MAX_SIZE) {
		const oldestKey = weatherCache.keys().next().value;
		if (oldestKey) {
			weatherCache.delete(oldestKey);
		}
	}

	weatherCache.set(key, {
		data,
		timestamp: Date.now(),
	});
	console.log(`[Weather Cache] Stored ${key}`);
}

/**
 * Clear expired cache entries (cleanup)
 */
function cleanupCache(): void {
	const now = Date.now();
	let cleaned = 0;

	for (const [key, entry] of weatherCache.entries()) {
		if (now - entry.timestamp > CACHE_TTL_MS) {
			weatherCache.delete(key);
			cleaned++;
		}
	}

	if (cleaned > 0) {
		console.log(`[Weather Cache] Cleaned ${cleaned} expired entries`);
	}
}

// =============================================================================
// RATE LIMITING
// =============================================================================

interface RateLimitState {
	requests: number[];
	lastRequestTime: number;
}

// Track requests globally
const rateLimitState: RateLimitState = {
	requests: [],
	lastRequestTime: 0,
};

/**
 * Check if we can make a request without exceeding rate limits
 */
async function checkRateLimit(): Promise<void> {
	const now = Date.now();

	// Clean up old requests outside the window
	rateLimitState.requests = rateLimitState.requests.filter(
		(timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
	);

	// Check if we've exceeded the rate limit
	if (rateLimitState.requests.length >= MAX_REQUESTS_PER_WINDOW) {
		const oldestRequest = Math.min(...rateLimitState.requests);
		const waitTime = RATE_LIMIT_WINDOW_MS - (now - oldestRequest);

		console.warn(
			`[Weather API] Rate limit reached, waiting ${Math.round(waitTime / 1000)}s`,
		);

		Sentry.captureMessage("Weather API rate limit triggered", {
			level: "warning",
			tags: {
				weather_api: "open_meteo",
				rate_limit: "triggered",
			},
			extra: {
				requestsInWindow: rateLimitState.requests.length,
				waitTimeMs: waitTime,
			},
		});

		// Wait until we can make the request
		await new Promise((resolve) => setTimeout(resolve, waitTime + 100));

		// Clean up again after waiting
		const afterWait = Date.now();
		rateLimitState.requests = rateLimitState.requests.filter(
			(timestamp) => afterWait - timestamp < RATE_LIMIT_WINDOW_MS,
		);
	}

	// Ensure minimum interval between requests
	const timeSinceLastRequest = now - rateLimitState.lastRequestTime;
	if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
		const waitTime = MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
		await new Promise((resolve) => setTimeout(resolve, waitTime));
	}

	// Record this request
	const requestTime = Date.now();
	rateLimitState.requests.push(requestTime);
	rateLimitState.lastRequestTime = requestTime;
}

/**
 * Fetch weather data with caching and rate limiting
 */
async function fetchWeatherData(
	location: LatLng,
	forecastDays: number,
): Promise<OpenMeteoResponse | null> {
	// Check cache first
	const cached = getCachedWeather(location, forecastDays);
	if (cached) {
		return cached;
	}

	// Apply rate limiting
	await checkRateLimit();

	// Build URL
	const url = new URL(OPEN_METEO_URL);
	url.searchParams.set("latitude", String(location.lat));
	url.searchParams.set("longitude", String(location.lng));
	url.searchParams.set("hourly", "cloud_cover,visibility");
	url.searchParams.set("forecast_days", String(forecastDays));
	url.searchParams.set("timezone", "auto");

	// Create timeout controller
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 10000);

	try {
		const response = await fetch(url.toString(), {
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			const errorMessage = `Weather API returned ${response.status} ${response.statusText}`;
			console.error(`[Weather API Error] ${errorMessage}`);

			Sentry.captureMessage(errorMessage, {
				level: "warning",
				tags: {
					weather_api: "open_meteo",
					status_code: response.status,
				},
				extra: {
					url: url.toString(),
					location,
				},
			});

			return null;
		}

		const data = (await response.json()) as OpenMeteoResponse;

		// Validate response structure
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
			console.warn(errorMessage);
			return null;
		}

		// Store in cache
		setCachedWeather(location, forecastDays, data);

		// Cleanup old cache entries periodically
		if (Math.random() < 0.1) {
			// 10% chance on each request
			cleanupCache();
		}

		return data;
	} catch (error) {
		clearTimeout(timeoutId);

		const err = error instanceof Error ? error : new Error(String(error));

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

		Sentry.captureException(err, {
			tags: {
				weather_api: "open_meteo",
			},
			extra: {
				location,
				forecastDays,
			},
		});
		console.warn("Weather fetch failed:", err);
		return null;
	}
}

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
	ensureSentryInitialized();
	return Sentry.startSpan({ name: "Fetch Weather for Pass" }, async () => {
		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				// Use cached fetch with rate limiting
				const data = await fetchWeatherData(location, 7);

				if (!data) {
					if (attempt < maxRetries) {
						// Retry on failure
						await new Promise((resolve) =>
							setTimeout(resolve, 1000 * (attempt + 1)),
						);
						continue;
					}
					return null;
				}

				return findClosestWeather(data.hourly, passTime);
			} catch (error) {
				const err = error instanceof Error ? error : new Error(String(error));

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
	ensureSentryInitialized();
	return Sentry.startSpan({ name: "Fetch Weather Forecast" }, async () => {
		try {
			// Use cached fetch with rate limiting
			const data = await fetchWeatherData(location, Math.min(days, 14));

			if (!data) {
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
