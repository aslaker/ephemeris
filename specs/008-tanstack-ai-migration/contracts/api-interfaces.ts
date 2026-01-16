/**
 * API Contracts: AI Framework Migration
 *
 * Type definitions for migrating from @cloudflare/ai-utils to Cloudflare Agents SDK.
 * These interfaces define the structure of the new AI configuration and tool patterns.
 *
 * Feature: 008-tanstack-ai-migration
 */

import type { z } from "zod";

// =============================================================================
// AI CONFIGURATION
// =============================================================================

/**
 * Retry configuration for AI requests
 */
export interface RetryConfig {
	/** Maximum retry attempts */
	maxAttempts: number;
	/** Base delay between retries in ms */
	baseDelayMs: number;
	/** Exponential backoff multiplier */
	backoffMultiplier: number;
}

/**
 * Feature flags for AI behavior
 */
export interface AIFeatureFlags {
	/** Enable streaming responses */
	streamingEnabled: boolean;
	/** Enable verbose Sentry instrumentation */
	verboseInstrumentation: boolean;
}

/**
 * Centralized AI configuration
 *
 * @see FR-004: Unified AI configuration across features
 */
export interface AIConfig {
	/** Model identifier for Cloudflare Workers AI */
	modelId: string;
	/** Maximum tool call iterations per request */
	maxIterations: number;
	/** Request timeout in milliseconds */
	timeoutMs: number;
	/** Retry configuration */
	retry: RetryConfig;
	/** Feature flags for AI behavior */
	features: AIFeatureFlags;
}

/**
 * Default AI configuration values
 */
export const DEFAULT_AI_CONFIG: AIConfig = {
	modelId: "@cf/meta/llama-3.1-8b-instruct",
	maxIterations: 5,
	timeoutMs: 30000,
	retry: {
		maxAttempts: 2,
		baseDelayMs: 1000,
		backoffMultiplier: 2,
	},
	features: {
		streamingEnabled: false,
		verboseInstrumentation: true,
	},
};

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

/**
 * Generic tool definition structure for Agents SDK
 *
 * @template TParams - Zod schema type for parameters
 * @template TResult - Return type of the execute function
 */
export interface ToolDefinition<
	TParams extends z.ZodTypeAny = z.ZodTypeAny,
	TResult = unknown,
> {
	/** Human-readable description for AI model */
	description: string;
	/** Zod schema for parameter validation */
	parameters: TParams;
	/** Async function to execute the tool */
	execute: (params: z.infer<TParams>) => Promise<TResult>;
}

/**
 * Tool names used in the copilot agent
 */
export type CopilotToolName =
	| "get_iss_position"
	| "get_upcoming_passes"
	| "get_pass_weather"
	| "get_user_location"
	| "search_knowledge_base";

/**
 * Tool execution result
 */
export interface ToolExecutionResult<T = unknown> {
	/** Tool that was executed */
	toolName: string;
	/** Whether execution succeeded */
	success: boolean;
	/** Result data on success */
	data?: T;
	/** Error information on failure */
	error?: ToolError;
	/** Execution duration in ms */
	durationMs: number;
}

/**
 * Tool error information
 */
export interface ToolError {
	/** Error code for categorization */
	code: string;
	/** Human-readable error message */
	message: string;
	/** Whether error is retryable */
	retryable: boolean;
}

// =============================================================================
// CHAT MESSAGES
// =============================================================================

/**
 * Message role in conversation
 */
export type ChatMessageRole = "system" | "user" | "assistant" | "tool";

/**
 * Tool call information for tool messages
 */
export interface ToolCallInfo {
	/** Tool name that was called */
	name: string;
	/** Tool execution result */
	result: string;
}

/**
 * Chat message for AI model interaction
 */
export interface ChatMessage {
	/** Message role */
	role: ChatMessageRole;
	/** Message content */
	content: string;
	/** Tool call information (for tool role) */
	toolCall?: ToolCallInfo;
}

// =============================================================================
// DATA SANITIZATION
// =============================================================================

/**
 * Sanitization action types
 */
export type SanitizationAction = "redact" | "mask" | "exclude";

/**
 * Contexts where sanitization applies
 */
export type SanitizationContext = "logging" | "sentry" | "ai_prompt";

/**
 * Sanitization rule definition
 *
 * @see FR-018: Data sanitization requirements
 */
export interface SanitizationRule {
	/** Field path to sanitize (dot notation) */
	fieldPath: string;
	/** Sanitization action */
	action: SanitizationAction;
	/** Contexts where rule applies */
	contexts: SanitizationContext[];
}

/**
 * Default sanitization rules for sensitive data
 */
export const SANITIZATION_RULES: SanitizationRule[] = [
	{
		fieldPath: "location",
		action: "redact",
		contexts: ["logging", "sentry"],
	},
	{
		fieldPath: "userLocation",
		action: "redact",
		contexts: ["logging", "sentry"],
	},
	{
		fieldPath: "lat",
		action: "redact",
		contexts: ["logging", "sentry"],
	},
	{
		fieldPath: "lng",
		action: "redact",
		contexts: ["logging", "sentry"],
	},
];

// =============================================================================
// AGENTS SDK TYPES (Re-exports for convenience)
// =============================================================================

/**
 * Tool function type for Agents SDK
 * Used with: import { tool } from 'agents/tool'
 */
export type AgentTool<
	TParams extends z.ZodTypeAny = z.ZodTypeAny,
	TResult = unknown,
> = {
	description: string;
	parameters: TParams;
	execute: (params: z.infer<TParams>) => Promise<TResult>;
};

/**
 * RunWithTools options for Agents SDK
 */
export interface RunWithToolsOptions {
	/** AI model binding */
	model: unknown; // Cloudflare AI binding
	/** Model identifier */
	modelId: string;
	/** Messages array or single prompt */
	messages?: ChatMessage[];
	prompt?: string;
	/** Tools available for the model to call */
	tools: AgentTool[];
	/** Maximum iterations for tool calls */
	maxIterations?: number;
}

/**
 * RunWithTools result from Agents SDK
 */
export interface RunWithToolsResult {
	/** Final text response from the model */
	text: string;
	/** Tool calls made during execution */
	toolCalls?: Array<{
		name: string;
		args: unknown;
		result: unknown;
	}>;
}

// =============================================================================
// MIGRATION HELPERS
// =============================================================================

/**
 * Maps legacy tool format to Agents SDK format
 * Used during migration to convert existing tool definitions
 */
export interface LegacyToolFormat {
	name: string;
	description: string;
	parameters: {
		type: "object";
		properties: Record<
			string,
			{
				type: string;
				description?: string;
			}
		>;
		required?: string[];
	};
	function: (...args: unknown[]) => Promise<string>;
}

/**
 * Migration status tracking
 */
export interface MigrationStatus {
	/** Feature being migrated */
	feature: "copilot" | "briefing" | "config";
	/** Migration status */
	status: "pending" | "in_progress" | "complete" | "failed";
	/** Completion percentage */
	progress: number;
	/** Last updated timestamp */
	updatedAt: number;
	/** Error message if failed */
	error?: string;
}
