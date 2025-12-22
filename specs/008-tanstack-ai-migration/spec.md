# Feature Specification: AI Framework Migration & Standardization

**Feature Branch**: `008-tanstack-ai-migration`  
**Created**: December 20, 2025  
**Updated**: December 21, 2025  
**Status**: Approved  
**Decision**: Cloudflare Agents SDK selected (2025-12-20)  
**Input**: User description: "Our AI implementation feels a bit hard to maintain long term, and I want to use a standardized way to approach communication with the models and more importantly tool calling. We should look at migrating to Tanstack AI" (Updated to include Cloudflare Agents SDK comparison)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Framework Research & Selection (Priority: P1) ✅ COMPLETE

**Completion Date**: December 20, 2025  
**Decision**: Cloudflare Agents SDK selected (weighted score: 62.5/72.5 vs TanStack AI 58/72.5)  
**Artifacts**: See `research.md`, `plan.md`, and `data-model.md` for complete evaluation

As a developer evaluating AI framework options, I need a thorough comparison of TanStack AI and Cloudflare Agents SDK based on our specific use cases (copilot tool calling and briefing generation), so that we can select the framework that best fits our long-term maintainability and feature needs.

**Why this priority**: Choosing the right framework is the foundational decision that all migration work depends on. This must be completed first to avoid wasted effort migrating to the wrong solution.

**Independent Test**: Can be fully tested by reviewing research documentation that includes side-by-side comparison of both frameworks across all evaluation criteria, with clear recommendation backed by specific evidence.

**Acceptance Scenarios**:

1. **Given** we need to evaluate AI frameworks, **When** developer researches TanStack AI documentation and examples, **Then** research captures tool calling API design, Cloudflare Workers compatibility, streaming support, and typescript support quality
2. **Given** we need to evaluate AI frameworks, **When** developer researches Cloudflare Agents SDK documentation and examples, **Then** research captures tool calling patterns, native Workers integration, performance characteristics, and developer experience
3. **Given** both frameworks are researched, **When** developer creates comparison matrix, **Then** matrix includes scores/ratings for tool calling ease-of-use, maintenance burden, Cloudflare integration, streaming capabilities, type safety, community support, and migration effort
4. **Given** comparison is complete, **When** developer makes recommendation, **Then** recommendation includes specific framework choice with rationale addressing each evaluation criterion
5. **Given** a framework is selected, **When** developer validates the choice, **Then** validation includes proof-of-concept implementation of at least one tool call to verify framework works as documented

---

### User Story 2 - Copilot Tool Calling Migration (Priority: P2)

As a developer maintaining the ISS observation copilot, I need the AI tool calling implementation to use the selected framework's standardized API, so that tool definitions and execution follow consistent patterns and are easier to maintain than current @cloudflare/ai-utils implementation.

**Why this priority**: This is the most complex AI integration in the codebase with 5 tools (get_iss_position, get_upcoming_passes, get_pass_weather, get_user_location, search_knowledge_base). Migrating this first validates the chosen framework handles our most demanding use case.

**Independent Test**: Can be fully tested by sending chat messages that require tool calls (e.g., "What's the next ISS pass?") and verifying tools execute correctly with identical functionality to current implementation.

**Acceptance Scenarios**:

1. **Given** a user asks about ISS position, **When** copilot processes the message, **Then** get_iss_position tool is called and response includes current position data
2. **Given** a user asks about upcoming passes, **When** copilot processes the message with user location, **Then** get_upcoming_passes tool is called with correct coordinates and returns pass predictions
3. **Given** a user asks about weather for a pass, **When** copilot processes the message, **Then** get_pass_weather tool executes and returns cloud cover and visibility data
4. **Given** a user asks about ISS facts, **When** copilot processes the message, **Then** search_knowledge_base tool is called and returns relevant knowledge base entries
5. **Given** a tool call fails, **When** the error occurs, **Then** the system gracefully handles the error and provides user-friendly feedback without exposing technical details

---

### User Story 3 - Briefing Generation Migration (Priority: P3)

As a developer maintaining the AI briefing generation feature, I need the briefing generation to use the selected framework's prompt and response management, so that AI interactions follow the same patterns as the copilot and benefit from standardized error handling.

