# Feature Specification: ISS Tracker Migration

**Feature Branch**: `001-iss-tracker-migration`  
**Created**: December 13, 2025  
**Status**: Draft  
**Input**: User description: "Migrate the functional parts of the ISS Tracker project (generated on Google AI Studio) into the ephemeris TanStack Start application. Bring over logic, data fetching, and relevant styles. Styles must be Tailwind v4 compatible. Maintain original visual style while migrating to shadcn where possible."

## Clarifications

### Session 2024-12-13

- Q: What route structure should the ISS Tracker use within ephemeris? → A: Nested routes under `/iss` with sub-routes: `/iss` (Globe), `/iss/map`, `/iss/crew`
- Q: What level of Sentry instrumentation should be applied? → A: Instrument external API calls (ISS position, TLE, crew data fetches) with Sentry.startSpan
- Q: What is the shadcn component adoption strategy? → A: Selective - use shadcn for form inputs (Input, Button) but custom-build themed display components (StatsPanel, MatrixText, etc.)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View ISS Live Position on 3D Globe (Priority: P1)

A user visits the ISS Tracker section of the application to see the International Space Station's current position displayed on an interactive 3D globe. The globe shows the ISS location with a pulsing marker, the orbital path (history and predicted), and allows the user to rotate/zoom the view.

**Why this priority**: This is the core feature of the ISS Tracker - real-time visualization of the ISS position. Without this, the application has no primary value.

**Independent Test**: Can be fully tested by navigating to the ISS Tracker route and verifying the globe renders with the ISS position marker updating every 5 seconds.

**Acceptance Scenarios**:

1. **Given** the user navigates to the ISS Tracker page, **When** the page loads, **Then** a 3D globe is displayed with the current ISS position marked by a pulsing green indicator
2. **Given** the globe is displayed, **When** the user waits 5 seconds, **Then** the ISS position updates automatically with new coordinates
3. **Given** the ISS position is displayed, **When** valid TLE data is available, **Then** the orbital path (past 45 minutes and next 60 minutes) is drawn as lines on the globe
4. **Given** the globe is displayed, **When** the user interacts with the globe (drag/scroll), **Then** the view rotates and zooms accordingly

---

### User Story 2 - View ISS Telemetry Data (Priority: P1)

A user views a stats panel alongside the globe showing real-time ISS telemetry including latitude, longitude, altitude, velocity, orbital period, and last update timestamp.

**Why this priority**: Telemetry data is essential context that makes the visualization meaningful and informative. It's a core part of the tracker experience.

**Independent Test**: Can be fully tested by verifying the stats panel displays and updates with the same interval as the position data.

**Acceptance Scenarios**:

1. **Given** the user is viewing the ISS Tracker page, **When** position data is loaded, **Then** a stats panel displays formatted latitude, longitude, altitude (km), velocity (km/h), orbital period, and timestamp
2. **Given** the stats panel is visible, **When** new position data arrives, **Then** all telemetry values update with the new data
3. **Given** position data is loading, **When** the page first renders, **Then** a loading state is shown instead of empty values

---

### User Story 3 - View ISS Crew Manifest (Priority: P2)

A user navigates to the Crew page to see all astronauts currently aboard the ISS, including their names, photos (when available), roles, agencies, launch dates, and time in orbit with visual progress indicators.

**Why this priority**: Crew information adds human context to the tracker and is a distinct valuable feature, but secondary to the core tracking functionality.

**Independent Test**: Can be fully tested by navigating to the Crew route and verifying crew data displays with astronaut cards.

**Acceptance Scenarios**:

1. **Given** the user navigates to the Crew page, **When** the page loads, **Then** a grid of crew member cards is displayed with available information
2. **Given** crew data is available, **When** astronaut has known launch date, **Then** the card shows "Time in Orbit" with a progress bar toward estimated mission end
3. **Given** crew data is available, **When** astronaut image is available, **Then** the photo is displayed with the Matrix-style color filter effect
4. **Given** crew data is being fetched, **When** the API request is pending, **Then** skeleton loading cards are shown

---

### User Story 4 - View ISS Position on 2D Map (Priority: P2)

