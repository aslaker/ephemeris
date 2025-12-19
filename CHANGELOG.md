# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

### Removed

- Removed demo chat components (chat-area, messages, useChat hook)
- Removed demo chat routes and API (db-chat, db-chat-api)
- Removed demo form components and hooks (FormComponents, form-context, form hooks)
- Removed demo data files (table-data, punk-songs)
- Removed demo store and devtools
- Removed demo routes (form, store, table, SSR demos, server functions, API demos, MCP todos, Sentry testing, TanStack Query demos)
