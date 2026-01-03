# Research: Observation Copilot

**Feature Branch**: `007-observation-copilot`  
**Date**: 2025-12-19  
**Spec**: [spec.md](./spec.md)

## Overview

This document captures research findings for the Observation Copilot feature - a natural language chat interface with tool-calling capabilities for ISS observation queries.

---

## 1. AI Agent Architecture

### Decision: TanStack AI with Custom Cloudflare Workers AI Adapter

**Rationale**: TanStack AI (alpha, Dec 2025) provides a unified AI SDK that aligns with the project's existing TanStack ecosystem (Start, Query, Store, Router). Using TanStack AI ensures:
- Consistent patterns across the stack
- Built-in `useChat` hook for React integration
- Type-safe tool calling with streaming support
- Provider flexibility (can swap AI providers at runtime)

**Architecture**:
- **Framework**: `@tanstack/react-ai` for React hooks
- **Backend**: `@tanstack/ai` with custom Cloudflare Workers AI adapter
- **Model**: `@cf/meta/llama-3.1-8b-instruct` via custom adapter
- **Tool Execution**: TanStack AI's built-in tool calling with type-safe definitions

**Custom Cloudflare Adapter**:
```typescript
// src/lib/copilot/cloudflare-adapter.ts
import { createAIAdapter } from "@tanstack/ai";

export const cloudflareAI = createAIAdapter({
  chat: async ({ messages, tools, signal }, context) => {
    const ai = context.cloudflare?.env?.AI;
    if (!ai) throw new Error("AI binding not available");
    
    return ai.run("@cf/meta/llama-3.1-8b-instruct", {
      messages,
      tools,
      stream: true,
    });
  },
});
```

**Alternatives Considered**:
| Alternative | Rejected Because |
|------------|------------------|
| Manual ReAct loop | More code, no streaming, reinventing wheel |
| Vercel AI SDK | Different ecosystem, TanStack AI is better aligned |
| LangChain.js | Heavy dependency, overkill for this use case |
| OpenAI API | Additional cost, external latency |

**Implementation Pattern**:
```typescript
// React component using TanStack AI
import { useChat } from "@tanstack/react-ai";
import { cloudflareAI } from "../lib/copilot/cloudflare-adapter";

function CopilotChat() {
  const { messages, sendMessage, isLoading } = useChat({
    adapter: cloudflareAI,
    tools: AGENT_TOOLS,
    onToolCall: async (toolCall) => {
      // Execute tool and return result
      return executeTool(toolCall.name, toolCall.parameters);
    },
  });
  // ...
}
```

---

## 2. Tool Inventory

### Decision: Wrap Existing APIs as Agent Tools

| Tool Name | Source | Purpose | Existing Code |
|-----------|--------|---------|---------------|
| `get_iss_position` | `fetchISSPosition()` | Current ISS lat/lng/altitude | `src/lib/iss/api.ts` |
| `get_upcoming_passes` | `predictPasses()` | Future pass predictions | `src/lib/iss/orbital.ts` |
| `get_pass_weather` | `getWeatherForPass()` | Weather for specific pass time | `src/lib/briefing/weather.ts` |
| `get_user_location` | `locationStore` | User's saved location | `src/lib/location/store.ts` |
| `search_knowledge_base` | NEW | RAG for ISS facts | To be implemented |

**Rationale**: All core tools except knowledge base already exist. Wrapping them as agent tools requires minimal new code.

---

## 3. Knowledge Base / RAG Implementation

### Decision: Static JSON Knowledge Base (Phase 1), Vectorize Later

**Phase 1 (MVP)**:
- Curated JSON file with ~50-100 ISS/spaceflight facts
- Simple keyword matching for retrieval
- Fast to implement, no external dependencies

**Future Enhancement**:
- Cloudflare Vectorize for semantic search
- Embed knowledge chunks using Workers AI embeddings model
- Query by vector similarity

**Rationale**: A static knowledge base delivers value quickly while the project validates user engagement with the chat feature. Vector search can be added later based on usage patterns.

**Knowledge Categories**:
- ISS specifications (size, weight, altitude, speed)
- Mission history and milestones
- Orbital mechanics explanations
- Crew/expedition information
- Observation tips and best practices

**Alternatives Considered**:
| Alternative | Rejected Because |
|------------|------------------|
| External RAG API (Pinecone, etc.) | Additional cost/complexity, overkill for MVP |
| LLM-only (no RAG) | Risk of hallucination for specific facts |
| Wikipedia API | Unreliable content, can't curate accuracy |

---

## 4. Conversation Context Management

### Decision: In-Memory Session State with TTL

**Approach**:
- Store conversation history in TanStack Store (client-side)
- Session-scoped (clears on page unload/navigation away)
- Rolling window: Last 10 messages OR 15 minutes, whichever is shorter
- Pass context to AI on each request (server function)

**State Structure**:
```typescript
interface ConversationState {
  messages: Message[];
  createdAt: number;
  lastActivityAt: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
}
```

**Context Window Management**:
- Filter messages by timestamp (15-minute cutoff)
- Then limit to last 10 messages
- Include only message content + role for AI context (not full metadata)

