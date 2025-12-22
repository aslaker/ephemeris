---
description: "Task list for AI framework migration implementation"
---

# Tasks: AI Framework Migration & Standardization

**Input**: Design documents from `/specs/008-tanstack-ai-migration/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL for this migration - manual verification is acceptable given limited production usage.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root
- Paths shown below use repository root structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency management

- [X] T001 Install `agents` package and remove `@cloudflare/ai-utils` dependency in package.json
- [X] T002 [P] Create centralized AI configuration module at src/lib/ai/config.ts with AIConfig interface from contracts
- [X] T003 [P] Export AI configuration helpers (getAIModelId, getMaxIterations) from src/lib/ai/config.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Verify Agents SDK import patterns work correctly with Cloudflare Workers environment
- [X] T005 [P] Create data sanitization utility at src/lib/ai/sanitization.ts for coordinates, user identifiers, and IP addresses (per FR-018)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 2 - Copilot Tool Calling Migration (Priority: P2) 🎯 MVP

**Goal**: Migrate copilot chat completion from @cloudflare/ai-utils to Cloudflare Agents SDK while maintaining identical functionality for all 5 tools (get_iss_position, get_upcoming_passes, get_pass_weather, get_user_location, search_knowledge_base).

**Independent Test**: Send chat messages that require tool calls (e.g., "What's the next ISS pass?") and verify tools execute correctly with identical functionality to current implementation. All 5 tools must work correctly.

### Implementation for User Story 2

- [X] T006 [P] [US2] Convert get_iss_position tool to Agents SDK format using `tool()` function from `ai` package in src/lib/copilot/tools.ts
- [X] T007 [P] [US2] Convert get_upcoming_passes tool to Agents SDK format using `tool()` function from `ai` package in src/lib/copilot/tools.ts
- [X] T008 [P] [US2] Convert get_pass_weather tool to Agents SDK format using `tool()` function from `ai` package in src/lib/copilot/tools.ts
- [X] T009 [P] [US2] Convert get_user_location tool to Agents SDK format using `tool()` function from `ai` package in src/lib/copilot/tools.ts
- [X] T010 [P] [US2] Convert search_knowledge_base tool to Agents SDK format using `tool()` function from `ai` package in src/lib/copilot/tools.ts
- [X] T011 [US2] Update chatCompletion server function in src/lib/copilot/agent.ts to use Agents SDK Durable Object proxy
- [X] T012 [US2] Update response handling in src/lib/copilot/agent.ts to extract text from agent result
- [X] T013 [US2] Verify Sentry instrumentation spans are preserved for all tool executions in src/lib/copilot/agent.ts
- [X] T014 [US2] Update tool object construction in src/lib/copilot/agent.ts to use AI SDK tool format compatible with Agents SDK
- [X] T015 [US2] Update imports in src/lib/copilot/agent.ts to use `agents` and `ai` instead of @cloudflare/ai-utils
- [X] T016 [US2] Verify error handling and fallback mechanisms work identically in src/lib/copilot/agent.ts
- [X] T017 [US2] Test multi-turn conversations with tool calls to ensure conversation context handling works correctly
- [X] T018 [US2] Create Zod response schemas for all 5 tools in src/lib/copilot/tools.ts (per FR-011)
- [X] T019 [US2] Implement tool response validation against Zod schemas with Sentry logging on failures in src/lib/copilot/agent.ts (per FR-011)
- [X] T020 [US2] Apply data sanitization utility to all tool call parameters before Sentry breadcrumbs and AI submissions in src/lib/copilot/agent.ts (per FR-018)
- [X] T021 [US2] Document tool addition patterns in src/lib/copilot/tools.ts code comments or create TOOL_GUIDE.md (per FR-016)

**Checkpoint**: At this point, User Story 2 should be fully functional and testable independently. All 5 copilot tools should execute correctly with Agents SDK.

---

## Phase 4: User Story 3 - Briefing Generation Migration (Priority: P3)

**Goal**: Migrate briefing generation to use centralized AI configuration and maintain identical output quality and format.

**Independent Test**: Request a briefing for any upcoming ISS pass and verify the generated narrative, summary, and recommendations match quality and accuracy of current implementation.

### Implementation for User Story 3

- [X] T022 [US3] Update generateBriefing server function in src/lib/briefing/ai-client.ts to import AI_CONFIG from src/lib/ai/config.ts
- [X] T023 [US3] Replace hardcoded model ID in src/lib/briefing/ai-client.ts with AI_CONFIG.modelId
- [X] T024 [US3] Verify fallback briefing mechanism works correctly when AI service is unavailable in src/lib/briefing/ai-client.ts
- [X] T025 [US3] Verify Sentry instrumentation is preserved for briefing generation in src/lib/briefing/ai-client.ts
- [X] T026 [US3] Test briefing generation with various pass scenarios to ensure output quality matches current implementation

**Checkpoint**: At this point, User Stories 2 AND 3 should both work independently. Briefing generation should use centralized config while maintaining identical functionality.

---

## Phase 5: User Story 4 - Unified AI Configuration (Priority: P4)

**Goal**: Ensure all AI interactions use centralized configuration from src/lib/ai/config.ts for consistent behavior across copilot and briefing features.

**Independent Test**: Change model configuration in src/lib/ai/config.ts and verify both copilot and briefing generation use the updated configuration.

### Implementation for User Story 4

- [X] T027 [US4] Verify copilot agent.ts uses AI_CONFIG from src/lib/ai/config.ts for model ID and maxIterations
- [X] T028 [US4] Verify briefing ai-client.ts uses AI_CONFIG from src/lib/ai/config.ts for model ID
- [X] T029 [US4] Update any remaining hardcoded AI settings to reference AI_CONFIG in src/lib/copilot/agent.ts
- [X] T030 [US4] Update any remaining hardcoded AI settings to reference AI_CONFIG in src/lib/briefing/ai-client.ts
- [X] T031 [US4] Document AI configuration usage patterns in code comments for future developers

**Checkpoint**: All user stories should now be independently functional with unified configuration

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, validation, and improvements that affect multiple user stories

- [X] T032 [P] Remove all @cloudflare/ai-utils imports from codebase
- [X] T033 [P] Verify package.json no longer includes @cloudflare/ai-utils dependency
- [X] T034 Run type checking to ensure no TypeScript errors: `bun run type-check`
- [X] T035 Run linter to ensure code quality: `bun run lint`
- [X] T036 Verify all 5 copilot tools work correctly through manual testing
- [X] T037 Verify briefing generation works correctly through manual testing
- [X] T038 Verify Sentry spans appear correctly for all AI operations
- [X] T039 Verify error handling and fallback mechanisms work for both features
- [X] T040 Verify performance is equivalent or better than current implementation
- [X] T041 Run quickstart.md validation checklist to confirm migration success
- [X] T042 Update any documentation that references @cloudflare/ai-utils to mention Agents SDK

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P2 → P3 → P4)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May benefit from US4 config but can work independently
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Should ideally complete after US2 and US3 to verify config usage

### Within Each User Story

- Tool conversions (T006-T010) can run in parallel - they're independent
- Agent.ts updates (T011-T017) must follow tool conversions
- Briefing updates (T018-T022) are independent of copilot work
- Config verification (T023-T027) should follow US2 and US3 completion

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, user stories can start in parallel (if team capacity allows)
- Tool conversions within US2 (T006-T010) can run in parallel - different tools, no dependencies
- Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 2

```bash
# Launch all tool conversions together:
Task: "Convert get_iss_position tool to Agents SDK format in src/lib/copilot/tools.ts"
Task: "Convert get_upcoming_passes tool to Agents SDK format in src/lib/copilot/tools.ts"
Task: "Convert get_pass_weather tool to Agents SDK format in src/lib/copilot/tools.ts"
Task: "Convert get_user_location tool to Agents SDK format in src/lib/copilot/tools.ts"
Task: "Convert search_knowledge_base tool to Agents SDK format in src/lib/copilot/tools.ts"