**Why this priority**: Briefing generation is simpler (no tool calling), making it ideal for validating the chosen framework's basic prompt/response patterns after tool calling is working. Lower risk than copilot.

**Independent Test**: Can be fully tested by requesting a briefing for any upcoming ISS pass and verifying the generated narrative, summary, and recommendations match quality and accuracy of current implementation.

**Acceptance Scenarios**:

1. **Given** a user requests a briefing for an upcoming pass, **When** the system generates the briefing, **Then** the AI produces a narrative with accurate pass times, elevation, and viewing tips
2. **Given** weather data is available for a pass, **When** the briefing is generated, **Then** the AI incorporates weather conditions and visibility recommendations into the narrative
3. **Given** the AI service is unavailable, **When** a briefing is requested, **Then** the system falls back to structured data without AI narrative and completes successfully
4. **Given** AI response parsing fails, **When** the briefing generation encounters invalid response format, **Then** the system uses fallback briefing with validated pass data

---

### User Story 4 - Unified AI Configuration (Priority: P4)

As a developer, I need a single configuration point for all AI interactions (model selection, timeouts, retry logic), so that AI behavior is consistent across all features and easier to modify.

**Why this priority**: Configuration unification improves maintainability but doesn't affect functionality. Should be done after migration to avoid rework.

**Independent Test**: Can be fully tested by changing model configuration in one place and verifying both copilot and briefing generation use the updated configuration.

**Acceptance Scenarios**:

1. **Given** a developer updates the AI model in configuration, **When** both copilot and briefing features run, **Then** both use the newly configured model
2. **Given** a developer updates retry settings, **When** an AI call fails, **Then** both features use the same retry logic defined in configuration
3. **Given** a developer reviews AI configuration, **When** examining the codebase, **Then** all AI-related settings are located in a single, clearly documented configuration module

---

### Edge Cases

- What happens when neither framework fully supports our Cloudflare Workers AI use case?
- How does the system handle differences in tool calling syntax between the two frameworks?
- What happens when evaluation criteria conflict (e.g., one framework has better DX but worse performance)?
- How does the system handle tool calls that return invalid JSON or unexpected data structures?
- What happens when multiple tools need to be called in sequence (tool chaining)?
- How does the system behave when AI model response time exceeds typical timeouts?
- What happens when migration is partially complete and different features use different AI libraries?
- How does the system handle tool call parameter validation failures?
- What happens when a tool is called with missing required location data?
- What happens if chosen framework's streaming API is interrupted mid-response (e.g., network failure)?

## Requirements *(mandatory)*

### Functional Requirements

#### Research & Evaluation Phase

- **FR-001**: Developer MUST research TanStack AI including documentation, examples, Cloudflare Workers compatibility, tool calling API design, type safety, and community support
- **FR-002**: Developer MUST research Cloudflare Agents SDK including documentation, examples, native Workers integration, tool calling patterns, performance characteristics, and developer experience
- **FR-003**: Developer MUST create comparison matrix evaluating both frameworks across defined criteria with weighted scoring: Cloudflare Workers compatibility (2x weight), tool calling API design (2x weight), maintenance burden (1.5x weight), and all other criteria (1x weight)
- **FR-004**: Developer MUST create proof-of-concept implementation using chosen framework demonstrating at least one tool call working with Cloudflare Workers AI
- **FR-005**: Developer MUST document framework selection decision with clear rationale addressing each evaluation criterion and any trade-offs made; if frameworks score within 10% of each other, Cloudflare Workers native integration is the primary tie-breaking factor

#### Migration Phase

