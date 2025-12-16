# Feature Specification: Fix Crew Data Rendering Regression

**Feature Branch**: `003-fix-crew-render`  
**Created**: 2024-12-15  
**Status**: Draft  
**Input**: User description: "We seem to have a regression that occurred with our crew data. When we view the crew, we don't see anything rendered."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View ISS Crew Manifest (Priority: P1)

As a user, I want to view the current ISS crew manifest so that I can see who is currently aboard the International Space Station.

**Why this priority**: This is the core functionality that is broken. Without crew data rendering, the entire crew page is non-functional and provides zero value to users.

**Independent Test**: Can be fully tested by navigating to the `/iss/crew` route and verifying that crew member cards are displayed with their names, roles, agencies, and mission progress.

**Acceptance Scenarios**:

1. **Given** the user navigates to the crew page, **When** the API returns crew data, **Then** crew cards are rendered showing astronaut names, photos (when available), roles, and agencies
2. **Given** the user navigates to the crew page, **When** the page is loading, **Then** a loading skeleton with placeholder cards is displayed
3. **Given** the user navigates to the crew page, **When** the API returns an error, **Then** an error message "CREW_DATA_UNAVAILABLE" is displayed

---

### User Story 2 - View Mission Progress (Priority: P2)

As a user, I want to see each astronaut's mission timeline so I can understand how long they have been in orbit and when their mission is expected to end.

**Why this priority**: Mission progress information enhances the crew data but is secondary to simply being able to see who is aboard.

**Independent Test**: Can be tested by verifying that crew cards show "Time in Orbit" days, progress bar, launch date, and return date for astronauts with available mission data.

**Acceptance Scenarios**:

1. **Given** an astronaut has launch date data, **When** their card is displayed, **Then** show days in orbit count, progress bar, and mission dates
2. **Given** an astronaut has no launch date data, **When** their card is displayed, **Then** show "STATUS: ACTIVE" with "DATA STREAM LIMITED" message

---

### Edge Cases

- What happens when the Open Notify API changes its response format (craft name change, structure change)?
- How does the system handle when no crew members are aboard the ISS (empty array)?
- What happens when the proxy service (allorigins) is unavailable?
- How does the system handle partial data (crew returns but enrichment fails)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST fetch crew data from the Open Notify API via server-side request (using TanStack Start server function)
- **FR-002**: System MUST filter API response to show only ISS crew members (craft === "ISS")
- **FR-003**: System MUST display a loading state while crew data is being fetched
- **FR-004**: System MUST display an error state when crew data fetch fails
- **FR-005**: System MUST display an empty state when no ISS crew members are returned
- **FR-006**: System MUST render a card for each crew member showing name, craft, role, and agency
- **FR-007**: System MUST enrich crew data with mission dates and photos from the local mission database when available

### Key Entities

- **Astronaut**: Represents a crew member with id, name, craft, optional image, role, agency, launchDate, and endDate
- **CrewCard**: UI component displaying individual astronaut data with mission progress visualization

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view the ISS crew manifest within 3 seconds of page load
- **SC-002**: 100% of crew members returned by the API are displayed on the page
- **SC-003**: Crew cards display complete information (name, role, agency) for all astronauts
- **SC-004**: Loading and error states are clearly communicated to users
- **SC-005**: Previously working functionality (mission progress, images, timeline) is restored

## Assumptions

- The Open Notify API is the source of truth for current ISS crew data
- CORS restrictions apply to browser-side requests; server-side fetching via TanStack Start server functions bypasses this limitation
- The local mission database may not have entries for all crew members
- The API response structure includes `people` array with `name` and `craft` fields
