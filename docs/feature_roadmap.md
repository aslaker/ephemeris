# Ephemeris – AI Space Operations Copilot Feature Backlog

> **Architecture Notes**
> 
> Features marked with 🗄️ would benefit from **unified TanStack DB collections** (via `tanstack-dexie-db-collection` adapter) for cross-collection queries and agent tool integration.
> 
> Features marked with 🤖 would benefit from an **agent framework** (TanStack AI, Mastra, or similar) for tool-calling, conversation state, and multi-step reasoning.
> 
> See `specs/006-ai-pass-briefing/research.md` Section 7 for the TanStack DB migration path discussion.

---

## 1. AI Pass Briefing

- **Feature name:** AI Pass Briefing  
- **User story:** As a user, I want a clear, human-readable briefing for upcoming ISS passes over my location so I know when and how to observe it.  
- **UX:**
  - User inputs or saves a location and a date range.
  - System shows a list of upcoming passes; each pass has an auto-generated card or “Generate AI briefing” button.
  - Briefing card includes: best viewing time window, elevation, brightness estimate, cloud/visibility considerations, plain-English explanation (“This pass is bright because…”), and quick tips.
- **AI behavior:**
  - Uses ISS pass prediction data from Ephemeris plus weather API output as structured context.
  - LLM generates a narrative summary and practical recommendation based on that context.
  - Optional RAG over an internal “astronomy FAQ” corpus for educational snippets (magnitude, inclination, etc.).
- **Engineering notes:**
  - Data pipeline that combines orbital predictions and weather data into an LLM-ready schema.
  - Prompt templates that enforce structure (sections, max length, tone).
  - Guardrails/evals to ensure that times and angles in the narrative match underlying data.

---

## 2. Observation Copilot (Chat + Tools) 🗄️ 🤖

- **Feature name:** Observation Copilot  
- **Architecture trigger:** Unified TanStack DB enables consistent tool queries across positions, passes, briefings, weather. Agent framework manages conversation state and tool orchestration.  
- **User story:** As a user, I want to ask natural-language questions about the ISS and upcoming passes and get accurate, personalized answers.  
- **UX:**
  - Chat panel on a “Mission Control” or “Copilot” tab.
  - Suggested prompts: “When is my next visible pass?”, “Is tonight’s pass worth waking the kids?”, “Explain what the ISS is doing above my location right now.”
  - Responses can include embedded links to map views, pass detail panels, or external resources.
- **AI behavior:**
  - Tool-calling agent that can:
    - Query Ephemeris ISS position and pass APIs for the user’s saved location.
    - Call a weather API.
    - Look up basic ISS/spaceflight facts via a small RAG index (curated docs).
  - Agent plans which tools to call, stitches results, and produces a final answer with references.
- **Engineering notes:**
  - Agent/orchestration layer managing tool calls and conversation state.
  - Clear separation between tools (deterministic functions) and LLM reasoning.
  - Logging of each tool call and final response to support debugging and evaluation.

---

## 3. Daily Mission Log / AI Event Summarizer 🗄️

- **Feature name:** Daily Mission Log  
- **Architecture trigger:** Unified TanStack DB enables cross-collection aggregation (positions + events + crew changes) with reactive queries.  
- **User story:** As a user, I want a daily or weekly summary of ISS activity so I can follow what happened without watching the live map.  
- **UX:**
  - “Mission Log” page with cards like “Last 24 hours” and “This week.”
  - Optional email or notification digest subscription.
  - Each card summarizes: orbits completed, notable passes over the user’s region, relevant launches/dockings, and key ISS news items.
- **AI behavior:**
  - Aggregates orbital data for the period (orbits completed, passes above user’s region).
  - Optionally ingests ISS/spaceflight news into a RAG index (NASA blogs, mission updates).
  - LLM generates a concise summary card with sections like “Highlights,” “Notable passes,” “In the news.”