A user can switch to a 2D map view showing the ISS position projected onto a flat world map with the orbital path overlay.

**Why this priority**: Provides an alternative visualization that's useful for quick reference and works better on smaller screens.

**Independent Test**: Can be fully tested by navigating to the Map route and verifying the 2D projection renders correctly.

**Acceptance Scenarios**:

1. **Given** the user navigates to the Map page, **When** position data is available, **Then** the ISS is shown as a marker on a 2D world map projection
2. **Given** TLE data is available, **When** the map renders, **Then** orbital paths are drawn correctly, handling the anti-meridian crossing (wrapping)
3. **Given** the map is displayed, **When** position updates, **Then** the ISS marker moves to the new position

---

### User Story 5 - Predict Next ISS Flyover (Priority: P3)

A user can provide their location (via browser geolocation or manual input) to see when the ISS will next pass overhead with a countdown timer and the flyover arc displayed on the map/globe.

**Why this priority**: This is an advanced feature that requires user interaction and complex calculations. It adds significant value but depends on core features working first.

**Independent Test**: Can be tested by providing a location and verifying the next pass prediction appears with countdown.

**Acceptance Scenarios**:

1. **Given** the user clicks "Acquire Location", **When** browser grants geolocation permission, **Then** the user's coordinates are displayed and pass prediction begins
2. **Given** user location is set, **When** TLE data is available, **Then** the next visible pass (elevation > 10°) is calculated and displayed
3. **Given** a next pass is predicted, **When** viewing the page, **Then** a countdown timer shows time until the pass begins
4. **Given** a next pass is predicted, **When** viewing the globe or map, **Then** the flyover arc is displayed in a distinct color (gold)

---

### User Story 6 - View Orbital Parameters (Priority: P3)

A user can open an orbital solver modal to view detailed Keplerian orbital elements calculated from the current TLE data.

**Why this priority**: This is an educational/advanced feature for users interested in orbital mechanics. Nice to have but not essential for core tracking.

**Independent Test**: Can be tested by opening the modal and verifying all orbital parameters display with values.

**Acceptance Scenarios**:

1. **Given** the user is on the Dashboard, **When** they click the "ORBIT_DATA" button, **Then** a modal opens showing orbital parameters
2. **Given** the modal is open, **When** TLE data is available, **Then** inclination, eccentricity, mean motion, perigee, apogee, and period values are displayed
3. **Given** the modal is open, **When** the user clicks the close button, **Then** the modal closes

---

### User Story 7 - Experience Terminal UI Aesthetic (Priority: P2)

A user experiences the distinctive "Matrix terminal" visual design throughout the ISS Tracker section, including green-on-black color scheme, CRT effects (scanlines, flicker), animated text effects, and the startup "power on" animation.

**Why this priority**: The visual design is a core differentiator and part of the user experience. It must be preserved during migration.

**Independent Test**: Can be tested by visual inspection that all Matrix theme elements render correctly.

**Acceptance Scenarios**:

1. **Given** the user visits the ISS Tracker section, **When** entering for the first time, **Then** they see an initialization screen and click "INITIALIZE_UPLINK" to start
2. **Given** the "power on" is triggered, **When** the animation plays, **Then** a CRT-style turn-on effect transitions to the main interface
3. **Given** the interface is active, **When** viewing any page, **Then** scanline overlay and subtle CRT flicker effects are visible
4. **Given** data updates, **When** text changes, **Then** the Matrix-style text scramble animation plays

---

### Edge Cases

