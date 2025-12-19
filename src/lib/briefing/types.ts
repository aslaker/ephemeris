/**
 * API Contracts: AI Pass Briefing
 *
 * TypeScript interfaces and Zod schemas for the AI Pass Briefing feature.
 * These contracts define the shape of data exchanged between components,
 * APIs, and storage layers.
 *
 * Feature Branch: 006-ai-pass-briefing
 * Date: 2024-12-17
 */

import { z } from "zod";

// =============================================================================
// CORE DOMAIN ENTITIES
// =============================================================================

/**
 * User's observation location with persistence metadata
 */
export const UserLocationSchema = z.object({
	id: z.string().uuid(),
	coordinates: z.object({
		lat: z.number().min(-90).max(90),
		lng: z.number().min(-180).max(180),
	}),
	displayName: z.string().max(100).nullable(),
	source: z.enum(["geolocation", "manual", "search"]),
	lastUpdated: z.number().positive(),
});

export type UserLocation = z.infer<typeof UserLocationSchema>;

/**
 * Simplified location for calculations (coordinates only)
 */
export const LatLngSchema = z.object({
	lat: z.number().min(-90).max(90),
	lng: z.number().min(-180).max(180),
});

export type LatLng = z.infer<typeof LatLngSchema>;

/**
 * Point on orbital trajectory
 */
export const OrbitalPointSchema = z.object({
	lat: z.number(),
	lng: z.number(),
	alt: z.number().positive(),
});

export type OrbitalPoint = z.infer<typeof OrbitalPointSchema>;

/**
 * Pass quality rating based on maximum elevation
 */
export const PassQualitySchema = z.enum(["excellent", "good", "fair", "poor"]);

export type PassQuality = z.infer<typeof PassQualitySchema>;

/**
 * Derive pass quality from elevation
 */
export function derivePassQuality(maxElevation: number): PassQuality {
	if (maxElevation >= 60) return "excellent";
	if (maxElevation >= 40) return "good";
	if (maxElevation >= 25) return "fair";
	return "poor";
}

/**
 * Predicted ISS pass for observer location
 */
export const PassPredictionSchema = z.object({
	id: z.string().startsWith("pass-"),
	startTime: z.coerce.date(),
	endTime: z.coerce.date(),
	maxElevation: z.number().min(10).max(90),
	duration: z.number().positive(),
	path: z.array(OrbitalPointSchema).min(2),
	quality: PassQualitySchema,
});

export type PassPrediction = z.infer<typeof PassPredictionSchema>;

// =============================================================================
// WEATHER DATA
// =============================================================================

/**
 * Weather conditions at a point in time
 */
export const WeatherConditionsSchema = z.object({
	timestamp: z.coerce.date(),
	cloudCover: z.number().min(0).max(100),
	visibility: z.number().positive(), // meters
	isFavorable: z.boolean(),
});

export type WeatherConditions = z.infer<typeof WeatherConditionsSchema>;

/**
 * Derive weather favorability
 */
export function deriveWeatherFavorability(
	cloudCover: number,
	visibility: number,
): boolean {
	return cloudCover < 50 && visibility > 10000;
}

/**
 * Open-Meteo API response shape
 */
export const OpenMeteoResponseSchema = z.object({
	latitude: z.number(),
	longitude: z.number(),
	hourly: z.object({
		time: z.array(z.string()),
		cloud_cover: z.array(z.number().nullable()),
		visibility: z.array(z.number().nullable()),
	}),
});

export type OpenMeteoResponse = z.infer<typeof OpenMeteoResponseSchema>;

// =============================================================================
// AI BRIEFING
// =============================================================================

/**
 * Briefing viewing window details
 */
export const ViewingWindowSchema = z.object({
	optimalStart: z.coerce.date(),
	description: z.string().max(150),
});

export type ViewingWindow = z.infer<typeof ViewingWindowSchema>;

/**
 * Briefing elevation details
 */
export const ElevationDetailsSchema = z.object({
	max: z.number().min(10).max(90),
	direction: z.string(), // Cardinal direction, e.g., "Northwest"
});