- **Engineering notes:**
  - Scheduled jobs compute telemetry aggregates and update the RAG index.
  - Style/length controls to keep summaries readable and low-hallucination.
  - Evals to ensure numerical metrics line up with raw telemetry.

---

## 4. Smart Alert Suggestions 🗄️

- **Feature name:** Smart Alert Suggestions  
- **Architecture trigger:** Unified TanStack DB enables rule engine to query passes with reactive updates for alert evaluation.  
- **User story:** As a user, I want the system to propose useful alert rules based on my preferences and context, not just raw thresholds.  
- **UX:**
  - Alert creation wizard: user picks location and general preference (e.g., “Evening only”, “Kid-friendly times”, “Only very bright passes”).
  - System shows 2–3 suggested rules, e.g., “Alert me for passes brighter than X before 10:30pm local, Friday–Sunday.”
  - User can accept, modify, or add advanced conditions.
- **AI behavior:**
  - LLM takes user preferences, historical passes, and profile info (time zone, usual awake hours) as input.
  - Generates candidate rules that balance frequency (not spammy) with “wow factor” (brightness, elevation).
- **Engineering notes:**
  - Rule engine to store rules, evaluate them against predicted passes, and trigger notifications.
  - LLM acts as “rule designer” that outputs structured JSON configs validated by the backend.
  - Feedback loop: user edits to rules logged to refine future suggestions.

---

## 5. AI Ops & Observability Layer

- **Feature name:** AI Ops & Observability Layer  
- **User story (internal):** As an AI engineer, I want to operate these features like a production AI system with observability, evals, and cost control.  
- **UX:**
  - Internal “Diagnostics” page (auth-gated) showing recent AI calls, approximate token usage, and latency histograms.
  - Possible small “How this works” section or blog-style page linked from the footer.
- **AI/engineering behavior:**
  - RAG index built from:
    - Ephemeris docs (how the tracker works, FAQ).
    - Curated ISS/astronomy docs (for explanations).
  - Logging of every LLM interaction: prompts, tool calls, outputs, cost, and latency.
  - Offline eval scripts comparing predicted pass data in AI responses vs. canonical calculations.
- **Engineering notes:**
  - Architecture diagram covering data sources, RAG pipeline, agent layer, and frontend.
  - Cost-aware design: caching, summarization, limiting tool-call depth.
  - Test strategy: unit tests for tools, integration tests for key workflows (briefings, alerts, mission log).

---

## 6. Launch & Docking Timeline Overlay 🗄️

- **Feature name:** Launch & Docking Timeline  
- **Architecture trigger:** New events collection in TanStack DB with reactive timeline updates. Cross-collection queries with positions for ground track overlay.  
- **User story:** As a user, I want to see upcoming and recent launches, dockings, and departures related to the ISS overlaid on the map and timeline.  
- **UX:**
  - “Mission Events” panel listing upcoming launches, dockings, undockings, and reentries relevant to ISS.
  - Events rendered on the time slider and optionally on the globe (e.g., launch site markers, ground tracks).
  - Clicking an event opens a detailed card with mission info and an “Explain this event” AI button.
- **Data sources:**
  - Launch Library / Launch Library 2 for upcoming launches and mission metadata.
  - RocketLaunch.Live for curated launch data and statuses.
  - SpaceX API for detailed launch/vehicle data on commercial crew/cargo missions.
- **AI behavior:**
  - LLM summarises each event (mission purpose, vehicle, provider, timeline) from structured API data.
- **Engineering notes:**
  - Event ingestion pipeline that normalizes data from multiple launch APIs.
  - Mapping events to ISS (destination, visiting vehicles, cargo vs. crew).
  - Syncing event timestamps with Ephemeris time axis.

---

## 7. Launch Telemetry Visualizer 🗄️

- **Feature name:** Launch Telemetry Visualizer  
- **Architecture trigger:** High-volume telemetry ingestion with reactive queries for real-time visualization sync.  
- **User story:** As a user, I want to see live or replayed launch telemetry (altitude, velocity) synchronized with the map and explained in plain English.  
- **UX:**
  - For supported launches, show a telemetry panel with altitude/velocity vs. time.
  - Animated globe showing rocket trajectory.
  - AI-generated annotations like “Max Q,” “MECO,” “Stage separation.”
