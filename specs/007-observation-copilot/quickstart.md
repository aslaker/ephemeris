# Quickstart: Observation Copilot

**Feature Branch**: `007-observation-copilot`  
**Date**: 2025-12-19  
**Spec**: [spec.md](./spec.md)

## Overview

This guide provides a rapid implementation path for the Observation Copilot feature - a natural language chat interface for ISS observation queries.

---

## Prerequisites

- [ ] Branch `007-observation-copilot` checked out
- [ ] `bun install` completed
- [ ] Install TanStack AI: `bun add @tanstack/ai @tanstack/react-ai`
- [ ] Cloudflare Workers AI binding configured (already in `wrangler.jsonc`)
- [ ] Understanding of existing codebase:
  - `src/lib/iss/api.ts` - ISS position/TLE APIs
  - `src/lib/iss/orbital.ts` - Pass prediction
  - `src/lib/briefing/weather.ts` - Weather API
  - `src/lib/location/store.ts` - Location store

---

## Implementation Order

### Phase 1: Core Infrastructure (P1 - Basic Queries)

1. **Conversation Store** (`src/lib/copilot/store.ts`)
   - TanStack Store for conversation state
   - Message management with context trimming
   - Request queue for rate limiting

2. **Tool Wrappers** (`src/lib/copilot/tools.ts`)
   - Wrap existing APIs as typed tool functions
   - Add tool execution logging
   - Implement get_user_location tool

3. **Agent Server Function** (`src/lib/copilot/agent.ts`)
   - Chat completion endpoint using Workers AI
   - ReAct-style tool execution loop
   - Context window management

4. **Chat UI Components** (`src/routes/iss/-components/Copilot/`)
   - `CopilotPanel.tsx` - Main container
   - `MessageList.tsx` - Message history display
   - `ChatInput.tsx` - User input with send
   - `SuggestedPrompts.tsx` - Starter questions

5. **Route Integration** (`src/routes/iss/copilot.tsx`)
   - New route for copilot interface
   - Layout integration with existing ISS routes

### Phase 2: Weather Integration (P2)

6. **Weather Tool Enhancement**
   - Integrate get_pass_weather tool
   - Weather-aware response generation
   - Graceful degradation when API unavailable

### Phase 3: Knowledge Base (P3)

7. **Knowledge Base** (`src/lib/copilot/knowledge.ts`)
   - Static JSON knowledge file
   - Keyword-based search function
   - Integration as search_knowledge_base tool

---

## Key Files to Create

```
src/lib/copilot/
├── adapter.ts         # Custom Cloudflare Workers AI adapter for TanStack AI
├── tools.ts           # Tool definitions and executors
├── knowledge.ts       # Knowledge base search
├── knowledge-data.ts  # Curated ISS facts
├── prompts.ts         # System prompt and suggested prompts
├── types.ts           # Re-export from contracts (or inline)
└── utils.ts           # Language detection, sanitization, rate limiting

src/routes/iss/
├── copilot.tsx        # Copilot route
└── -components/Copilot/
    ├── CopilotPanel.tsx     # Main container with useChat hook
    ├── MessageList.tsx
    ├── MessageBubble.tsx
    ├── ChatInput.tsx
    ├── SuggestedPrompts.tsx
    └── ToolExecutionIndicator.tsx
```

---

## Critical Implementation Details

### 1. Conversation Context Trimming

```typescript
// In store.ts
function trimContext(messages: Message[]): Message[] {
  const now = Date.now();
  const fifteenMinsAgo = now - 15 * 60 * 1000;
  
  // Filter by time first
  const recent = messages.filter(m => m.timestamp > fifteenMinsAgo);
  
  // Then limit to last 10
  return recent.slice(-10);
}
```

### 2. Request Queue

```typescript
// In store.ts
class RequestQueue {
  private active = 0;
  private queue: Array<() => Promise<void>> = [];
  private readonly MAX_CONCURRENT = 3;
  private readonly MAX_QUEUED = 5;

  canEnqueue(): boolean {
    return this.queue.length < this.MAX_QUEUED;
  }

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active < this.MAX_CONCURRENT) {
      return this.execute(fn);
    }
    
    if (!this.canEnqueue()) {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }
    
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await this.execute(fn));
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  private async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      this.processQueue();
    }
  }

  private processQueue() {
    if (this.queue.length > 0 && this.active < this.MAX_CONCURRENT) {
      const next = this.queue.shift();
      next?.();
    }
  }
}
```

### 3. Agent System Prompt

```typescript
// In prompts.ts
export const COPILOT_SYSTEM_PROMPT = `You are an ISS Observation Copilot, helping users track and observe the International Space Station.

You have access to these tools:
- get_iss_position: Get current ISS location
- get_upcoming_passes: Get visible passes for a location
- get_pass_weather: Get weather for a pass time
- get_user_location: Get user's saved location
- search_knowledge_base: Search ISS facts

