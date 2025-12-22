# Implementation Plan: AI Framework Migration & Standardization

**Branch**: `008-tanstack-ai-migration` | **Date**: December 20, 2025 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/008-tanstack-ai-migration/spec.md`

## Summary

Migrate AI implementation from deprecated `@cloudflare/ai-utils` to Cloudflare Agents SDK for improved maintainability, standardized tool calling patterns, and continued Cloudflare support. Research confirmed Agents SDK as the recommended choice with native Workers AI integration and similar API patterns to current implementation.

## Technical Context

**Language/Version**: TypeScript 5.7, React 19, Node 22  
**Primary Dependencies**: Cloudflare Agents SDK (`agents`), Zod 4.x, TanStack Start, Sentry  
**Storage**: N/A (AI migration only)  
**Testing**: Vitest with React Testing Library  
**Target Platform**: Cloudflare Workers (via TanStack Start)  
**Project Type**: Web application (TanStack Start full-stack)  
**Performance Goals**: Maintain current AI response times (<30s for tool calls)  
**Constraints**: Must maintain feature parity with existing implementation  
**Scale/Scope**: 5 copilot tools, 1 briefing generator, ~400 LOC affected

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

### Gates Evaluated

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Component Architecture | ✅ Pass | No UI changes - server-side only |
| II. Data Flow & State Management | ✅ Pass | No state management changes |
| III. Routing & Navigation | ✅ Pass | Server functions pattern maintained |
| IV. Performance Optimization | ✅ Pass | No additional abstractions |
| V. Code Quality & Testing | ✅ Pass | TypeScript strict, Zod validation |
| VI. Observability & Error Handling | ✅ Pass | Sentry instrumentation preserved |

### Constitution Compliance

- **Server Functions**: Using `createServerFn` pattern (III.5) ✅
- **Sentry Instrumentation**: `Sentry.startSpan` for AI operations (VI.2) ✅
- **Error Boundaries**: Existing error handling maintained (VI.4) ✅
- **TypeScript Strict**: Zod schemas for type safety (V.1) ✅
- **Graceful Degradation**: Fallback responses preserved (VI.5) ✅

**Post-Design Re-check**: All gates still pass. No new abstractions introduced.

## Project Structure

### Documentation (this feature)

```text
specs/008-tanstack-ai-migration/
├── plan.md              # This file
├── research.md          # Framework comparison (COMPLETE)
├── data-model.md        # Entity definitions (COMPLETE)
├── quickstart.md        # Migration guide (COMPLETE)
├── contracts/           # TypeScript interfaces
│   └── api-interfaces.ts # (COMPLETE)
├── checklists/          # Requirements checklist
│   └── requirements.md  # (EXISTS)
└── tasks.md             # Implementation tasks (PENDING - Phase 2)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── ai/                    # NEW: Centralized AI configuration
│   │   └── config.ts          # AI config, model settings, retry logic
│   ├── copilot/
│   │   ├── agent.ts           # MODIFY: Migrate to Agents SDK
│   │   ├── tools.ts           # MODIFY: Convert to Agents SDK format
│   │   ├── prompts.ts         # UNCHANGED
│   │   ├── knowledge.ts       # UNCHANGED
│   │   ├── store.ts           # UNCHANGED
│   │   ├── types.ts           # MINOR: Add new type exports
│   │   └── utils.ts           # UNCHANGED
│   └── briefing/
│       ├── ai-client.ts       # MODIFY: Use centralized config
│       ├── prompt.ts          # UNCHANGED
│       ├── types.ts           # UNCHANGED
│       └── weather.ts         # UNCHANGED
└── routes/
    └── iss/
        └── -components/
            └── Copilot/       # UNCHANGED (UI unaffected)
```

**Structure Decision**: Single project with feature-based organization. AI configuration centralized in new `src/lib/ai/` module. Migration affects `src/lib/copilot/agent.ts` primarily, with minor updates to `src/lib/briefing/ai-client.ts` for config unification.

## Research Findings Summary

### Framework Selection: Cloudflare Agents SDK

**Decision Rationale** (from research.md):

1. **@cloudflare/ai-utils is deprecated** - Cloudflare recommends Agents SDK
2. **Native Cloudflare Workers integration** - No adapters needed
3. **Higher weighted score** - 62.5/72.5 (86%) vs TanStack AI 58/72.5 (80%)
4. **Similar migration effort** - Tool patterns are comparable

### Key Differences from Current Implementation

| Aspect | Current (@cloudflare/ai-utils) | New (Agents SDK) |
|--------|--------------------------------|------------------|
| Package | `@cloudflare/ai-utils` | `agents` |
| Tool definition | Object literal with `function` | `tool()` with `execute` |
| Schema | JSON Schema | Zod schema |
| Import | `runWithTools` | `tool` from `agents/tool` |
| Response | `response.response` | `{ text }` structure |

### Trade-offs Accepted

- **Vendor lock-in**: Accepted - already committed to Cloudflare Workers
- **Agent class pattern**: Optional - can use `runWithTools` directly

## Migration Strategy

### Phase 1: Infrastructure Setup
1. Install `agents` package
2. Create centralized AI config module
3. Remove `@cloudflare/ai-utils` dependency

### Phase 2: Copilot Migration
1. Convert 5 tool definitions to Agents SDK format
2. Update `chatCompletion` server function
3. Validate tool calling functionality
4. Verify Sentry instrumentation

### Phase 3: Briefing Migration
1. Update `generateBriefing` to use centralized config
2. Maintain existing AI call pattern (no tool calling)
3. Verify fallback behavior

### Phase 4: Cleanup & Validation
1. Remove deprecated imports
2. Run full test suite
3. Verify performance parity
4. Update documentation

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Tool format incompatibility | Similar patterns; Zod replaces JSON Schema |
| Response format differences | Extract text from new `{ text }` structure |
| Performance regression | Monitor response times; no abstraction overhead |
| Missing features | Both use same Workers AI binding |

## Complexity Tracking

> No constitution violations requiring justification.

| Aspect | Complexity | Justification |
|--------|------------|---------------|
| New module (ai/config.ts) | Low | Configuration centralization per FR-004 |
| Tool definition format | Low | 1:1 mapping from current format |
| Response handling | Low | Minor extraction change |

## Success Criteria Mapping

| Criterion | Verification Method |
|-----------|-------------------|
| SC-005: Copilot parity | Manual testing of all 5 tools |
| SC-006: Briefing parity | Manual testing of briefing generation |
| SC-007: Performance | Response time comparison |
| SC-010: Tool addition | Time new tool creation |
| SC-011: Dependency cleanup | Verify package.json |
| SC-012: Config centralization | Code review |

## Next Steps

1. **Generate Tasks**: Run `/speckit.tasks` to create implementation checklist
2. **Begin Implementation**: Start with Phase 1 infrastructure setup
3. **Validate POC**: Implement single tool to confirm Agents SDK patterns

---

## Artifacts Generated

| Artifact | Path | Status |
|----------|------|--------|
| Research | `specs/008-tanstack-ai-migration/research.md` | ✅ Complete |
| Data Model | `specs/008-tanstack-ai-migration/data-model.md` | ✅ Complete |
| Contracts | `specs/008-tanstack-ai-migration/contracts/api-interfaces.ts` | ✅ Complete |
| Quickstart | `specs/008-tanstack-ai-migration/quickstart.md` | ✅ Complete |
| Plan | `specs/008-tanstack-ai-migration/plan.md` | ✅ Complete |
| Tasks | `specs/008-tanstack-ai-migration/tasks.md` | ⏳ Pending (Phase 2) |
