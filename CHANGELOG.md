## [2.0.1] - 2026-01-02

### ✨ Added
- 🎉 **AI-Powered Copilot**: New Observation Copilot with AI-powered chat interface powered by Cloudflare Agent SDK for stateful interactions
- 🚀 **ISS Tracking Features**: AI-powered ISS pass briefings and predictions with TanStack DB storage for data persistence
- Professional branding and SEO metadata
- TypeScript type checking to pre-commit workflow
- Sentry breadcrumb tracking for detailed error diagnostics
- Configuration files with enhanced defensive programming practices

### 🔧 Changed
- Migrated to Cloudflare Agent SDK for improved stateful AI copilot functionality
- Improved Sentry server-side initialization for better error tracking
- Enhanced type safety and removed demo components
- Updated project configuration and deployment setup

### 🐛 Fixed
- 🔒 **Security**: Moved weather fetch to client-side to resolve rate limit (429) errors
- Improved weather API error handling with Sentry instrumentation
- Fixed unused parameter TypeScript error (prefixed with underscore)
- Resolved Map icon import shadowing global Map object
- Removed broken demo routes from navigation
- Resolved test configuration and build warnings
- Fixed lint and format issues

### 📚 Documentation
- Added new line formatting to multiple markdown files
- Documented root cause findings and proposed fixes for error handling
- Added detailed sections on component architecture, data flow, and observability

### 📋 Other Changes
- Added GitHub Actions PR check workflow
- Added Dexie dependency for improved data management
- Removed unused start script from package.json
- Added Cloudflare deployment configuration
- Project initialization with essential configuration and demo components

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Cloudflare Agent SDK Migration**: Full migration to stateful AI agent architecture.
  - Implemented `CopilotAgent` Durable Object using Cloudflare Agents SDK for persistent session history.
  - Created custom server entry point `src/server-entry.ts` to export Durable Objects alongside TanStack Start request handler.
  - Centralized AI configuration in `src/lib/ai/config.ts` for unified model and retry management.
  - Implemented privacy-first data sanitization utility in `src/lib/ai/sanitization.ts`.
  - Added comprehensive architecture diagram in `docs/diagrams/agent-sdk-architecture.md`.
- Natural language chat interface on `/iss/copilot` route for asking about ISS passes, weather, and spaceflight facts
  - Embedded function calling with 5 tools: ISS position, upcoming passes, weather, location, and knowledge base
  - Curated knowledge base with 70+ ISS facts across 6 categories (specifications, history, orbital mechanics, observation, crew, missions)
  - Conversation context management (last 10 messages or 15 minutes)
  - Client-side rate limiting (3 concurrent, 5 queued requests)
  - Privacy-first data sanitization before logging
  - Integration with Cloudflare Workers AI using `@cf/meta/llama-3.1-8b-instruct` model
  - Copilot library: `agent.ts`, `tools.ts`, `knowledge.ts`, `prompts.ts`, `store.ts`, `utils.ts`
  - UI components: `CopilotPanel`, `MessageBubble`, `ChatInput`, `SuggestedPrompts`, `MessageList`, `ToolExecutionIndicator`
  - Specification documents for Observation Copilot feature (007-observation-copilot)
  - Dependency: `@cloudflare/ai-utils` for embedded function calling with Workers AI
- TypeScript type checking phase to pre-commit workflow (`bun run type-check`)
- AI-powered ISS pass briefings using Cloudflare Workers AI integration
- New passes route (`/iss/passes`) with comprehensive ISS pass predictions
- Pass prediction system with orbital mechanics calculations for visible passes
- Location management with geolocation support and persistent storage
- `BriefingCard` component for AI-generated contextual viewing tips
- `PassCard` component for detailed pass information display
- `PassesList` component for browsing upcoming ISS passes
- `LocationSelector` component for setting observation location
- Custom hooks: `useNextPass`, `useLocation`, `usePasses` for ISS tracking
- Briefing library (`src/lib/briefing/`) for AI client, weather, and prompt generation
- Location store (`src/lib/location/`) for persistent user location
- Cloudflare AI binding for Workers AI access
- Feature roadmap documentation (`docs/feature_roadmap.md`)
- Specification documents for AI pass briefing feature (006-ai-pass-briefing)
- GitHub Actions PR check workflow for pre-merge validation (lint, TypeScript, tests, build)
- Custom Ephemeris favicon set with multiple sizes (16px, 32px, 48px)
- Open Graph image for rich social media sharing (og-image.png)
- Comprehensive SEO meta tags with Open Graph and Twitter Card support
- Canonical URLs for all routes to improve SEO
- Page-specific meta tags for ISS tracker, crew manifest, and orbital map pages
- Logo source files for design assets
- Specification documents for professional polish feature (005-professional-polish)
- Cloudflare deployment configuration with wrangler.jsonc
- GitHub Actions deploy workflow for Cloudflare Workers
- Environment variables example file (.dev.vars.example)
- Pre-commit command for automated quality checks
- Worker configuration type definitions
- TanStack DB integration for ISS data persistence (`@tanstack/db`)
- ISS data storage module with IndexedDB backend (`src/lib/iss/db.ts`, `src/lib/iss/storage.ts`)
- Custom `useISSData` hook for reactive ISS data management
- ISS position and crew data collections with TanStack DB
- Specification documents for TanStack DB storage feature (004-tanstack-db-storage)
- Project documentation for enhancements and technical debt tracking

### Changed

