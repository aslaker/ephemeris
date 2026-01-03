# Quickstart: AI Framework Migration

**Feature**: 008-tanstack-ai-migration  
**Created**: December 20, 2025  
**Status**: Complete

## Overview

This guide provides step-by-step instructions for migrating from `@cloudflare/ai-utils` to Cloudflare Agents SDK.

---

## Prerequisites

- Node.js 18+ or Bun runtime
- Existing Cloudflare Workers project with AI binding
- Familiarity with current copilot implementation in `src/lib/copilot/`

---

## Quick Migration Steps

### Step 1: Install Agents SDK

```bash
# Remove deprecated package
bun remove @cloudflare/ai-utils

# Install Agents SDK
bun add agents
```

### Step 2: Update Imports

**Before**:
```typescript
import { runWithTools } from "@cloudflare/ai-utils";
```

**After**:
```typescript
import { tool } from "agents/tool";
// Note: For server function pattern, we may use runWithTools directly
// or adapt to Agent class pattern
```

### Step 3: Convert Tool Definitions

**Before** (inline object format):
```typescript
const tools = [
  {
    name: "get_iss_position",
    description: "Get ISS position",
    parameters: {
      type: "object",
      properties: {},
    },
    function: getISSPosition,
  },
];
```

**After** (Agents SDK tool format):
```typescript
import { tool } from "agents/tool";
import { z } from "zod";

const getISSPositionTool = tool({
  description: "Get ISS position",
  parameters: z.object({}),
  execute: getISSPosition,
});

const tools = [getISSPositionTool];
```

### Step 4: Update Chat Completion

**Before**:
```typescript
const aiResponse = await runWithTools(
  ai,
  "@cf/meta/llama-3.1-8b-instruct",
  {
    messages,
    tools,
    maxIterations: 5,
  }
);
```

**After** (if using Agent class):
```typescript
const { text } = await this.runWithTools({
  model: env.AI,
  modelId: "@cf/meta/llama-3.1-8b-instruct",
  messages,
  tools,
  maxIterations: 5,
});
```

**Or** (for server function without Agent class - check Agents SDK docs for exact pattern):
```typescript
// Import the appropriate function from agents package
import { runWithTools } from "agents";

const { text } = await runWithTools({
  model: env.AI,
  modelId: "@cf/meta/llama-3.1-8b-instruct",
  messages,
  tools,
  maxIterations: 5,
});
```

### Step 5: Update Response Handling

**Before**:
```typescript
const content =
  typeof aiResponse === "string"
    ? aiResponse
    : aiResponse?.response;
```

**After**:
```typescript
// Agents SDK returns a cleaner { text } structure
const { text } = result;
const content = text || "I couldn't generate a response.";
```

---

## Tool Migration Examples

### Tool with No Parameters

**Before**:
```typescript
{
  name: "get_iss_position",
  description: "Get current ISS position",
  parameters: { type: "object", properties: {} },
  function: async () => {
    const position = await fetchISSPosition();
    return JSON.stringify(position);
  },
}
```

**After**:
```typescript
const getISSPositionTool = tool({
  description: "Get current ISS position",
  parameters: z.object({}),
  execute: async () => {
    const position = await fetchISSPosition();
    return position; // Can return object directly
  },
});
```

### Tool with Parameters

**Before**:
```typescript
{
  name: "get_upcoming_passes",
  description: "Get upcoming ISS passes",
  parameters: {
    type: "object",
    properties: {
      lat: { type: "number", description: "Latitude" },
      lng: { type: "number", description: "Longitude" },
      days: { type: "number", description: "Days ahead" },
    },
    required: ["lat", "lng"],
  },
  function: async (args) => {
    const { lat, lng, days = 7 } = args;
    // ...
  },
}
```

**After**:
```typescript
const getUpcomingPassesTool = tool({
  description: "Get upcoming ISS passes",
  parameters: z.object({
    lat: z.number().describe("Latitude"),
    lng: z.number().describe("Longitude"),
    days: z.number().optional().describe("Days ahead"),
  }),
  execute: async ({ lat, lng, days = 7 }) => {
    // Parameters are type-safe!
    // ...
  },
});
```

