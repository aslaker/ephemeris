<!--
Sync Impact Report
==================
Version change: N/A → 1.0.0
Added sections:
  - I. Component Architecture (React + Tao of React)
  - II. Data Flow & State Management (TanStack Query, Store, DB)
  - III. Routing & Navigation (TanStack Router, Start)
  - IV. Performance Optimization (React + TanStack patterns)
  - V. Code Quality & Testing
  - VI. Observability & Error Handling (Sentry integration)
  - Technology Stack (TanStack, Tailwind, Shadcn, Biome)
  - Development Workflow (conventional commits, PR process)
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ aligned (Constitution Check section exists)
  - .specify/templates/spec-template.md ✅ aligned (User stories + requirements structure)
  - .specify/templates/tasks-template.md ✅ aligned (phased approach + checkpoints)
Follow-up TODOs: None
-->

# Ephemeris Constitution

## Core Principles

### I. Component Architecture

React components MUST follow these structural principles derived from the Tao of React:

- **Functional Components Only**: All components MUST be functional components using hooks. Class components are prohibited except when wrapping third-party libraries that require them.
- **Single Responsibility**: Each component MUST have one clear purpose. If a component handles multiple concerns, split it.
- **Composition Over Configuration**: Build complex UIs by composing small, focused components rather than prop-heavy configurable components.
- **Colocation**: Keep related code together—component, styles, tests, and types SHOULD live in proximity. Avoid cross-cutting organizational hierarchies.
- **Naming Clarity**: Component names MUST clearly describe what they render. File names MUST match the default export.
- **Props Interface**: All component props MUST be typed with TypeScript interfaces. Prefer explicit props over spreading.

**Rationale**: Clear component boundaries reduce cognitive load, simplify testing, and enable confident refactoring. The Tao of React emphasizes that well-structured components are the foundation of maintainable applications.

### II. Data Flow & State Management

Data fetching and state management MUST leverage TanStack libraries following these patterns:

- **TanStack Query for Server State**: All server/async state MUST use TanStack Query. Never store fetched data in React state or context.
- **Query Key Conventions**: Query keys MUST be arrays following the pattern `[entity, ...identifiers]` (e.g., `['users', userId]`).
- **TanStack Store for Client State**: Complex client-side state SHOULD use TanStack Store. Simple local state MAY use `useState`.
- **Derived State**: Use TanStack Store's `Derived` class for computed values rather than recalculating in components.
- **URL as State**: Shareable application state (filters, pagination, selections) MUST be reflected in the URL via TanStack Router search params.
- **Centralized Data Fetching**: Components SHOULD fetch their own data via `useQuery` at the point of use—avoid prop drilling fetched data.

**Rationale**: TanStack Query eliminates data synchronization bugs and provides caching, deduplication, and background updates. Separating server state from client state clarifies data ownership and simplifies debugging.

### III. Routing & Navigation

Navigation and routing MUST follow TanStack Router and TanStack Start patterns:

- **File-Based Routing**: Routes MUST be defined as files in `src/routes/`. Follow the established directory structure for nested routes.
- **Route Loaders for Critical Data**: Data required before render MUST use route `loader` functions. This ensures data is available when the component mounts.
- **Prefetching**: Implement `preload` on links for routes users are likely to visit next. Use TanStack Query's prefetching for data.
- **Type-Safe Links**: All navigation MUST use the `Link` component or `useNavigate` hook—never raw `<a>` tags for internal routes.
- **Server Functions**: Server-side logic MUST use `createServerFn` from TanStack Start. Keep server functions focused and composable.
- **Layout Components**: Shared UI MUST be defined in layout routes (`__root.tsx`, path groupings). Avoid duplicating headers/navigation across routes.

**Rationale**: File-based routing provides discoverability and consistency. Loaders ensure data is ready before render, eliminating loading spinners for critical content.

### IV. Performance Optimization

Applications MUST implement these performance patterns:

