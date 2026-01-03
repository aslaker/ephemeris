# Data Model: Observation Copilot

**Feature Branch**: `007-observation-copilot`  
**Date**: 2025-12-19  
**Spec**: [spec.md](./spec.md)

## Overview

This document defines the data structures for the Observation Copilot feature. All entities are designed for TanStack Store (client-side session state) and server function communication.

---

## Core Entities

### Conversation

Represents a session-scoped chat session with message history and metadata.

```typescript
interface Conversation {
  id: string;                    // Unique session ID (UUID)
  messages: Message[];           // Ordered list of messages
  createdAt: number;             // Unix timestamp - session start
  lastActivityAt: number;        // Unix timestamp - last interaction
}
```

**Lifecycle**:
- Created on first user message
- Updated on each message exchange
- Cleared when user navigates away or closes tab

**Constraints**:
- Maximum 10 messages retained OR 15 minutes from creation (whichever is shorter)
- Session-scoped only (no persistence to localStorage/IndexedDB)

---

### Message

Represents a single turn in the conversation (user question or assistant response).

```typescript
interface Message {
  id: string;                    // Unique message ID (UUID)
  role: "user" | "assistant";    // Message author
  content: string;               // Message text content
  timestamp: number;             // Unix timestamp
  toolCalls?: ToolCall[];        // Tools invoked (assistant only)
  links?: MessageLink[];         // Embedded links in response (assistant only)
  isStreaming?: boolean;         // True while response is being generated
  error?: MessageError;          // Error details if failed
}
```

**Validation**:
- `content` must be non-empty string
- `role` must be "user" or "assistant"
- User messages cannot have `toolCalls`

---

### ToolCall

Represents an invocation of a specific tool during response generation.

```typescript
interface ToolCall {
  id: string;                    // Unique tool call ID
  name: ToolName;                // Tool identifier
  parameters: Record<string, unknown>; // Input parameters
  result?: unknown;              // Tool execution result
  status: "pending" | "success" | "error";
  executionTimeMs?: number;      // Duration for observability
  error?: string;                // Error message if failed
}

type ToolName = 
  | "get_iss_position"
  | "get_upcoming_passes"
  | "get_pass_weather"
  | "get_user_location"
  | "search_knowledge_base";
```

---

### MessageLink

Represents a clickable link embedded in an assistant response.

```typescript
interface MessageLink {
  text: string;                  // Display text
  href: string;                  // Route path or URL
  type: "route" | "external";    // Internal route or external URL
}
```

**Examples**:
- `{ text: "View on map", href: "/iss/map", type: "route" }`
- `{ text: "Pass details", href: "/iss/passes?id=abc", type: "route" }`

---

### MessageError

Error information when message generation fails.

```typescript
interface MessageError {
  code: MessageErrorCode;
  message: string;               // User-friendly error message
  retryable: boolean;
}

type MessageErrorCode =
  | "RATE_LIMIT_EXCEEDED"
  | "AI_UNAVAILABLE"
  | "TOOL_EXECUTION_FAILED"
  | "LOCATION_REQUIRED"
  | "NON_ENGLISH_DETECTED"
  | "UNKNOWN_ERROR";
```

---

### SuggestedPrompt

Pre-written question template to help users get started.

```typescript
interface SuggestedPrompt {
  id: string;
  text: string;                  // The question text
  category: PromptCategory;
  contextCondition?: ContextCondition; // When to show this prompt
}

type PromptCategory = 
  | "passes"
  | "weather"
  | "position"
  | "crew"
  | "knowledge";

interface ContextCondition {
  type: "always" | "has_location" | "has_upcoming_pass" | "no_location";
}
```

---

## Request/Response Types

### ChatRequest

Client-to-server request for chat completion.

```typescript
interface ChatRequest {
  message: string;               // User's question
  conversationContext: ConversationContext; // Trimmed history
  location?: LatLng;             // User's location if available
}

interface ConversationContext {
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}
```

**Validation**:
- `message` must be non-empty string, max 1000 characters
- `conversationContext.messages` max 10 entries