### Tool with Closure (for user context)

**Before**:
```typescript
{
  name: "get_user_location",
  description: "Get user location",
  parameters: { type: "object", properties: {} },
  function: () => getUserLocation(data.location), // closure
}
```

**After**:
```typescript
// Create tool factory function
const createGetUserLocationTool = (userLocation?: { lat: number; lng: number }) =>
  tool({
    description: "Get user location",
    parameters: z.object({}),
    execute: async () => {
      if (!userLocation) {
        return { available: false, message: "No location saved" };
      }
      return { available: true, coordinates: userLocation };
    },
  });

// Use in handler
const tools = [
  getISSPositionTool,
  createGetUserLocationTool(data.location), // pass context
];
```

---

## AI Configuration Centralization

Create a new configuration module:

```typescript
// src/lib/ai/config.ts

import type { AIConfig } from "../../specs/008-tanstack-ai-migration/contracts/api-interfaces";

export const AI_CONFIG: AIConfig = {
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

export function getAIModelId(): string {
  return AI_CONFIG.modelId;
}

export function getMaxIterations(): number {
  return AI_CONFIG.maxIterations;
}
```

---

## Sentry Instrumentation

Maintain Sentry spans for tool execution:

```typescript
import * as Sentry from "@sentry/tanstackstart-react";

const getISSPositionTool = tool({
  description: "Get current ISS position",
  parameters: z.object({}),
  execute: async () => {
    // Wrap execution in Sentry span
    return Sentry.startSpan({ name: "Tool: get_iss_position" }, async () => {
      const position = await fetchISSPosition();
      return {
        latitude: position.latitude,
        longitude: position.longitude,
        altitude: position.altitude,
      };
    });
  },
});
```

---

## Briefing Migration

The briefing generator is simpler (no tool calling). Migration is straightforward:

**Before**:
```typescript
// Direct ai.run call
aiResponse = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ],
  max_tokens: 500,
});
```

**After**:
```typescript
import { AI_CONFIG } from "../ai/config";

// Use centralized config
aiResponse = await ai.run(AI_CONFIG.modelId, {
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ],
  max_tokens: 500,
});
```

No significant changes needed for briefing - just config centralization.

---

## Verification Checklist

After migration, verify:

- [ ] All 5 copilot tools work correctly
  - [ ] get_iss_position returns current ISS data
  - [ ] get_upcoming_passes returns pass predictions
  - [ ] get_pass_weather returns weather conditions
  - [ ] get_user_location returns user's saved location
  - [ ] search_knowledge_base returns relevant ISS facts
- [ ] Multi-turn conversations work
- [ ] Error handling returns user-friendly messages
- [ ] Sentry spans appear for AI operations
- [ ] Briefing generation works unchanged
- [ ] Performance is equivalent or better
- [ ] No console errors or warnings

---

## Troubleshooting

### "Cannot find module 'agents/tool'"

Ensure the agents package is installed:
```bash
bun add agents
```

### Tool parameters not validating

Check Zod schema matches expected input:
```typescript
// Ensure optional fields use .optional()
parameters: z.object({
  lat: z.number(), // required
  lng: z.number(), // required
  days: z.number().optional(), // optional with undefined
})
```

### Response format changed

Agents SDK may return `{ text: string }` instead of raw string. Update extraction:
```typescript
// Old
const content = response.response;

// New
const { text } = response;
```

### AI binding not available

Ensure wrangler.jsonc has AI binding configured:
```jsonc
{
  "ai": {
    "binding": "AI"
  }
}
```

---

## References

- [Cloudflare Agents SDK Docs](https://developers.cloudflare.com/agents/)
- [Workers AI Function Calling](https://developers.cloudflare.com/workers-ai/features/function-calling/)
- [Zod Documentation](https://zod.dev/)
- Current implementation: `src/lib/copilot/agent.ts`




