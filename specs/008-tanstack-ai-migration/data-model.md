# Data Model: AI Framework Migration

**Feature**: 008-tanstack-ai-migration  
**Created**: December 20, 2025  
**Status**: Complete

## Overview

This document defines the data entities for the AI framework migration from `@cloudflare/ai-utils` to Cloudflare Agents SDK. The migration primarily affects the internal structure of tool definitions and AI configuration, while maintaining identical external behavior and data contracts.

---

## Entity Definitions

### Tool Definition

Represents an AI-callable function with schema validation.

```typescript
interface ToolDefinition<TParams = unknown, TResult = unknown> {
  /** Unique tool name (snake_case) */
  name: string
  
  /** Human-readable description for AI model */
  description: string
  
  /** Zod schema for parameter validation */
  parameters: ZodSchema<TParams>
  
  /** Async function to execute the tool */
  execute: (params: TParams) => Promise<TResult>
}
```

**Field Details**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Unique identifier, snake_case format |
| description | string | Yes | Natural language description for AI |
| parameters | ZodSchema | Yes | Zod schema defining input structure |
| execute | function | Yes | Implementation function |

**Validation Rules**:
- Name must be unique across all tools
- Name must be snake_case format
- Description should be concise but informative
- Parameters schema must be a valid Zod schema

**Example**:
```typescript
{
  name: 'get_iss_position',
  description: 'Get the current position of the International Space Station',
  parameters: z.object({}),
  execute: async () => ({ latitude: 51.5, longitude: -0.1, altitude: 408 }),
}
```

---

### AI Configuration

Centralized configuration for all AI interactions.

```typescript
interface AIConfig {
  /** Model identifier for Cloudflare Workers AI */
  modelId: string
  
  /** Maximum tool call iterations per request */
  maxIterations: number
  
  /** Request timeout in milliseconds */
  timeoutMs: number
  
  /** Retry configuration */
  retry: RetryConfig
  
  /** Feature flags for AI behavior */
  features: AIFeatureFlags
}

interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number
  
  /** Base delay between retries in ms */
  baseDelayMs: number
  
  /** Exponential backoff multiplier */
  backoffMultiplier: number
}

interface AIFeatureFlags {
  /** Enable streaming responses */
  streamingEnabled: boolean
  
  /** Enable verbose Sentry instrumentation */
  verboseInstrumentation: boolean
}
```

**Field Details**:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| modelId | string | '@cf/meta/llama-3.1-8b-instruct' | Cloudflare AI model |
| maxIterations | number | 5 | Max tool call loops |
| timeoutMs | number | 30000 | Request timeout |
| retry.maxAttempts | number | 2 | Max retries on failure |
| retry.baseDelayMs | number | 1000 | Initial retry delay |
| retry.backoffMultiplier | number | 2 | Backoff multiplier |
| features.streamingEnabled | boolean | false | Stream responses |
| features.verboseInstrumentation | boolean | true | Detailed Sentry spans |

**Validation Rules**:
- modelId must be a valid Cloudflare AI model identifier
- maxIterations must be 1-10
- timeoutMs must be 1000-120000
- maxAttempts must be 0-5

---

### Chat Message

Represents a message in the conversation context.

```typescript
interface ChatMessage {
  /** Message role */
  role: 'system' | 'user' | 'assistant' | 'tool'
  
  /** Message content */
  content: string
  
  /** Tool call information (for tool role) */
  toolCall?: ToolCallInfo
}

interface ToolCallInfo {
  /** Tool name that was called */
  name: string
  
  /** Tool execution result */
  result: string
}
```

**Field Details**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| role | enum | Yes | Message author role |
| content | string | Yes | Message text content |
| toolCall | ToolCallInfo | No | Tool execution details |

**State Transitions**:
- Messages are immutable once created
- Tool messages always follow assistant messages containing tool calls

---

### Tool Execution Result

Output from executing a tool.