- What happens when ISS position API is unavailable? System falls back to legacy API via proxy, or shows "SIGNAL_LOST" error state.
- How does the system handle TLE data fetch failures? Uses fallback hardcoded TLE data and continues to display orbital paths.
- What happens when user denies geolocation permission? Displays specific error message (PERMISSION_DENIED) and allows manual coordinate entry.
- How does the orbital path handle the anti-meridian crossing (±180° longitude)? Path is split into segments to avoid incorrect rendering across the map.
- What happens when no visible pass is found within 24 hours? Displays "NO VISIBLE PASS DETECTED IN NEXT 24 HOURS" message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST fetch ISS position data from the Where The ISS At API with fallback to Open Notify API via proxy
- **FR-002**: System MUST update ISS position automatically every 5 seconds
- **FR-003**: System MUST fetch TLE (Two-Line Element) data from CelesTrak with fallback to ARISS and hardcoded data
- **FR-004**: System MUST calculate orbital paths (past and future) using the satellite.js library
- **FR-005**: System MUST display ISS position on an interactive 3D globe using react-globe.gl
- **FR-006**: System MUST display ISS position on a 2D map projection with proper anti-meridian handling
- **FR-007**: System MUST display telemetry data (lat, lon, altitude, velocity, period, timestamp) in a formatted stats panel
- **FR-008**: System MUST fetch and display ISS crew data with enriched metadata from local mission database
- **FR-009**: System MUST calculate next visible pass (>10° elevation) for a given user location
- **FR-010**: System MUST calculate orbital parameters (inclination, eccentricity, mean motion, perigee, apogee, period) from TLE data
- **FR-011**: System MUST preserve the Matrix terminal visual aesthetic with green (#00FF41) on black theme
- **FR-012**: System MUST implement CSS animations: scanlines, CRT flicker, CRT turn-on effect, and glitch text
- **FR-013**: System MUST implement the MatrixText component for animated text scramble effects
- **FR-014**: System MUST provide audio feedback (hover, click, data update, startup sounds) with mute toggle
- **FR-015**: System MUST integrate with TanStack Start routing using nested routes under `/iss` (Globe at `/iss`, Map at `/iss/map`, Crew at `/iss/crew`) and TanStack Query for data fetching
- **FR-016**: Styles MUST be migrated to Tailwind v4 syntax in the existing styles.css file
- **FR-017**: Components MUST use shadcn/ui for form inputs (Input, Button) with Matrix theme styling; display components (StatsPanel, MatrixText, crew cards, etc.) MUST be custom-built to preserve exact visual design
- **FR-018**: External API calls (ISS position, TLE, crew data) MUST be instrumented with Sentry.startSpan for observability

### Key Entities

- **ISS Position**: Real-time location data (latitude, longitude, altitude, velocity, visibility, timestamp)
- **TLE Data**: Two-Line Element set for orbital calculations (line 1, line 2)
- **Astronaut**: Crew member information (name, craft, role, agency, image, launchDate, endDate)
- **Pass Prediction**: Next flyover details (startTime, endTime, maxElevation, duration, path coordinates)
- **User Location**: Observer coordinates for pass prediction (latitude, longitude)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: ISS position updates display within 1 second of data fetch completing
- **SC-002**: 3D globe renders and becomes interactive within 3 seconds of page load on 10Mbps+ connection
- **SC-003**: All crew members currently on ISS are displayed with no missing entries
- **SC-004**: Pass predictions are calculated within 2 seconds of location acquisition
- **SC-005**: Visual design elements (Matrix theme) match original ISS Tracker: exact color values (#00FF41 text, #0a0a0a bg), Share Tech Mono font loads, all animations (scanlines, CRT flicker, text scramble) play correctly
- **SC-006**: All styles use Tailwind v4 syntax (no legacy @apply in non-standard locations)
- **SC-007**: Application functions correctly across modern browsers (Chrome, Firefox, Safari, Edge)
- **SC-008**: Mobile responsive layout provides usable experience on screens 375px and wider
- **SC-009**: Audio features work correctly with proper user interaction unlocking (Web Audio API)
- **SC-010**: Zero breaking changes to existing ephemeris application functionality

## Assumptions

- The satellite.js library will be added as a dependency (already used in source project)
- The react-globe.gl library will be added as a dependency (for 3D globe rendering)
- The three.js library will be added as a dependency (required by react-globe.gl)
- The Share Tech Mono font will be loaded from Google Fonts
- External APIs (Where The ISS At, Open Notify, CelesTrak) will remain available with current response formats
- TanStack Query is already configured in the ephemeris project (confirmed from project structure)
- The ISS Tracker will exist as a distinct section/route within ephemeris, not replacing existing content