- **FR-006**: System MUST migrate copilot chat completion to use selected framework's tool calling API while maintaining identical functionality to current @cloudflare/ai-utils implementation
- **FR-007**: System MUST migrate briefing generation to use selected framework's prompt/response API while maintaining identical output quality and format
- **FR-008**: System MUST preserve all existing tool definitions (get_iss_position, get_upcoming_passes, get_pass_weather, get_user_location, search_knowledge_base) with identical parameter schemas
- **FR-009**: System MUST maintain all existing error handling and fallback mechanisms (fallback briefings, error responses to users)
- **FR-010**: System MUST preserve Sentry instrumentation for all AI operations with equivalent span naming and breadcrumbs
- **FR-011**: System MUST validate tool call responses against expected Zod schemas before returning data to users; validation failures MUST log to Sentry and return user-friendly error message without exposing raw data; each of the 5 tools (get_iss_position, get_upcoming_passes, get_pass_weather, get_user_location, search_knowledge_base) MUST have explicit Zod schema defining expected response structure
- **FR-012**: System MUST handle AI service unavailability gracefully with fallback responses for both copilot and briefing features
- **FR-013**: System MUST support the same Cloudflare AI model (@cf/meta/llama-3.1-8b-instruct) or allow configuration to switch models
- **FR-014**: System MUST maintain or improve current AI response time performance (within 10% of current response times, see SC-007)
- **FR-015**: System MUST remove dependency on @cloudflare/ai-utils after successful migration
- **FR-016**: Developers MUST be able to add new tools to copilot using selected framework's standardized tool definition format
- **FR-017**: System MUST maintain conversation context handling for copilot (multi-turn conversations with tool calls)
- **FR-018**: System MUST sanitize sensitive data before logging to Sentry or sending to AI models to protect user privacy; specific fields requiring sanitization: latitude/longitude coordinates (replace with city/region approximation in logs), user identifiers, IP addresses, request IDs; sanitization utility MUST be created at src/lib/ai/sanitization.ts and applied to all tool call parameters before Sentry breadcrumbs and AI model submissions
- **FR-019**: Migration validation MAY use side-by-side comparison of old and new implementations if needed, but full replacement is acceptable given limited production usage of current @cloudflare/ai-utils implementation

#### Definition: "Identical Functionality"

Throughout this specification, "identical functionality" means:
- **Same Inputs → Same Outputs**: Given the same user input and tool parameters, the system produces the same response content and format
- **Same Error Handling**: Error scenarios (API failures, timeouts, invalid data) are handled with the same fallback mechanisms and user-facing messages
- **Same Instrumentation**: Sentry spans, breadcrumbs, and error tracking capture the same operational data with equivalent naming and context
- **Same Performance Profile**: Response times remain within 10% of current implementation (see SC-007)

This definition applies to FR-006, FR-007, SC-005, and SC-006.

### Security & Privacy Requirements

- **Data Sanitization**: Sensitive user data (geographic coordinates, personal identifiers) MUST be sanitized or excluded from Sentry logs, breadcrumbs, and AI model submissions
- **Observability Balance**: System MUST maintain sufficient logging for debugging while protecting user privacy through selective sanitization of tool call parameters
- **Fallback Data Handling**: Error messages and fallback responses MUST NOT expose raw sensitive data to end users or logs

### Key Entities *(include if feature involves data)*

- **Framework Evaluation Criteria**: Set of metrics for comparing AI frameworks including tool calling design, maintainability, integration quality, performance, type safety, documentation, and community support
- **Comparison Matrix**: Structured comparison of TanStack AI vs Cloudflare Agents SDK across all evaluation criteria with scores/ratings
- **Framework Selection Decision**: Documented choice of framework with rationale, trade-offs, and validation through proof-of-concept
- **Tool Definition**: Structure defining an AI-callable tool including name, description, parameter schema, and execution function
- **AI Message**: User or assistant message in conversation context, including role, content, and timestamp
- **Tool Execution Result**: Output from a tool call including success status, returned data, and any errors encountered
- **AI Configuration**: Settings for AI operations including model name, timeout values, retry logic, and feature flags
- **Conversation Context**: Historical messages and tool calls that provide context for current AI interaction
- **Data Sanitization Rules**: Specification of which data fields (coordinates, user identifiers) must be excluded or redacted from logs and AI submissions to protect user privacy

## Success Criteria *(mandatory)*

### Measurable Outcomes

#### Evaluation Phase

