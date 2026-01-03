/**
 * Observation Copilot API Contracts
 *
 * Type definitions for the chat interface and tool-calling agent.
 * These types are used by both client and server code.
 *
 * Feature Branch: 007-observation-copilot
 * Date: 2025-12-19
 */

import { z } from "zod";

// =============================================================================
// CONVERSATION TYPES
// =============================================================================

/**
 * Message role in conversation
 */
export type MessageRole = "user" | "assistant";

/**
 * Tool execution status
 */
export type ToolCallStatus = "pending" | "success" | "error";

/**
 * Available tool names for the agent
 */
export type ToolName =
  | "get_iss_position"
  | "get_upcoming_passes"
  | "get_pass_weather"
  | "get_user_location"
  | "search_knowledge_base";

/**
 * Error codes for chat failures
 */
export type MessageErrorCode =
  | "RATE_LIMIT_EXCEEDED"
  | "AI_UNAVAILABLE"
  | "TOOL_EXECUTION_FAILED"
  | "LOCATION_REQUIRED"
  | "NON_ENGLISH_DETECTED"
  | "UNKNOWN_ERROR";

/**
 * Tool call record within a message
 */
export interface ToolCall {
  id: string;
  name: ToolName;
  parameters: Record<string, unknown>;
  result?: unknown;
  status: ToolCallStatus;
  executionTimeMs?: number;
  error?: string;
}

/**
 * Link embedded in assistant response
 */
export interface MessageLink {
  text: string;
  href: string;
  type: "route" | "external";
}

/**
 * Error details for failed messages
 */
export interface MessageError {
  code: MessageErrorCode;
  message: string;
  retryable: boolean;
}

/**
 * Single message in conversation
 */
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
  links?: MessageLink[];
  isStreaming?: boolean;
  error?: MessageError;
}

/**
 * Conversation session with message history
 */
export interface Conversation {
  id: string;
  messages: Message[];
  createdAt: number;
  lastActivityAt: number;
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

/**
 * Trimmed conversation context for API requests
 */
export interface ConversationContext {
  messages: Array<{
    role: MessageRole;
    content: string;
  }>;
}

/**
 * Location coordinates
 */
export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Chat completion request
 */
export interface ChatRequest {
  message: string;
  conversationContext: ConversationContext;
  location?: LatLng;
}

/**
 * Chat completion response
 */
export interface ChatResponse {
  status: "success" | "error";
  message?: Message;
  error?: {
    code: MessageErrorCode;
    message: string;
  };
}

// =============================================================================
// ZOD SCHEMAS FOR VALIDATION
// =============================================================================

export const LatLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const ConversationContextSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .max(10),
});

export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  conversationContext: ConversationContextSchema.default({ messages: [] }),
  location: LatLngSchema.optional(),
  conversationId: z.string().optional(),
});

// =============================================================================
// TOOL PARAMETER SCHEMAS
// =============================================================================

/**
 * get_upcoming_passes parameters
 */
export const GetPassesParamsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  days: z.number().min(1).max(14).optional().default(7),
  maxPasses: z.number().min(1).max(20).optional().default(5),
});

export type GetPassesParams = z.infer<typeof GetPassesParamsSchema>;

/**
 * get_pass_weather parameters
 */
export const GetWeatherParamsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  passTime: z.string().datetime(),
});

export type GetWeatherParams = z.infer<typeof GetWeatherParamsSchema>;

/**
 * search_knowledge_base parameters
 */
export const SearchKnowledgeParamsSchema = z.object({
  query: z.string().min(1).max(200),
  maxResults: z.number().min(1).max(10).optional().default(3),
});

export type SearchKnowledgeParams = z.infer<typeof SearchKnowledgeParamsSchema>;

// =============================================================================
// TOOL RESULT TYPES
// =============================================================================

/**
 * Result from get_iss_position tool
 */
export interface ISSPositionResult {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  visibility: string;
  timestamp: number;
}

/**
 * Result from get_upcoming_passes tool
 */