```typescript
interface ToolExecutionResult<T = unknown> {
  /** Tool that was executed */
  toolName: string
  
  /** Whether execution succeeded */
  success: boolean
  
  /** Result data on success */
  data?: T
  
  /** Error information on failure */
  error?: ToolError
  
  /** Execution duration in ms */
  durationMs: number
}

interface ToolError {
  /** Error code for categorization */
  code: string
  
  /** Human-readable error message */
  message: string
  
  /** Whether error is retryable */
  retryable: boolean
}
```

**Field Details**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| toolName | string | Yes | Name of executed tool |
| success | boolean | Yes | Execution success status |
| data | T | No | Result data (if success) |
| error | ToolError | No | Error info (if failed) |
| durationMs | number | Yes | Execution time |

---

### Data Sanitization Rules

Specification for protecting sensitive data.

```typescript
interface SanitizationRule {
  /** Field path to sanitize (dot notation) */
  fieldPath: string
  
  /** Sanitization action */
  action: 'redact' | 'mask' | 'exclude'
  
  /** Contexts where rule applies */
  contexts: ('logging' | 'sentry' | 'ai_prompt')[]
}
```

**Defined Rules**:

| Field Path | Action | Contexts | Rationale |
|------------|--------|----------|-----------|
| `location.lat` | redact | logging, sentry | User privacy |
| `location.lng` | redact | logging, sentry | User privacy |
| `userLocation.*` | redact | logging, sentry | User privacy |
| `coordinates.*` | mask | sentry | Show presence, not value |

**Implementation**:
```typescript
const SANITIZATION_RULES: SanitizationRule[] = [
  {
    fieldPath: 'location',
    action: 'redact',
    contexts: ['logging', 'sentry'],
  },
  {
    fieldPath: 'userLocation',
    action: 'redact',
    contexts: ['logging', 'sentry'],
  },
]
```

---

## Entity Relationships

```
┌─────────────────────┐
│    AIConfig         │
│  (singleton)        │
└──────────┬──────────┘
           │ configures
           ▼
┌─────────────────────┐        ┌─────────────────────┐
│   CopilotAgent      │◄───────│   ToolDefinition    │
│                     │  uses  │   (1..n)            │
└──────────┬──────────┘        └─────────────────────┘
           │
           │ processes
           ▼
┌─────────────────────┐        ┌─────────────────────┐
│   ChatMessage[]     │───────►│ ToolExecutionResult │
│   (conversation)    │ yields │   (per tool call)   │
└─────────────────────┘        └─────────────────────┘
```

---

## Migration Mapping

### From @cloudflare/ai-utils to Agents SDK

| Current Entity | New Entity | Changes |
|----------------|------------|---------|
| Tool object (inline) | ToolDefinition | Moved to `tool()` function |
| `runWithTools()` | Agent `runWithTools()` | Similar API, new import |
| Message array | ChatMessage[] | No change |
| AI binding (env.AI) | Agent env.AI | No change |

### Tool Definition Migration

**Before (@cloudflare/ai-utils)**:
```typescript
const tools = [
  {
    name: 'get_iss_position',
    description: 'Get ISS position',
    parameters: {
      type: 'object',
      properties: {},
    },
    function: getISSPosition,
  },
]
```

**After (Agents SDK)**:
```typescript
const getISSPositionTool = tool({
  description: 'Get ISS position',
  parameters: z.object({}),
  execute: getISSPosition,
})
```

**Key Differences**:
1. Uses `tool()` function instead of object literal
2. Name derived from variable or explicit property
3. Parameters use Zod schema instead of JSON schema
4. `function` becomes `execute`

---

## Existing Entities (Unchanged)

These entities from feature 007 remain unchanged and are reused:

- `Message` - UI message type
- `Conversation` - Conversation state
- `ConversationContext` - Context for API requests
- `ChatRequest` - Request payload
- `ChatResponse` - Response payload
- `LatLng` - Location coordinates
- All tool result types (ISSPositionResult, PassesResult, etc.)

See: `/specs/007-observation-copilot/contracts/api-interfaces.ts`