# These can all be done in parallel since they're independent tool definitions
```

---

## Implementation Strategy

### MVP First (User Story 2 Only)

1. Complete Phase 1: Setup (install agents, create config)
2. Complete Phase 2: Foundational (verify imports work)
3. Complete Phase 3: User Story 2 (Copilot Migration)
4. **STOP and VALIDATE**: Test User Story 2 independently - all 5 tools should work
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 2 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 3 → Test independently → Deploy/Demo
4. Add User Story 4 → Test independently → Deploy/Demo
5. Polish & Cleanup → Final validation

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 2 (Copilot Migration)
   - Developer B: User Story 3 (Briefing Migration) - can start in parallel
   - Developer C: User Story 4 (Config Unification) - can start after US2/US3
3. Stories complete and integrate independently

---

## Notes

- **Total Tasks**: 42 (T001-T042)
- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- User Story 1 (Research & Selection) is already complete - Cloudflare Agents SDK selected
- Migration maintains feature parity - no functionality changes, only framework migration
- Manual testing is acceptable - no test suite required for this migration
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Critical**: T005 (sanitization), T018-T020 (validation & sanitization), T021 (documentation) address security and maintainability requirements FR-011, FR-016, FR-018
- Avoid: breaking existing functionality, losing Sentry instrumentation, performance regressions
