# Implementation Plan: Observation Copilot

**Branch**: `007-observation-copilot` | **Date**: 2025-12-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-observation-copilot/spec.md`

## Summary

Implement a natural language chat interface ("Observation Copilot") that allows users to ask questions about ISS passes, positions, weather conditions, and spaceflight facts. The system uses **TanStack AI** with a custom Cloudflare Workers AI adapter (Llama 3.1 8B) for consistent ecosystem alignment. The `useChat` hook provides React integration with streaming responses and type-safe tool calling. Conversation context persists for the session only (10 messages / 15 minutes).

## Technical Context

**Language/Version**: TypeScript 5.7, React 19  
**Primary Dependencies**: TanStack Start, TanStack Query, TanStack Store, **TanStack AI**, Cloudflare Workers AI, Zod  
**Storage**: Session-only (TanStack Store in memory), existing IndexedDB for ISS data  
**Testing**: Vitest with React Testing Library  
**Target Platform**: Cloudflare Workers (deployed), modern browsers  
**Project Type**: Web application (single codebase)  
**Performance Goals**: <5s response for simple queries, <15s for multi-tool queries  
**Constraints**: 3 concurrent requests max, 5 queued max; English-only  
**Scale/Scope**: Single user sessions, ~50-100 knowledge base entries

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Component Architecture** | ✅ PASS | Chat components follow functional, single-responsibility pattern |
| **II. Data Flow & State** | ✅ PASS | TanStack Store for client state, server functions for AI calls |
| **III. Routing & Navigation** | ✅ PASS | New `/iss/copilot` route follows file-based routing |
| **IV. Performance** | ✅ PASS | Rate limiting prevents overload; lazy loading for chat panel |
| **V. Code Quality** | ✅ PASS | Zod validation, TypeScript strict, contracts defined |
| **VI. Observability** | ✅ PASS | Sentry instrumentation for agent execution, sanitized logging |

**Post-Phase 1 Re-check**: All principles validated. Chat interface uses composition (MessageList → MessageBubble), state properly separated (conversation store vs UI state), server functions instrumented.

## Project Structure

### Documentation (this feature)

```text
specs/007-observation-copilot/
├── plan.md              # This file
├── research.md          # Phase 0 output ✅
├── data-model.md        # Phase 1 output ✅
├── quickstart.md        # Phase 1 output ✅
├── contracts/           # Phase 1 output ✅
│   └── api-interfaces.ts
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── copilot/                    # NEW: Copilot module
│       ├── store.ts                # Conversation state (TanStack Store)
│       ├── agent.ts                # Server function - chat completion
│       ├── tools.ts                # Tool wrappers for ISS/weather APIs
│       ├── knowledge.ts            # Knowledge base search
│       ├── knowledge-data.ts       # Curated ISS facts JSON
│       ├── prompts.ts              # System prompt, suggested prompts
│       ├── types.ts                # Type re-exports
│       └── utils.ts                # Language detection, sanitization
├── routes/
│   └── iss/
│       ├── copilot.tsx             # NEW: Copilot route
│       └── -components/
│           └── Copilot/            # NEW: Chat UI components
│               ├── CopilotPanel.tsx
│               ├── MessageList.tsx
│               ├── MessageBubble.tsx
│               ├── ChatInput.tsx
│               ├── SuggestedPrompts.tsx
│               └── ToolExecutionIndicator.tsx
└── components/ui/                  # Existing Shadcn components
```

**Structure Decision**: Single web application following existing patterns. New code organized under `src/lib/copilot/` for agent logic and `src/routes/iss/-components/Copilot/` for UI, consistent with existing ISS feature organization.

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | — | — |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │ CopilotPanel    │───▶│  TanStack AI (useChat)          │ │
│  │ - ChatInput     │    │  - messages[] (managed)         │ │
│  │ - MessageList   │    │  - sendMessage()                │ │
│  │ - Prompts       │    │  - streaming support            │ │
│  └────────┬────────┘    └─────────────────────────────────┘ │
│           │                                                  │
│           │ SSE Stream (TanStack AI)                         │
└───────────┼─────────────────────────────────────────────────┘
            │
┌───────────▼─────────────────────────────────────────────────┐
│                  SERVER (Cloudflare Worker)                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │  chatCompletion (createServerFn + TanStack AI)          ││
│  │  ├── Validate request (Zod)                             ││
│  │  ├── Language detection                                 ││
│  │  ├── Custom Cloudflare AI Adapter                       ││
│  │  └── Tool execution (type-safe):                        ││
│  │      ├── get_iss_position → fetchISSPosition()         ││
│  │      ├── get_upcoming_passes → predictPasses()         ││
│  │      ├── get_pass_weather → getWeatherForPass()        ││
│  │      ├── get_user_location → (from request)            ││
│  │      └── search_knowledge_base → searchKnowledge()     ││
│  └─────────────────────────────────────────────────────────┘│
│                              │                               │
│  ┌───────────────────────────▼─────────────────────────────┐│
│  │  Workers AI Binding (@cf/meta/llama-3.1-8b-instruct)    ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Dependencies Map

```
Observation Copilot
├── Existing (no changes needed)
│   ├── src/lib/iss/api.ts          → fetchISSPosition()
│   ├── src/lib/iss/orbital.ts      → predictPasses()
│   ├── src/lib/briefing/weather.ts → getWeatherForPass()
│   └── src/lib/location/store.ts   → locationStore
│
├── New Modules
│   ├── src/lib/copilot/store.ts    → ConversationStore
│   ├── src/lib/copilot/agent.ts    → chatCompletion server fn
│   ├── src/lib/copilot/tools.ts    → Tool wrappers
│   └── src/lib/copilot/knowledge.ts → Knowledge base
│
└── UI Components (new)
    └── src/routes/iss/-components/Copilot/*
```

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AI Framework | **TanStack AI** with custom Cloudflare adapter | Ecosystem alignment, `useChat` hook, streaming |
| AI Model | Llama 3.1 8B via Workers AI | Already configured, no additional cost |
| Tool Execution | TanStack AI's built-in tool calling | Type-safe, streaming, handles loop automatically |
| Conversation State | TanStack AI's `useChat` + Store | Session-scoped, managed by hook |
| Knowledge Base | Static JSON (Phase 1) | Fast to implement, vectorize later |
| Rate Limiting | Client queue + server validation | Best UX, prevents abuse |
| Chat UI | New route `/iss/copilot` | Clear separation, can link from other views |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| TanStack AI in alpha (Dec 2025) | Medium | API may change; pin version, have fallback to manual approach |
| No built-in Cloudflare adapter | Low | Custom adapter is thin layer, easy to maintain |
| Workers AI tool calling quirks | Medium | Validate tool responses, fallback to single-turn if needed |
| Weather API rate limits | Medium | Already have caching/rate limiting in weather.ts |
| Knowledge base insufficient | Low | Start curated, expand based on user questions |
| Conversation context too small | Low | 10 messages covers typical Q&A flows |

## Generated Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Research | `specs/007-observation-copilot/research.md` | ✅ Complete |
| Data Model | `specs/007-observation-copilot/data-model.md` | ✅ Complete |
| API Contracts | `specs/007-observation-copilot/contracts/api-interfaces.ts` | ✅ Complete |
| Quickstart | `specs/007-observation-copilot/quickstart.md` | ✅ Complete |
| Tasks | `specs/007-observation-copilot/tasks.md` | ⏳ Pending (`/speckit.tasks`) |

## Next Steps

1. Run `/speckit.tasks` to generate implementation tasks
2. Begin Phase 1 implementation: Conversation store + tool wrappers
3. Implement agent server function with basic tools
4. Build chat UI components
5. Add weather integration (Phase 2)
6. Implement knowledge base (Phase 3)