- **SC-001**: Comparison matrix completed covering both frameworks across all 12 evaluation criteria with weighted scoring (Tool Calling API Design 2x, Cloudflare Workers Compatibility 2x, Maintenance Burden 1.5x) and documented scores/ratings for each
- **SC-002**: Framework selection decision documented with specific rationale addressing each evaluation criterion
- **SC-003**: Proof-of-concept successfully demonstrates at least one tool call using chosen framework with Cloudflare Workers AI
- **SC-004**: Framework research completed within 5 business days with documented findings for both options

#### Migration Phase

- **SC-005**: All existing copilot functionality works identically to current implementation after migration (100% feature parity verified through testing)
- **SC-006**: All existing briefing generation functionality works identically to current implementation after migration (100% feature parity verified through testing)
- **SC-007**: AI response times remain within 10% of current performance (or improve) for both copilot and briefing features
- **SC-008**: Zero regressions in error handling behavior - all current error scenarios handled identically or better
- **SC-009**: Sentry instrumentation captures all AI operations with appropriate spans, breadcrumbs, and error tracking
- **SC-010**: Developer can add a new tool to copilot in 5 minutes or less using selected framework's standardized patterns
- **SC-011**: Codebase removes @cloudflare/ai-utils dependency and consolidates around selected framework as single AI interaction library
- **SC-012**: All AI-related configuration centralized in single, clearly documented module accessible to both features

## Assumptions

- At least one of the evaluated frameworks (TanStack AI or Cloudflare Agents SDK) will meet our requirements for tool calling and Cloudflare Workers AI integration
- Both frameworks have sufficient documentation and examples available for thorough evaluation
- Proof-of-concept can be implemented within evaluation timeframe to validate framework compatibility
- Migration can be done incrementally (one feature at a time) without breaking production functionality
- Current test coverage (if any) for AI features will be maintained or improved during migration
- Chosen framework's performance characteristics with Cloudflare AI models are comparable to or better than @cloudflare/ai-utils
- If neither framework fully meets requirements, adapters or wrappers can be built to bridge gaps
- Current @cloudflare/ai-utils implementation has limited production usage, reducing risk of full replacement migration approach (side-by-side comparison optional)
- This is a personal showcase application with no external users or deadlines, allowing fix-forward approach without rollback mechanisms

## Scope

### In Scope

- Research and documentation of TanStack AI capabilities and compatibility
- Research and documentation of Cloudflare Agents SDK capabilities and compatibility
- Creation of comparison matrix with evaluation criteria and framework scores
- Proof-of-concept implementation to validate chosen framework
- Framework selection decision with documented rationale
- Migration of copilot chat completion to selected framework
- Migration of briefing generation to selected framework
- Unification of AI configuration across both features
- Preservation of all existing functionality and error handling
- Maintenance of Sentry instrumentation
- Removal of @cloudflare/ai-utils dependency
- Documentation of chosen framework patterns for future development

### Out of Scope

- Evaluating frameworks beyond TanStack AI and Cloudflare Agents SDK
- Adding new AI features or capabilities beyond current functionality
- Changing AI models or model providers (maintain Cloudflare Workers AI)
- Modifying user-facing behavior or UI components
- Optimizing AI prompts or response quality (maintain current quality)
- Adding streaming responses to end users (unless chosen framework provides this automatically)
- Migrating to different model providers (e.g., OpenAI, Anthropic)
- Adding new tools to copilot beyond existing five tools
- Performance benchmarking beyond basic response time validation
- Rollback mechanisms or feature flags (fix-forward approach acceptable for personal showcase app)

## Dependencies

- TanStack AI library availability and compatibility with Cloudflare Workers
- Cloudflare Agents SDK availability and documentation quality
- Cloudflare Workers AI binding availability and continued support for @cf/meta/llama-3.1-8b-instruct model
- Existing Sentry instrumentation patterns must be compatible with chosen framework integration
- Current tool implementations (ISS API, orbital predictions, weather, knowledge base) remain unchanged
- Access to documentation and examples for both frameworks during evaluation period

## Risks