export interface PassesResult {
  passes: Array<{
    id: string;
    startTime: string;
    endTime: string;
    duration: number;
    maxElevation: number;
    quality: "excellent" | "good" | "fair" | "poor";
  }>;
  location: {
    lat: number;
    lng: number;
    displayName?: string;
  };
}

/**
 * Result from get_pass_weather tool
 */
export interface WeatherResult {
  cloudCover: number;
  visibility: number;
  isFavorable: boolean;
  recommendation: string;
}

/**
 * Result from get_user_location tool
 */
export interface LocationResult {
  available: boolean;
  coordinates?: LatLng;
  displayName?: string;
  source?: "geolocation" | "manual" | "search";
}

/**
 * Result from search_knowledge_base tool
 */
export interface KnowledgeResult {
  results: Array<{
    id: string;
    title: string;
    content: string;
    category: string;
    relevanceScore: number;
  }>;
}

// =============================================================================
// SUGGESTED PROMPTS
// =============================================================================

export type PromptCategory =
  | "passes"
  | "weather"
  | "position"
  | "crew"
  | "knowledge";

export interface ContextCondition {
  type: "always" | "has_location" | "has_upcoming_pass" | "no_location";
}

export interface SuggestedPrompt {
  id: string;
  text: string;
  category: PromptCategory;
  contextCondition?: ContextCondition;
}

// =============================================================================
// KNOWLEDGE BASE TYPES
// =============================================================================

export type KnowledgeCategory =
  | "specifications"
  | "history"
  | "orbital_mechanics"
  | "observation"
  | "crew"
  | "missions";

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  keywords: string[];
  relatedIds?: string[];
}

// =============================================================================
// CONVERSATION STORE TYPES
// =============================================================================

export interface RequestQueueState {
  activeCount: number;
  queuedCount: number;
}

export interface ConversationStoreState {
  conversation: Conversation | null;
  isLoading: boolean;
  requestQueue: RequestQueueState;
}

// =============================================================================
// TOOL DEFINITIONS FOR WORKERS AI
// =============================================================================

/**
 * Tool definition format for Cloudflare Workers AI
 */
export interface ToolDefinition {
  name: ToolName;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * All available tools for the agent
 */
export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: "get_iss_position",
    description:
      "Get the current position of the International Space Station including latitude, longitude, altitude, and velocity.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_upcoming_passes",
    description:
      "Get upcoming visible ISS passes for a specific location. Returns pass times, durations, and visibility quality.",
    parameters: {
      type: "object",
      properties: {
        lat: {
          type: "number",
          description: "Observer latitude in degrees (-90 to 90)",
        },
        lng: {
          type: "number",
          description: "Observer longitude in degrees (-180 to 180)",
        },
        days: {
          type: "number",
          description: "Number of days to look ahead (default: 7, max: 14)",
        },
        maxPasses: {
          type: "number",
          description: "Maximum passes to return (default: 5, max: 20)",
        },
      },
      required: ["lat", "lng"],
    },
  },
  {
    name: "get_pass_weather",
    description:
      "Get weather conditions for a specific ISS pass time. Returns cloud cover, visibility, and viewing recommendation.",
    parameters: {
      type: "object",
      properties: {
        lat: {
          type: "number",
          description: "Observer latitude in degrees",
        },
        lng: {
          type: "number",
          description: "Observer longitude in degrees",
        },
        passTime: {
          type: "string",
          description: "ISO 8601 datetime string for the pass",
        },
      },
      required: ["lat", "lng", "passTime"],
    },
  },
  {
    name: "get_user_location",
    description:
      "Get the user's saved location from their preferences. Returns coordinates and display name if available.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "search_knowledge_base",
    description:
      "Search the ISS knowledge base for facts about the space station, orbital mechanics, crew, and observation tips.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for ISS-related information",
        },
        maxResults: {
          type: "number",
          description: "Maximum results to return (default: 3)",
        },
      },
      required: ["query"],
    },
  },
];