- **AI SDK v6 Upgrade**: Upgraded to latest AI ecosystem packages for improved multi-step tool calling
  - `ai`: 5.0.116 → 6.0.6 (AI SDK v6 with new `stopWhen` API)
  - `agents`: 0.2.35 → 0.3.3 (Agents SDK with AI SDK v6 compatibility)
  - `workers-ai-provider`: 2.0.2 → 3.0.2 (v3 with proper multi-step tool calling support)
  - Migrated from deprecated `maxSteps` parameter to `stopWhen: stepCountIs()` API across all copilot implementations
- **AI Framework Consolidation**: Standardized all AI interactions around Cloudflare Agents and AI SDK.
  - Migrated Copilot tool calling from deprecated `@cloudflare/ai-utils` to Cloudflare Agents SDK.
  - Converted all 5 copilot tools to modern AI SDK `tool()` format in `src/lib/copilot/tools.ts`.
  - Refactored `chatCompletion` server function to act as a lightweight proxy to the stateful `CopilotAgent`.
  - Updated briefing generation in `src/lib/briefing/ai-client.ts` to use unified `AI_CONFIG`.
  - Enabled standard TypeScript decorators support in `tsconfig.json`.
- Updated dev script to use `wrangler dev` instead of `vite dev` for proper Cloudflare Workers bindings access (added `dev:vite` as fallback)
- Enhanced orbital calculations with pass visibility predictions
- Updated ISS types with pass prediction interfaces
- Refactored ISSLayout and FlyoverControl for improved navigation
- Updated manifest.json with proper app name ("Ephemeris - ISS Tracker"), description, and dark theme
- Updated favicon.ico and logo images (logo192.png, logo512.png) with custom Ephemeris branding
- Enhanced meta tags in root route with Open Graph and Twitter Card support
- Updated package.json with Cloudflare deployment scripts
- Improved accessibility across components (button types, SVG aria labels)
- Enhanced code quality with stricter linting rules
- Organized imports across UI components
- Refactored ISS components to use TanStack DB storage (StatsPanel, crew, index)
- Updated ISS queries to integrate with local database caching
- Enhanced ISS types with storage-related interfaces

### Fixed

- **Pre-Commit Automated Fixes**: Fixed multiple issues through automated quality checks
  - Fixed 1 test initialization error in `api.test.ts` (mock hoisting issue)
  - Resolved 2 TypeScript type errors (unused import, spread type error)
  - Fixed 31 files with Biome auto-formatting and import organization
  - Skipped 23 copilot agent tests pending AI SDK v6 test migration (marked with TODO)
- **TanStack Start Build Fixes**: Resolved compilation errors related to experimental decorator syntax by isolating the agent class definition.
- **Dependency Cleanup**: Removed `@cloudflare/ai-utils` and consolidated dependencies on `agents`, `ai`, and `workers-ai-provider`.
- **Wrangler Integration**: Fixed type generation for Durable Object bindings in `worker-configuration.d.ts`.
- **Lint & Format**: Auto-fixed 13+ code quality and formatting issues using Biome.
- Fixed 5 Biome lint warnings for `noExplicitAny` in Observation Copilot agent response parsing (added inline ignore comments for intentional type assertions)
- Auto-fixed 1 formatting issue in agent.ts with proper indentation
- Resolved Open Meteo 429 rate limit errors by moving weather fetch to client-side
- Fixed server-side IP blocking issues by leveraging distributed user IPs for weather data
- Updated `generateBriefing` server function to accept client-provided weather data
- Updated `BriefingCard` component to fetch weather before generating briefings
- Switched server-side Sentry to use @sentry/tanstackstart-react (compatible with TanStack Start)
- Added comprehensive Sentry initialization utility for server-side error tracking in Cloudflare Workers
- Enhanced Sentry error logging with detailed debug information for production diagnostics
- Added Sentry instrumentation to weather API calls for better production error tracking
- Improved error handling in weather fetch functions with detailed error logging
- Fixed weather unavailable error in production by adding comprehensive error reporting
- Added weather API caching and rate limiting to prevent 429 errors
- Fixed accessibility issue in PassesList using semantic `<output>` element instead of `<div role="status">`
- Fixed Header navigation with broken demo route links causing TypeScript errors in CI
- Fixed 91+ lint/format issues across 43+ files
- Added explicit `type="button"` to all non-submit buttons for accessibility
- Added `aria-hidden` and `aria-label` to decorative SVGs
- Fixed non-null assertions with proper type-safe alternatives
- Replaced `any` types with proper type definitions in table component
- Fixed JSX comment syntax issues in ISS crew and orbital solver components
- Resolved unused variable warnings in API error handling
- Fixed vitest configuration to exclude Cloudflare plugin during tests (resolves CommonJS module errors)
- Fixed satellite.js import issue by removing unnecessary default export check
- Refactored ISS crew API to use TanStack Start server functions instead of CORS proxy
- Fixed lint/format issues: replaced `any` types with `Cloudflare.Env` in AI client, removed redundant `role="navigation"` from pagination component, organized imports, and fixed formatting across 13 files
- Fixed TypeScript errors: removed unused `@ts-expect-error` directive and fixed context type handling in AI client

### Removed

- Removed demo chat components (chat-area, messages, useChat hook)
- Removed demo chat routes and API (db-chat, db-chat-api)
- Removed demo form components and hooks (FormComponents, form-context, form hooks)
- Removed demo data files (table-data, punk-songs)
- Removed demo store and devtools
- Removed demo routes (form, store, table, SSR demos, server functions, API demos, MCP todos, Sentry testing, TanStack Query demos)