- **Evaluation Risk**: Neither framework may fully meet all requirements, requiring trade-offs or custom adapter implementation
- **Decision Risk**: Evaluation criteria may conflict (e.g., better DX vs better performance), making framework selection difficult
- **Documentation Risk**: Insufficient or outdated documentation for either framework could lead to incorrect evaluation
- **Technical Risk - TanStack AI**: May not fully support Cloudflare Workers AI provider, requiring adapter implementation
- **Technical Risk - Cloudflare Agents SDK**: May be too tightly coupled to Cloudflare's ecosystem, limiting flexibility for future changes
- **Migration Risk**: Incremental migration could introduce inconsistencies if both old and new libraries remain in codebase for extended period
- **Performance Risk**: Chosen framework's abstraction layer could introduce overhead affecting response times
- **Compatibility Risk**: Chosen framework's tool calling format may differ significantly from @cloudflare/ai-utils, requiring extensive schema transformations
- **Testing Risk**: Lack of comprehensive AI feature tests could allow regressions to slip through during migration
- **Maintenance Risk**: Chosen framework could become unmaintained or deprecated, requiring another migration in future
- **Lock-in Risk**: Cloudflare Agents SDK might lock us into Cloudflare-specific patterns that are hard to migrate away from later

## Evaluation Criteria

The following criteria will be used to compare TanStack AI and Cloudflare Agents SDK with weighted scoring:

### Weighted Criteria

1. **Tool Calling API Design** (Weight: 2x): How easy is it to define and execute tools? Is the API intuitive and well-documented?
2. **Cloudflare Workers Compatibility** (Weight: 2x): Does the framework work natively with Cloudflare Workers AI? Are there known issues or limitations?
3. **Maintenance Burden** (Weight: 1.5x): How much code is required? How easy is it to understand and modify?

### Standard Criteria (Weight: 1x each)

4. **Type Safety**: Does the framework provide strong TypeScript types for tools, messages, and responses?
5. **Streaming Support**: Does the framework support streaming responses? Is it well-integrated with the API?
6. **Error Handling**: Does the framework provide robust error handling patterns? Can we maintain our current fallback mechanisms?
7. **Documentation Quality**: Is the documentation comprehensive, accurate, and includes relevant examples?
8. **Community & Support**: Is there an active community? Are issues resolved quickly? Is the project actively maintained?
9. **Migration Effort**: How much work is required to migrate from @cloudflare/ai-utils? Are there breaking changes?
10. **Performance**: Are there known performance characteristics? Will it maintain or improve current response times?
11. **Conversation Context**: How well does it handle multi-turn conversations with tool calls?
12. **Future Flexibility**: Does the framework lock us into specific providers or allow flexibility to switch later?

### Scoring Approach

- Each criterion is scored on a scale of 1-5 (1 = poor, 5 = excellent)
- Weighted criteria scores are multiplied by their weight before summing
- Maximum total score: (5×2) + (5×2) + (5×1.5) + (9×5×1) = 72.5 points
- Final framework comparison uses weighted total scores

### Tie-Breaking Rules

If both frameworks score within 10% of each other across all evaluation criteria, the primary tie-breaking factor is **Cloudflare Workers native integration**. Native integration minimizes adapters, polyfills, and compatibility layers, reducing maintenance burden and potential failure points.

## Clarifications

### Session 2025-12-20

- Q: How should the system handle potentially sensitive data (user locations, ISS predictions) when sending to AI models and logging tool call parameters? → A: Sensitive data (coordinates, user info) are excluded from logs/traces; tool calls sanitize before AI submission
- Q: If both frameworks score similarly (within 10% of each other) across evaluation criteria, what should be the primary tie-breaking factor for framework selection? → A: Cloudflare Workers native integration (minimize adapters/polyfills)
- Q: How should the migration validate that tool calling behavior remains identical between old (@cloudflare/ai-utils) and new framework implementations? → A: Side-by-side comparison preferred but full replacement is acceptable given current implementation has limited production usage
- Q: If critical issues are discovered after migrating to the new framework, what is the acceptable rollback approach? → A: Fix forward only: no rollback needed since this is a personal showcase app with no deadlines or reliant users
- Q: Should all 12 evaluation criteria be weighted equally when scoring frameworks, or should certain criteria be weighted more heavily? → A: Weighted scoring: Cloudflare Workers compatibility (2x), tool calling API design (2x), maintenance burden (1.5x), all others (1x)

## Open Questions

None - specification is complete and ready for planning.
