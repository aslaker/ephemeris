# Implementation Plan: Cloudflare Workers Deployment

**Branch**: `002-cloudflare-deploy` | **Date**: 2025-12-14 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/002-cloudflare-deploy/spec.md`

## Summary

Deploy the TanStack Start application to Cloudflare Workers with full SSR support, environment variable management, and automated CI/CD via GitHub Actions. The existing Cloudflare configuration provides a solid foundation; this plan completes the deployment pipeline by adding GitHub Actions workflow, production secrets management, and deployment documentation.

## Technical Context

**Language/Version**: TypeScript 5.7, React 19, Node.js (via Workers `nodejs_compat`)  
**Primary Dependencies**: TanStack Start 1.132.0, @cloudflare/vite-plugin 1.13.8, Wrangler 4.40.3  
**Storage**: N/A (no persistent storage for this feature)  
**Testing**: Vitest (existing), manual deployment verification  
**Target Platform**: Cloudflare Workers (global edge network)  
**Project Type**: Web application (SSR full-stack)  
**Performance Goals**: Initial page load < 500ms globally, deploy time < 2 minutes  
**Constraints**: Workers script size < 10MB compressed, must maintain Sentry client-side tracking  
**Scale/Scope**: Single production environment, auto-deploy on main branch push

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Component Architecture** | ✅ Pass | No component changes; infrastructure only |
| **II. Data Flow & State Management** | ✅ Pass | No changes to data patterns |
| **III. Routing & Navigation** | ✅ Pass | File-based routing works with Workers SSR |
| **IV. Performance Optimization** | ✅ Pass | Edge deployment improves global latency |
| **V. Code Quality & Testing** | ✅ Pass | CI/CD will enforce Biome checks |
| **VI. Observability & Error Handling** | ✅ Pass | Sentry client-side preserved; server-side optional enhancement |

**Gate Status**: ✅ PASSED - No violations

## Project Structure

### Documentation (this feature)

```text
specs/002-cloudflare-deploy/
├── plan.md              # This file
├── research.md          # Phase 0 output - deployment research findings
├── data-model.md        # Phase 1 output - configuration entities
├── quickstart.md        # Phase 1 output - deployment guide
├── contracts/           # Phase 1 output - configuration interfaces
│   └── deployment-config.ts
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# New files to be created
.github/
└── workflows/
    └── deploy.yml       # GitHub Actions workflow for auto-deploy

# Existing files to be modified
wrangler.jsonc           # Add observability, update compatibility_date
package.json             # Verify deploy script
.gitignore               # Add .dev.vars for local secrets

# New files for secrets management
.dev.vars.example        # Template for local environment variables
```

**Structure Decision**: Infrastructure-only feature. No changes to src/ structure. New GitHub Actions workflow added at repository root level.

## Implementation Approach

### Phase 1: Core Deployment (P1 Stories - US1, US2)

1. **Update wrangler.jsonc** - Add observability, update compatibility date
2. **Verify build command** - Ensure `bun run build` works correctly
3. **Verify deploy command** - Ensure `bun run deploy` works correctly
4. **Validate SSR** - Confirm pages render with content

### Phase 2: Local Development & CI/CD (P2 Stories - US3, US4, US5)

1. **Create .dev.vars.example** - Template for local secrets
2. **Update .gitignore** - Ensure .dev.vars is ignored
3. **Document preview workflow** - Local Workers simulation
4. **Create GitHub Actions workflow** - Auto-deploy on push to main with Biome + TypeScript checks
5. **Document required secrets** - CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
6. **Verify Sentry integration** - Client-side tracking works in production

## Dependencies

| Dependency | Already Installed | Action Required |
|------------|-------------------|-----------------|
| @cloudflare/vite-plugin | ✅ Yes (1.13.8) | None |
| wrangler | ✅ Yes (4.40.3) | None |
| @sentry/tanstackstart-react | ✅ Yes (10.22.0) | None |

## External Requirements

| Requirement | Description | Action |
|-------------|-------------|--------|
| Cloudflare Account | Required for Workers deployment | User must have/create |
| API Token | "Edit Cloudflare Workers" permission | Create in Cloudflare dashboard |
| GitHub Secrets | Store API token and account ID | Configure in repo settings |

## Complexity Tracking

> No Constitution Check violations - this section is not applicable.

## Post-Design Constitution Re-Check

| Principle | Status | Notes |
|-----------|--------|-------|
| **V. Code Quality & Testing** | ✅ Pass | GitHub Actions enforces Biome + TypeScript checks |
| **VI. Observability** | ✅ Pass | Sentry client-side preserved, Workers observability enabled |
| **Development Workflow** | ✅ Pass | Follows branch naming, conventional commits, PR process |

**Final Gate Status**: ✅ PASSED - Ready for task breakdown
