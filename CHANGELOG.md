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

### Changed

- Updated package.json with Cloudflare deployment scripts
- Improved accessibility across components (button types, SVG aria labels)
- Enhanced code quality with stricter linting rules
- Organized imports across UI components

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