- **Data sources:**
  - Telemetry from SpaceX / Launch webcast APIs (e.g., Launch Dashboard / SpaceDevs data).
- **AI behavior:**
  - LLM receives downsampled telemetry points and mission metadata as context, generating a narrative timeline of the flight.
- **Engineering notes:**
  - Websocket or polling pipeline for telemetry ingestion.
  - Synchronization of telemetry plots and map animation.
  - Caching/replay mode once the launch is complete.

---

## 8. Docking / Undocking / Reentry Tracker 🗄️

- **Feature name:** Visiting Vehicles Tracker  
- **Architecture trigger:** Cross-collection queries joining crew + vehicles + events for unified visiting vehicle view.  
- **User story:** As a user, I want to know what spacecraft are currently docked to the ISS, what’s arriving soon, and what’s leaving.  
- **UX:**
  - “Visiting Vehicles” panel listing current docked vehicles (Dragon, Cygnus, Soyuz, etc.) and upcoming arrivals/departures.
  - Icons on the ISS track showing attached vehicles, approach vectors, and reentry ground tracks.
- **Data sources:**
  - Launch APIs (Launch Library, RocketLaunch.Live) for mission mapping.
  - SpaceX API and other open APIs for specific vehicle status where available.
- **AI behavior:**
  - LLM explains each visiting vehicle’s role and mission in user-friendly terms.
- **Engineering notes:**
  - Mapping missions and launches to ISS visits.
  - Data model for vehicles, attachments, and event timelines.

---

## 9. Mission Planner Agent 🗄️ 🤖

- **Feature name:** Mission Planner Agent  
- **Architecture trigger:** Agent framework for multi-step planning. Unified TanStack DB enables agent tools to query passes + launches + satellites + weather with consistent interface.  
- **User story:** As a user, I want an AI to plan a “space night” for me that includes ISS passes, launches, and other interesting satellites visible from my location.  
- **UX:**
  - User specifies location, date or range, and preference level (casual, family, enthusiast).
  - Agent outputs an itinerary: times, events (ISS pass, launch, visible satellite), and what to look for.
  - Optionally generates reminders/alerts.
- **Inputs:**
  - ISS pass predictions from Ephemeris.
  - Upcoming launches from Launch Library / RocketLaunch.Live.
  - Optional additional satellites from open TLE sources (CelesTrak, etc.).
- **AI behavior:**
  - Agent calls tools for passes, launches, and satellites, then composes a schedule with narrative descriptions.
- **Engineering notes:**
  - Tool set for the agent (passes, launches, satellites, weather).
  - Heuristics to choose which events to include (visibility, brightness, user preferences).

---

## 10. Mission Log / News Agent 🗄️ 🤖

- **Feature name:** Space Ops Digest  
- **Architecture trigger:** Agent framework for content curation. Unified TanStack DB for aggregating ISS data + launches + news into personalized digest.  
- **User story:** As a user, I want a curated digest of ISS activity, launches, and other space events relevant to me.  
- **UX:**
  - Digest cards on a “Space Ops Digest” page (daily/weekly).
  - Optional email digest or push notification.
  - Sections like “Your sky”, “Launches”, “ISS activity”, “News”.
- **Inputs:**
  - ISS motion and passes (Ephemeris).
  - Launches from Launch Library / RocketLaunch.Live / SpaceX API.
  - ISS/spaceflight news via NASA APIs or curated feeds.
- **AI behavior:**
  - LLM composes a personalized summary, emphasizing events relevant to user’s region/time.
- **Engineering notes:**
  - Scheduler and aggregation jobs.
  - RAG over curated news docs to reduce hallucinations.

---

## 11. Multi‑Satellite “Sky Layer” 🗄️

