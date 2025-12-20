# Feature Specification: Observation Copilot

**Feature Branch**: `007-observation-copilot`  
**Created**: 2025-01-27  
**Status**: Draft  
**Input**: User description: "Observation Copilot (Chat + Tools) - As a user, I want to ask natural-language questions about the ISS and upcoming passes and get accurate, personalized answers. Chat panel on a Mission Control or Copilot tab. Tool-calling agent that can query ISS position and pass APIs, call weather API, and look up ISS/spaceflight facts via RAG index."

## Clarifications

### Session 2025-01-27

- Q: How long should conversation history persist? → A: Conversations persist only during the current session and are cleared when user leaves
- Q: What happens if a user submits many questions rapidly? → A: Soft rate limit: Queue rapid requests (e.g., max 3 concurrent, queue next 5, reject beyond that)
- Q: How should non-English questions be handled? → A: English-only with graceful fallback (detect non-English, respond politely that only English is supported)
- Q: How far back should the system remember conversation context? → A: Last 10 messages or 15 minutes, whichever is shorter
- Q: How should user data be handled in logs and for privacy? → A: Standard privacy: Sanitize logs (hash/mask user identifiers, locations approximate to city-level, redact PII from questions)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Basic ISS Pass Information Queries (Priority: P1)

As a user, I want to ask natural-language questions about upcoming ISS passes for my location and receive accurate, personalized answers in a conversational format.

**Why this priority**: This is the core value proposition - enabling users to quickly get information about ISS passes through natural conversation rather than navigating multiple screens. This delivers immediate value and can be tested independently.

**Independent Test**: Can be fully tested by asking questions like "When is my next visible pass?" and verifying accurate responses with pass details. Delivers value even without weather or knowledge base features.

**Acceptance Scenarios**:

1. **Given** a user has a saved location, **When** they ask "When is my next visible pass?", **Then** the system responds with the date, time, duration, and visibility details for the next pass
2. **Given** a user has a saved location, **When** they ask "What passes are coming up this week?", **Then** the system responds with a list of upcoming passes with key details
3. **Given** a user asks about ISS passes, **When** they have no saved location, **Then** the system prompts them to set a location or asks for location details
4. **Given** a user asks a question, **When** the system responds, **Then** the response includes clickable links to relevant map views or pass detail panels when applicable

---

### User Story 2 - Pass Quality Assessment with Weather (Priority: P2)

As a user, I want to ask whether an upcoming pass is worth observing based on weather conditions, so I can make informed decisions about when to go outside.

**Why this priority**: Weather integration adds significant value by helping users assess pass quality, but the core chat functionality (P1) must work first. This extends the value proposition with practical decision-making support.

**Independent Test**: Can be fully tested by asking "Is tonight's pass worth waking the kids?" and verifying the response considers both pass details and current weather conditions. Delivers enhanced value beyond basic pass information.

**Acceptance Scenarios**:

1. **Given** a user asks about pass quality, **When** the system responds, **Then** the response includes weather conditions relevant to observation (cloud cover, visibility)
2. **Given** a user asks "Is tonight's pass worth watching?", **When** weather data is available, **Then** the system provides a recommendation based on both pass characteristics and weather conditions
3. **Given** a user asks about pass quality, **When** weather data is unavailable, **Then** the system provides pass information with a note that weather data could not be retrieved

---

### User Story 3 - ISS Knowledge and Context (Priority: P3)

As a user, I want to ask general questions about the ISS, spaceflight, or orbital mechanics and receive accurate answers from a curated knowledge base.

**Why this priority**: Knowledge base queries enhance the educational value and user engagement, but are not essential for the core pass information use case. This adds depth to the conversational experience.

**Independent Test**: Can be fully tested by asking "Explain what the ISS is doing above my location right now" or "What is the ISS?" and verifying accurate, contextual responses. Delivers educational value and deeper engagement.

**Acceptance Scenarios**:

1. **Given** a user asks a general ISS or spaceflight question, **When** the system responds, **Then** the response is accurate and draws from the curated knowledge base
2. **Given** a user asks "Explain what the ISS is doing above my location right now", **When** the system responds, **Then** the response combines current position data with contextual information about the ISS
3. **Given** a user asks a question outside the knowledge domain, **When** the system cannot answer, **Then** the system politely indicates it can only help with ISS-related topics

---

### Edge Cases