export type ElevationDetails = z.infer<typeof ElevationDetailsSchema>;

/**
 * Briefing brightness information
 */
export const BrightnessInfoSchema = z.object({
	magnitude: z.number().min(-4).max(2).optional(),
	description: z.string(), // e.g., "Brighter than Venus"
});

export type BrightnessInfo = z.infer<typeof BrightnessInfoSchema>;

/**
 * Weather conditions for briefing
 */
export const BriefingConditionsSchema = z.object({
	cloudCover: z.number().min(0).max(100),
	visibility: z.number().positive(),
	recommendation: z.string().max(200),
});

export type BriefingConditions = z.infer<typeof BriefingConditionsSchema>;

/**
 * AI-generated pass briefing
 */
export const PassBriefingSchema = z.object({
	id: z.string(),
	passId: z.string(),
	summary: z.string().max(200),
	narrative: z.string().max(2000),
	viewingWindow: ViewingWindowSchema,
	elevation: ElevationDetailsSchema,
	brightness: BrightnessInfoSchema,
	conditions: BriefingConditionsSchema.optional(),
	tips: z.array(z.string()).min(1).max(5),
	generatedAt: z.number().positive(),
	weatherIncluded: z.boolean(),
});

export type PassBriefing = z.infer<typeof PassBriefingSchema>;

/**
 * Stored briefing in IndexedDB (extends PassBriefing with pass data)
 */
export const StoredBriefingSchema = PassBriefingSchema.extend({
	passData: PassPredictionSchema,
});

export type StoredBriefing = z.infer<typeof StoredBriefingSchema>;

// =============================================================================
// DATE RANGE
// =============================================================================

/**
 * Date range for pass listing
 */
export const PassDateRangeSchema = z
	.object({
		startDate: z.coerce.date(),
		endDate: z.coerce.date(),
	})
	.refine((data) => data.endDate > data.startDate, {
		message: "End date must be after start date",
	})
	.refine(
		(data) => {
			const diffDays = Math.ceil(
				(data.endDate.getTime() - data.startDate.getTime()) /
					(1000 * 60 * 60 * 24),
			);
			return diffDays <= 14;
		},
		{
			message: "Date range cannot exceed 14 days",
		},
	);

export type PassDateRange = z.infer<typeof PassDateRangeSchema>;

// =============================================================================
// SERVER FUNCTION CONTRACTS
// =============================================================================

/**
 * Request to generate AI briefing
 */
export const GenerateBriefingRequestSchema = z.object({
	passId: z.string(),
	passData: PassPredictionSchema,
	location: LatLngSchema,
	weather: WeatherConditionsSchema.nullable().optional(),
	includeWeather: z.boolean().default(true),
});

export type GenerateBriefingRequest = z.infer<
	typeof GenerateBriefingRequestSchema
>;

/**
 * Response from AI briefing generation
 */
export const GenerateBriefingResponseSchema = z.discriminatedUnion("status", [
	z.object({
		status: z.literal("success"),
		briefing: PassBriefingSchema,
	}),
	z.object({
		status: z.literal("error"),
		error: z.string(),
		fallbackData: PassPredictionSchema.optional(),
	}),
]);

export type GenerateBriefingResponse = z.infer<
	typeof GenerateBriefingResponseSchema
>;

/**
 * Request for multiple pass predictions
 */
export const PredictPassesRequestSchema = z.object({
	location: LatLngSchema,
	maxPasses: z.number().min(1).max(20).default(10),
	maxDays: z.number().min(1).max(14).default(7),
	minElevation: z.number().min(5).max(45).default(10),
});

export type PredictPassesRequest = z.infer<typeof PredictPassesRequestSchema>;

/**
 * Response with multiple pass predictions
 */
export const PredictPassesResponseSchema = z.object({
	passes: z.array(PassPredictionSchema),
	location: LatLngSchema,
	generatedAt: z.number(),
	dateRange: z.object({
		start: z.coerce.date(),
		end: z.coerce.date(),
	}),
});

export type PredictPassesResponse = z.infer<typeof PredictPassesResponseSchema>;