---

### ChatResponse

Server-to-client response from chat completion.

```typescript
interface ChatResponse {
  status: "success" | "error";
  message?: Message;             // Generated assistant message
  error?: {
    code: MessageErrorCode;
    message: string;
  };
}
```

---

## Tool Schemas

### get_iss_position

```typescript
// Parameters: None
// Returns:
interface ISSPositionResult {
  latitude: number;
  longitude: number;
  altitude: number;              // km
  velocity: number;              // km/h
  visibility: string;
  timestamp: number;
}
```

### get_upcoming_passes

```typescript
// Parameters:
interface GetPassesParams {
  lat: number;
  lng: number;
  days?: number;                 // Default: 7
  maxPasses?: number;            // Default: 5
}

// Returns:
interface PassesResult {
  passes: Array<{
    id: string;
    startTime: string;           // ISO date string
    endTime: string;
    duration: number;            // minutes
    maxElevation: number;        // degrees
    quality: "excellent" | "good" | "fair" | "poor";
  }>;
  location: {
    lat: number;
    lng: number;
    displayName?: string;
  };
}
```

### get_pass_weather

```typescript
// Parameters:
interface GetWeatherParams {
  lat: number;
  lng: number;
  passTime: string;              // ISO date string
}

// Returns:
interface WeatherResult {
  cloudCover: number;            // 0-100%
  visibility: number;            // meters
  isFavorable: boolean;
  recommendation: string;
}
```

### get_user_location

```typescript
// Parameters: None
// Returns:
interface LocationResult {
  available: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
  displayName?: string;
  source?: "geolocation" | "manual" | "search";
}
```

### search_knowledge_base

```typescript
// Parameters:
interface SearchKnowledgeParams {
  query: string;
  maxResults?: number;           // Default: 3
}

// Returns:
interface KnowledgeResult {
  results: Array<{
    id: string;
    title: string;
    content: string;
    category: string;
    relevanceScore: number;
  }>;
}
```

---

## State Store Schema

### ConversationStore (TanStack Store)

```typescript
interface ConversationStoreState {
  conversation: Conversation | null;
  isLoading: boolean;
  requestQueue: {
    activeCount: number;
    queuedCount: number;
  };
}
```

**Actions**:
- `startConversation()` - Create new conversation
- `addUserMessage(content: string)` - Add user message
- `addAssistantMessage(message: Message)` - Add assistant response
- `clearConversation()` - Reset state
- `trimContext()` - Apply 10-message/15-minute rule

---

## Knowledge Base Schema

### KnowledgeEntry

Static knowledge base entry for ISS facts.

```typescript
interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  keywords: string[];            // For matching
  relatedIds?: string[];         // Cross-references
}

type KnowledgeCategory =
  | "specifications"
  | "history"
  | "orbital_mechanics"
  | "observation"
  | "crew"
  | "missions";
```

---

## Entity Relationships

```
┌─────────────────┐
│  Conversation   │
│  (session)      │
└────────┬────────┘
         │ has many
         ▼
┌─────────────────┐
│    Message      │
│  (user/asst)    │
└────────┬────────┘
         │ may have (assistant only)
         ▼
┌─────────────────┐      ┌─────────────────┐
│   ToolCall      │      │  MessageLink    │
│  (execution)    │      │  (navigation)   │
└─────────────────┘      └─────────────────┘
```

---

## Privacy Considerations

### Sanitization Rules

Before logging to Sentry:

| Field | Sanitization |
|-------|-------------|
| Message content | Redact email/phone patterns |
| Location coordinates | Round to 1 decimal place |
| Session/message IDs | Hash with consistent salt |

### Stored vs Not Stored

| Data | Client (Session) | Server (Logs) |
|------|-----------------|---------------|
| Conversation history | ✓ (cleared on navigate) | ✗ |
| Tool call results | ✓ (transient) | ✓ (sanitized) |
| User location | ✓ (from locationStore) | ✓ (city-level only) |
| Exact coordinates | ✓ | ✗ (rounded) |