- What happens when a user asks a question but has no saved location and doesn't provide location details in their question?
- How does the system handle ambiguous questions that could relate to multiple tools (e.g., "Tell me about tonight")?
- What happens when weather API is unavailable or returns errors?
- How does the system handle questions that require multiple tool calls in sequence?
- What happens when a user asks follow-up questions that reference previous conversation context?
- How does the system handle malformed or nonsensical questions?
- What happens when the knowledge base doesn't contain relevant information for a question?
- How does the system handle questions about future dates beyond available pass predictions?
- How does the system handle rapid question submission (e.g., user submits many questions in quick succession)?
- What happens when a user asks a follow-up question that references context beyond the 10-message or 15-minute window?
- How does the system prevent sensitive or personally identifiable information from being logged or exposed?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a chat interface where users can type natural-language questions
- **FR-002**: System MUST understand questions about ISS passes, positions, weather, and general ISS knowledge
- **FR-003**: System MUST query ISS position and pass data for the user's saved location when relevant
- **FR-004**: System MUST query weather data when questions relate to pass visibility or observation quality
- **FR-005**: System MUST query a knowledge base when questions relate to general ISS or spaceflight information
- **FR-006**: System MUST maintain conversation context for the last 10 messages or 15 minutes (whichever is shorter) to handle follow-up questions and references to previous messages
- **FR-007**: System MUST combine results from multiple tools when needed to answer a question comprehensively
- **FR-008**: System MUST format responses in natural, conversational language
- **FR-009**: System MUST include clickable links in responses when referencing map views, pass details, or external resources
- **FR-010**: System MUST provide suggested prompts to help users get started
- **FR-011**: System MUST handle cases where required data (location, weather, knowledge) is unavailable gracefully
- **FR-012**: System MUST log all tool calls and final responses for debugging and evaluation purposes, with sanitization applied (hash/mask user identifiers, approximate locations to city-level, redact personally identifiable information from questions)
- **FR-013**: System MUST clearly separate deterministic tool functions from conversational reasoning logic
- **FR-014**: System MUST prompt users to set a location when location-dependent queries are made without a saved location
- **FR-015**: System MUST implement soft rate limiting to handle rapid question submission (maximum 3 concurrent requests, queue up to 5 additional requests, reject requests beyond the queue limit)
- **FR-016**: System MUST detect non-English questions and respond politely that only English is currently supported
- **FR-017**: System MUST sanitize all user data before storage or logging (hash user identifiers, approximate locations to city-level, redact personally identifiable information)

### Key Entities *(include if feature involves data)*

- **Conversation**: Represents a session-scoped chat session with a user, containing message history and context. The system maintains context for the last 10 messages or 15 minutes (whichever is shorter). Conversations are cleared when the user ends their session.
- **Message**: Represents a single user question or system response in a conversation
- **Tool Call**: Represents an invocation of a specific tool (ISS API, weather API, knowledge base) with parameters and results
- **Suggested Prompt**: Represents a pre-written question template that users can select to get started

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users receive accurate answers to ISS pass questions 95% of the time (accuracy measured by correct pass times, dates, and visibility details)
- **SC-002**: System responds to user questions within 5 seconds for simple queries and within 15 seconds for queries requiring multiple tool calls
- **SC-003**: 90% of users successfully get answers to their questions on the first attempt without needing to rephrase
- **SC-004**: Users can complete a typical query flow (ask question, receive answer, click link to detail view) in under 30 seconds
- **SC-005**: System correctly identifies which tools to call for a given question 90% of the time (measured by tool selection accuracy)
- **SC-006**: Responses include relevant links or references 80% of the time when applicable (e.g., map views, pass details)
- **SC-007**: System maintains conversation context correctly for follow-up questions 85% of the time (measured by context preservation accuracy)

## Assumptions

- Users have a saved location preference in the system (or can provide one when prompted)
- Weather API provides data relevant to astronomical observation (cloud cover, visibility)
- Knowledge base contains curated, accurate information about ISS and spaceflight topics
- System supports English-only for this release; non-English questions are detected and gracefully declined
- Tool APIs (ISS position, passes, weather) are available and reliable
- Conversation state persists only for the duration of a user session and is cleared when the session ends
- Suggested prompts are contextually relevant and help users discover capabilities

## Dependencies

- Existing ISS position and pass data APIs
- Weather data API integration
- User location storage/preferences system
- Map view and pass detail panel components (for embedded links)
- Agent/orchestration framework for managing tool calls and conversation state