- **Feature name:** Multi‑Satellite Sky Layer  
- **Architecture trigger:** Additional TLE collections in TanStack DB with reactive layer updates. Unified query interface for satellite positions across all sources.
- **User story:** As a user, I want to see other interesting satellites (Starlink, weather satellites, etc.) alongside the ISS and have them explained.  
- **UX:**
  - Layer selector: ISS, Starlink, weather sats, notable science missions.
  - Toggling layers shows satellite tracks/positions on the globe.
  - Clicking a satellite shows details and an “Explain this satellite” AI response.
- **Data sources:**
  - CelesTrak / other open TLE sources for satellite orbits.
  - Possibly Space-Track (with appropriate use and credentials).
- **AI behavior:**
  - LLM explains mission purpose, operator, and relevance using a RAG corpus for satellite descriptions.
- **Engineering notes:**
  - Efficient TLE ingestion and propagation.
  - Layer management and performance considerations on the frontend.

---

## 12. “Who’s In Space Right Now?” Panel

- **Feature name:** Who’s In Space  
- **User story:** As a user, I want to know which astronauts are currently in space and how they relate to ISS missions.  
- **UX:**
  - Panel listing people currently in space, with mission/expedition associations.
  - Clicking a person shows details (role, nationality, mission, duration in space).
- **Data sources:**
  - Public “people in space” APIs or datasets (as listed in space API aggregators).
- **AI behavior:**
  - LLM generates mini bios and explanations of each person’s role on the ISS or other missions.
- **Engineering notes:**
  - Mapping astronauts to ISS expeditions and visiting vehicles.
  - Light RAG index over astronaut bios.

---

## 13. Educational RAG: “Explain This Event”

- **Feature name:** Event Explainer  
- **User story:** As a user, I want a clear explanation of what a particular space event means (launch phase, docking, reentry, orbital maneuver, etc.).  
- **UX:**
  - Any event card (launch, docking, pass, reentry) has an “Explain this event” button.
  - Opens a side panel with an AI-generated explanation and optional diagrams/links.
- **Data sources:**
  - RAG corpus built from NASA/ESA/SpaceX public documentation, blogs, and educational pages.
- **AI behavior:**
  - LLM answers “What is happening here?” and “Why does this maneuver matter?” grounded in the indexed docs.
- **Engineering notes:**
  - Curated doc set for RAG to keep responses accurate and scoped.
  - Content filters to prevent hallucinated technical details.

---

## 14. Alerting & Storytelling Around Anomalies

- **Feature name:** Anomaly & Scrub Alerts  
- **User story:** As a user, I want to know when launches are scrubbed, delayed, or experience anomalies, and what that means in practical terms.  
- **UX:**
  - Special alert cards or badges on affected launches in the timeline.
  - “What happened?” button that opens an AI-generated summary with status and next steps.
- **Data sources:**
  - Launch statuses and reason fields from Launch Library / RocketLaunch.Live.
  - Curated news snippets where available.
- **AI behavior:**
  - LLM summarizes the situation and likely impact on schedules, grounded in structured status and any linked news.
- **Engineering notes:**
  - Event status monitoring and triggers for alerts.
  - Guardrails to avoid speculation beyond available data.

---

## 15. Product & Portfolio Framing

- **Feature name:** Portfolio‑Ready Product Framing (meta)  
- **Goal:** Present Ephemeris as an applied AI product where you led AI feature design, architecture, and operations.  
- **Key points to emphasize in README/portfolio:**
  - Ephemeris is a live ISS tracker with an AI “Mission Control” layer providing:
    - AI Pass Briefings
    - Observation Copilot (chat + tools)
    - Daily Mission Logs
    - Smart Alert Suggestions
    - Launch & docking visualizations and digests
  - You built end-to-end:
    - Orbital and launch data ingestion.
    - LLM-powered RAG and agentic workflows.
    - AI observability, evaluation, and cost monitoring.
  - Patterns generalize directly to SaaS products (support copilots, incident assistants, analytics explainers, etc.).