Guidelines:
- Be conversational and enthusiastic about space
- Always use tools to get accurate data - never make up pass times or positions
- If user has no saved location, ask them to set one
- Include relevant links when mentioning maps or pass details
- Keep responses concise but informative
- When discussing passes, mention quality, duration, and direction

Response format:
- Use natural language
- Include specific times and dates
- Mention weather conditions when relevant
- Suggest next steps when appropriate`;
```

### 4. TanStack AI Cloudflare Adapter

```typescript
// In adapter.ts
import { createServerFn } from "@tanstack/react-start";
import * as Sentry from "@sentry/tanstackstart-react";
import { COPILOT_SYSTEM_PROMPT } from "./prompts";
import { executeTool, AGENT_TOOLS } from "./tools";

/**
 * Server function for TanStack AI chat endpoint
 * Handles the Workers AI binding and tool execution
 */
export const chatCompletion = createServerFn({ method: "POST" })
  .validator(ChatRequestSchema)
  .handler(async ({ data, context }) => {
    return Sentry.startSpan({ name: "Copilot Chat Completion" }, async () => {
      const ai = context?.cloudflare?.env?.AI;
      if (!ai) {
        throw new Error("AI binding not available");
      }

      const messages = [
        { role: "system", content: COPILOT_SYSTEM_PROMPT },
        ...data.conversationContext.messages,
        { role: "user", content: data.message }
      ];

      // TanStack AI handles the tool loop - we just need to provide the executor
      const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
        messages,
        tools: AGENT_TOOLS,
        max_tokens: 500,
        stream: true,
      });

      return response;
    });
  });
```

### 5. Using useChat Hook (TanStack AI)

```typescript
// In CopilotPanel.tsx
import { useChat } from "@tanstack/react-ai";
import { chatCompletion } from "../../lib/copilot/adapter";
import { executeTool, AGENT_TOOLS } from "../../lib/copilot/tools";

export function CopilotPanel() {
  const { messages, sendMessage, isLoading, error } = useChat({
    // Connect to our server function
    onMessage: async (message) => {
      return chatCompletion({ data: message });
    },
    // Handle tool calls client-side or pass to server
    tools: AGENT_TOOLS,
    onToolCall: async (toolCall) => {
      return executeTool(toolCall.name, toolCall.parameters);
    },
    // System prompt
    systemPrompt: COPILOT_SYSTEM_PROMPT,
  });

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} />
      <ChatInput 
        onSend={sendMessage} 
        disabled={isLoading} 
      />
    </div>
  );
}
```

### 5. Language Detection

```typescript
// In utils.ts
export function isLikelyNonEnglish(text: string): boolean {
  // Check for non-Latin scripts
  const nonLatinRegex = /[\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/;
  if (nonLatinRegex.test(text)) return true;
  
  // Check ratio of non-ASCII characters
  const nonAscii = text.replace(/[\x00-\x7F]/g, "").length;
  return text.length > 10 && nonAscii / text.length > 0.3;
}
```

---

## Testing Checklist

### P1: Basic ISS Queries
- [ ] "When is my next visible pass?" → Returns pass with correct time/date
- [ ] "What passes are coming up?" → Returns list of passes
- [ ] No saved location → Prompts to set location
- [ ] Response includes links to map/pass views

### P2: Weather Integration
- [ ] "Is tonight's pass worth watching?" → Includes weather assessment
- [ ] Weather API failure → Responds without weather, notes unavailable
- [ ] Heavy cloud cover → Recommends against observation

### P3: Knowledge Base
- [ ] "What is the ISS?" → Returns factual answer
- [ ] "How fast does it travel?" → Returns accurate speed
- [ ] Off-topic question → Politely redirects to ISS topics

### Edge Cases
- [ ] Rapid submission (10 questions) → Queue works, rejects excess
- [ ] Non-English question → Polite English-only message
- [ ] Follow-up "what about tomorrow?" → Uses conversation context
- [ ] Context older than 15 minutes → Starts fresh

---

## Deployment Notes

1. **Workers AI**: Already configured via `ai` binding in `wrangler.jsonc`
2. **Sentry Instrumentation**: Wrap `executeAgentLoop` with `Sentry.startSpan`
3. **Logging Sanitization**: Apply before Sentry breadcrumbs
4. **Rate Limiting**: Client-side primary, server function as backup

---

## Resources

- [Cloudflare Workers AI Docs](https://developers.cloudflare.com/workers-ai/)
- [TanStack Store Docs](https://tanstack.com/store)
- [Existing AI Briefing Code](../../../src/lib/briefing/ai-client.ts)
- [Research Notes](./research.md)
- [Data Model](./data-model.md)
- [API Contracts](./contracts/api-interfaces.ts)