- **Memoization with Purpose**: Use `React.memo`, `useMemo`, and `useCallback` only when profiling identifies a performance issue or when passing callbacks/objects to memoized children.
- **Code Splitting**: Large routes and heavy components MUST use `React.lazy()` with `Suspense`. TanStack Router's built-in lazy loading SHOULD be preferred.
- **Avoid Premature Optimization**: Performance improvements MUST be data-driven. Profile before optimizing.
- **Minimize Re-renders**: Components MUST NOT cause cascading re-renders. Use React DevTools Profiler to identify unnecessary renders.
- **Image and Asset Optimization**: Large assets MUST be lazy-loaded. Use appropriate image formats and sizing.
- **Effect Cleanup**: All `useEffect` hooks with subscriptions, timers, or listeners MUST return cleanup functions.

**Rationale**: Performance optimizations have maintenance costs. Only optimize where measurements indicate problems, but always clean up effects to prevent memory leaks.

### V. Code Quality & Testing

Code quality standards MUST be maintained through:

- **TypeScript Strict Mode**: All code MUST compile with TypeScript strict mode. Explicit `any` requires justification in a comment.
- **Biome for Linting/Formatting**: All code MUST pass Biome checks before commit. Configure pre-commit hooks to enforce this.
- **Component Tests**: Interactive components SHOULD have tests verifying user interactions using React Testing Library.
- **Integration Tests**: Critical user journeys MUST have integration tests covering the full flow.
- **API Contract Tests**: Server functions and API endpoints SHOULD have contract tests validating request/response shapes.
- **Vitest as Test Runner**: All tests MUST run in Vitest. Prefer `test` over `it` for consistency.

**Rationale**: Static analysis catches errors early and enforces consistency. Tests at multiple levels provide confidence for refactoring and prevent regressions.

### VI. Observability & Error Handling

Production reliability MUST be ensured through proper observability:

- **Sentry Integration**: All errors MUST be captured by Sentry. The configuration in `src/router.tsx` handles this automatically.
- **Instrumented Server Functions**: Long-running or critical server functions MUST be wrapped with `Sentry.startSpan` for tracing.
- **Error Boundaries**: Component trees MUST have error boundaries at logical boundaries to prevent full-page crashes.
- **Structured Logging**: Use consistent log formats. Include context (user, request ID) in log messages.
- **Graceful Degradation**: When external services fail, the application SHOULD provide a degraded experience rather than crashing.

**Rationale**: Observability enables rapid incident response. Proper error handling ensures users have the best possible experience even when things go wrong.

## Technology Stack

**Framework**: TanStack Start (React 19, TanStack Router, server functions)
**Data Layer**: TanStack Query (server state), TanStack Store (client state), TanStack DB (when applicable)
**Styling**: Tailwind CSS with Shadcn/ui components
**Type Safety**: TypeScript strict mode, T3Env for environment variables
**Linting/Formatting**: Biome
**Testing**: Vitest with React Testing Library
**Observability**: Sentry for error tracking and instrumentation
**Build**: Vite

**Component Library**: When adding Shadcn components, use:
```bash
bunx shadcn@latest add <component>
```

## Development Workflow

**Branch Naming**: `[issue-number]-[kebab-case-description]` (e.g., `001-iss-tracker-migration`)

**Commit Messages**: Follow conventional commits format:
- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation changes
- `refactor:` code restructuring without behavior change
- `test:` adding or updating tests
- `chore:` maintenance tasks

**Pull Request Process**:
1. All changes MUST go through pull requests
2. PRs MUST pass all CI checks (Biome, TypeScript, tests)
3. PRs SHOULD include a summary and test plan
4. Breaking changes MUST be documented

**Pre-commit**: Run `bun run check` before committing to catch issues early.

## Governance

This constitution establishes the foundational practices for the Ephemeris project. All development decisions SHOULD reference these principles.

**Amendment Process**:
1. Propose changes via PR to this constitution file
2. Document rationale for changes
3. Update dependent templates if principles change
4. Increment version according to semantic versioning

**Compliance**:
- Code reviews SHOULD verify adherence to these principles
- Deviations MUST be justified with comments explaining why
- Use the feature specification workflow (speckit commands) for new features

**Version**: 1.0.0 | **Ratified**: 2025-12-13 | **Last Amended**: 2025-12-13
