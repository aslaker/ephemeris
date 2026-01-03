import type { AIConfig } from "../../../specs/008-tanstack-ai-migration/contracts/api-interfaces";

/**
 * Centralized AI configuration
 *
 * @see FR-004: Unified AI configuration across features
 */
export const AI_CONFIG: AIConfig = {
	// Use Hermes 2 Pro - specifically fine-tuned for function calling
	// This is the model Cloudflare recommends for function calling in their docs
	// See: https://developers.cloudflare.com/workers-ai/features/function-calling/
	modelId: "@hf/nousresearch/hermes-2-pro-mistral-7b",
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

/**
 * Helper to get the current AI model ID
 */
export function getAIModelId(): string {
	return AI_CONFIG.modelId;
}

/**
 * Helper to get the maximum number of tool call iterations
 */
export function getMaxIterations(): number {
	return AI_CONFIG.maxIterations;
}
