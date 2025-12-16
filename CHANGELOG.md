# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

- Updated package.json with Cloudflare deployment scripts
- Improved accessibility across components (button types, SVG aria labels)
- Enhanced code quality with stricter linting rules
- Organized imports across UI components
- Refactored ISS components to use TanStack DB storage (StatsPanel, crew, index)
- Updated ISS queries to integrate with local database caching
- Enhanced ISS types with storage-related interfaces

### Fixed

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

### Removed

- Removed demo chat components (chat-area, messages, useChat hook)
- Removed demo chat routes and API (db-chat, db-chat-api)
