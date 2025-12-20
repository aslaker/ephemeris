/**
 * Copilot Type Definitions
 *
 * Re-exports from contracts for convenience.
 * Feature: 007-observation-copilot
 */

export type {
	ChatRequest,
	ChatResponse,
	ContextCondition,
	Conversation,
	ConversationContext,
	ConversationStoreState,
	GetPassesParams,
	GetWeatherParams,
	ISSPositionResult,
	KnowledgeCategory,
	KnowledgeEntry,
	KnowledgeResult,
	LatLng,
	LocationResult,
	Message,
	MessageError,
	MessageErrorCode,
	MessageLink,
	MessageRole,
	PassesResult,
	PromptCategory,
	RequestQueueState,
	SearchKnowledgeParams,
	SuggestedPrompt,
	ToolCall,
	ToolCallStatus,
	ToolName,
	WeatherResult,
} from "../../../specs/007-observation-copilot/contracts/api-interfaces";

export {
	AGENT_TOOLS,
	ChatRequestSchema,
	ConversationContextSchema,
	GetPassesParamsSchema,
	GetWeatherParamsSchema,
	LatLngSchema,
	SearchKnowledgeParamsSchema,
} from "../../../specs/007-observation-copilot/contracts/api-interfaces";