**Alternatives Considered**:
| Alternative | Rejected Because |
|------------|------------------|
| IndexedDB persistence | Spec requires session-only persistence |
| Server-side sessions | Unnecessary complexity, no auth in app |
| LocalStorage | Same as IndexedDB - spec requires session-scoped |

---

## 5. Rate Limiting Strategy

### Decision: Client-Side Queue with Server Validation

**Client-Side (Primary)**:
- RequestQueue class manages concurrent requests
- Max 3 concurrent requests
- Queue up to 5 additional requests
- Reject beyond queue limit with user-friendly message

**Server-Side (Backup)**:
- Track requests per session (by request header/cookie if needed)
- Return 429 if abuse detected

**Implementation**:
```typescript
class RequestQueue {
  private active = 0;
  private queue: Array<() => Promise<void>> = [];
  private readonly maxConcurrent = 3;
  private readonly maxQueued = 5;
  
  async enqueue(fn: () => Promise<Response>): Promise<Response> {
    if (this.active >= this.maxConcurrent) {
      if (this.queue.length >= this.maxQueued) {
        throw new Error("Too many requests. Please wait.");
      }
      return new Promise((resolve, reject) => {
        this.queue.push(async () => {
          try { resolve(await this.execute(fn)); }
          catch (e) { reject(e); }
        });
      });
    }
    return this.execute(fn);
  }
}
```

---

## 6. Language Detection

### Decision: Client-Side Detection with Fallback

**Approach**:
- Use browser's `Intl` API or simple character range detection
- Check for non-ASCII character density
- If non-English detected, return polite message without AI call

**Detection Heuristic**:
```typescript
function isLikelyNonEnglish(text: string): boolean {
  // Check for scripts that are clearly non-Latin
  const nonLatinRegex = /[\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u30FF]/;
  if (nonLatinRegex.test(text)) return true;
  
  // Check non-ASCII ratio
  const nonAscii = text.replace(/[\x00-\x7F]/g, "").length;
  return nonAscii / text.length > 0.3;
}
```

---

## 7. Privacy & Logging

### Decision: Sanitization Pipeline Before Logging

**Sanitization Rules**:
1. Hash user identifiers (session IDs, any UUIDs)
2. Approximate locations to city-level (round lat/lng to 1 decimal)
3. Redact potential PII from question text (emails, phone patterns)

**Implementation Location**: Server function before Sentry logging

**Sentry Integration**:
- Log tool calls and response times (instrumented)
- Sanitize breadcrumbs containing user data
- Use Sentry's `beforeBreadcrumb` hook

---

## 8. UI/UX Patterns

### Decision: Slide-Out Panel with Chat Interface

**Layout**:
- New `/iss/copilot` route (or panel on existing routes)
- Mission Control aesthetic matching existing app
- Suggested prompts as clickable cards
- Message bubbles with assistant vs user distinction
- Tool execution indicators (loading states)

**Components**:
| Component | Purpose |
|-----------|---------|
| `CopilotPanel` | Container with chat UI |
| `MessageList` | Scrollable message history |
| `MessageBubble` | Individual message display |
| `ChatInput` | Text input with send button |
| `SuggestedPrompts` | Starter question cards |
| `ToolExecutionCard` | Shows what tool is running |

**Styling**: Tailwind + Shadcn components (existing pattern)

---

## 9. Error Handling Strategy

### Decision: Graceful Degradation with User Feedback

| Failure Mode | Response |
|--------------|----------|
| AI unavailable | Fall back to structured response without narrative |
| Weather API down | Respond with pass info, note weather unavailable |
| No saved location | Prompt user to set location with link |
| Tool execution error | Acknowledge error, suggest rephrasing |
| Rate limit exceeded | Show queue status, ask to wait |
| Non-English query | Polite message about English-only support |

---

## 10. Suggested Prompts

### Decision: Context-Aware Prompt Suggestions

**Static Prompts (Always Available)**:
- "When is my next visible ISS pass?"
- "What's the weather like for tonight's pass?"
- "How fast is the ISS traveling right now?"
- "Tell me about the current crew on the ISS"

**Contextual Prompts (Based on State)**:
- If pass is happening soon: "What should I know about tonight's pass?"
- If weather is poor: "Will I be able to see the pass tomorrow?"
- If user just set location: "What passes are coming up this week?"

---

## Summary

The Observation Copilot will be implemented as:
1. **TanStack AI Integration**: Using `@tanstack/react-ai` with custom Cloudflare Workers AI adapter
2. **useChat Hook**: React integration with streaming, tool calling, and message management
3. **Wrapped Existing APIs**: ISS position, passes, weather as type-safe tools
4. **Static Knowledge Base**: Curated JSON for ISS facts (vectorize later)
5. **Session-Scoped Context**: Managed by TanStack AI, 10-message/15-minute window
6. **Client-Side Rate Limiting**: Request queue with 3 concurrent, 5 queued
7. **Graceful Error Handling**: Degraded responses when tools fail
8. **Privacy-First Logging**: Sanitization pipeline for all user data