// =============================================================================
// CLOUDFLARE WORKERS AI CONTRACTS
// =============================================================================

/**
 * Message format for Cloudflare Workers AI
 */
export const AIMessageSchema = z.object({
	role: z.enum(["system", "user", "assistant"]),
	content: z.string(),
});

export type AIMessage = z.infer<typeof AIMessageSchema>;

/**
 * Cloudflare Workers AI text generation request
 */
export const CFAIRequestSchema = z.object({
	messages: z.array(AIMessageSchema),
	max_tokens: z.number().positive().default(500),
	temperature: z.number().min(0).max(2).default(0.7),
});

export type CFAIRequest = z.infer<typeof CFAIRequestSchema>;

/**
 * Cloudflare Workers AI text generation response
 */
export const CFAIResponseSchema = z.object({
	response: z.string(),
});

export type CFAIResponse = z.infer<typeof CFAIResponseSchema>;

// =============================================================================
// USER SETTINGS
// =============================================================================

/**
 * User preferences stored in IndexedDB
 */
export const UserSettingsSchema = z.object({
	id: z.literal("user-settings"), // Single row
	location: UserLocationSchema.nullable(),
	preferredDateRangeDays: z.number().min(1).max(14).default(7),
	accessibilityPreferences: z.object({
		reducedMotion: z.boolean().default(false),
		highContrast: z.boolean().default(false),
	}),
	lastVisit: z.number().positive(),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

// =============================================================================
// QUERY KEYS
// =============================================================================

/**
 * TanStack Query key patterns for this feature
 */
export const queryKeys = {
	passes: (location: LatLng, maxDays: number) =>
		["passes", location.lat, location.lng, maxDays] as const,

	briefing: (passId: string) => ["briefing", passId] as const,

	weather: (location: LatLng, date: Date) =>
		["weather", location.lat, location.lng, date.toISOString()] as const,

	userLocation: () => ["user-location"] as const,
} as const;

// =============================================================================
// TANSTACK DB COLLECTION TYPES
// =============================================================================

/**
 * Parameters for briefing collection query
 */
export interface BriefingQueryParams {
	passId: string;
	passData: PassPrediction;
	location: LatLng;
	includeWeather?: boolean;
}

/**
 * Collection configuration for TanStack DB
 */
export interface BriefingsCollectionConfig {
	getId: (briefing: PassBriefing) => string;
	queryKey: (params: BriefingQueryParams) => readonly string[];
	queryFn: (params: BriefingQueryParams) => Promise<PassBriefing>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate pass ID from start time
 */
export function generatePassId(startTime: Date): string {
	return `pass-${startTime.getTime()}`;
}

/**
 * Format direction from azimuth angle
 */
export function azimuthToDirection(azimuth: number): string {
	const directions = [
		"North",
		"North-Northeast",
		"Northeast",
		"East-Northeast",
		"East",
		"East-Southeast",
		"Southeast",
		"South-Southeast",
		"South",
		"South-Southwest",
		"Southwest",
		"West-Southwest",
		"West",
		"West-Northwest",
		"Northwest",
		"North-Northwest",
	];
	const index = Math.round(azimuth / 22.5) % 16;
	return directions[index];
}

/**
 * Estimate ISS brightness (magnitude) based on elevation and phase
 * Higher elevation = brighter (lower magnitude)
 */
export function estimateBrightness(maxElevation: number): number {
	// ISS typically ranges from -4 (very bright) to -1 (still visible)
	// Higher elevation = better visibility = brighter
	if (maxElevation >= 80) return -4;
	if (maxElevation >= 60) return -3.5;
	if (maxElevation >= 45) return -3;
	if (maxElevation >= 30) return -2.5;
	return -2;
}

/**
 * Get brightness description based on magnitude
 */
export function getBrightnessDescription(magnitude: number): string {
	if (magnitude <= -4) return "Extremely bright - brighter than Venus";
	if (magnitude <= -3) return "Very bright - comparable to Venus";
	if (magnitude <= -2) return "Bright - easily visible";
	if (magnitude <= -1) return "Moderately bright - visible in suburbs";
	return "Visible in dark skies";
}
