# Research: Cloudflare Workers Deployment

**Feature**: 002-cloudflare-deploy  
**Date**: 2025-12-14  
**Status**: Complete

## Research Summary

This document captures the research findings for deploying the TanStack Start application to Cloudflare Workers, including CI/CD setup with GitHub Actions.

---

## Decision 1: Deployment Target - Cloudflare Workers vs Pages

**Decision**: Use **Cloudflare Workers** as the deployment target

**Rationale**:
- TanStack Start is a full-stack framework requiring server-side rendering (SSR)
- The application uses `createServerFn` for server functions that require a server runtime
- Cloudflare Workers provides edge compute for running server-side code
- The existing configuration (`@cloudflare/vite-plugin` with SSR mode) is already set up for Workers
- Cloudflare Pages is primarily designed for static sites and requires additional complexity for SSR applications

**Alternatives Considered**:
- **Cloudflare Pages**: Rejected because it's optimized for static site generation (SSG) and would require workarounds for SSR functionality
- **Vercel/Netlify**: Not considered as user specifically requested Cloudflare deployment

---

## Decision 2: Build and Deploy Configuration

**Decision**: Use existing Vite + Wrangler configuration with minor adjustments

**Rationale**:
- The project already has `@cloudflare/vite-plugin` configured in `vite.config.ts`
- Wrangler configuration exists in `wrangler.jsonc` with correct settings
- The `nodejs_compat` compatibility flag is already enabled for Node.js API compatibility
- TanStack Start's server entry point (`@tanstack/react-start/server-entry`) is properly configured

**Current Configuration (wrangler.jsonc)**:
```jsonc
{
  "name": "tanstack-start-app",
  "compatibility_date": "2025-09-02",
  "compatibility_flags": ["nodejs_compat"],
  "main": "@tanstack/react-start/server-entry"
}
```

**Recommended Enhancement**:
- Add `observability.enabled: true` for built-in Cloudflare logging
- Update `compatibility_date` to current date (2025-12-14)

---

## Decision 3: GitHub Actions CI/CD Workflow

**Decision**: Use `cloudflare/wrangler-action@v3` for GitHub Actions deployment

**Rationale**:
- Official Cloudflare action with maintained support
- Handles Wrangler installation and authentication automatically
- Provides clear deployment status feedback to GitHub commits
- Supports both production and preview deployments

**Implementation Pattern**:
```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
      - name: Install dependencies
        run: bun install
      - name: Build & Deploy Worker
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

**Required GitHub Secrets**:
- `CLOUDFLARE_API_TOKEN`: API token with "Edit Cloudflare Workers" permissions
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account identifier

---

## Decision 4: Environment Variables and Secrets Management

**Decision**: Use `.dev.vars` for local development and Wrangler CLI/Dashboard for production secrets

**Rationale**:
- Cloudflare Workers use `env` bindings, not `process.env`
- Secrets are encrypted at rest and never exposed in logs
- `.dev.vars` file follows dotenv syntax for local development parity
- Wrangler CLI provides programmatic secret management

**Implementation Pattern**:

**Local Development (`.dev.vars`)**:
```bash
VITE_SENTRY_DSN=https://...@sentry.io/...
# Other development secrets
```

**Production Secrets (via Wrangler)**:
```bash
npx wrangler secret put SENTRY_DSN
npx wrangler secret put OTHER_SECRET
```

**Accessing in Code (Server Functions)**:
```typescript
import { env } from "cloudflare:workers";

const getData = createServerFn().handler(() => {
  const secret = env.SECRET_NAME;
  // Use secret
});
```

---

## Decision 5: Sentry Integration

**Decision**: Keep `@sentry/tanstackstart-react` for client-side, evaluate `@sentry/cloudflare` for server-side

**Rationale**:
- Current Sentry setup uses `@sentry/tanstackstart-react` which is client-side only (initialized when `!router.isServer`)
- This will continue to work in the deployed environment for browser error tracking
- For server-side error tracking in Workers, `@sentry/cloudflare` package would be needed
- The `nodejs_compat` flag provides necessary Node.js APIs for Sentry to function

**Current Setup Analysis**:
```typescript
// src/router.tsx - Only initializes on client
if (!router.isServer) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    // ...
  })
}
```

**Recommendation**:
- Phase 1: Deploy with existing client-side Sentry (no changes needed)
- Phase 2 (future): Add `@sentry/cloudflare` for server-side error tracking if needed

---

## Decision 6: Preview and Local Testing

**Decision**: Use `vite preview` for local Workers environment simulation

**Rationale**:
- The Cloudflare Vite plugin provides local Workers simulation through Vite preview
- No separate miniflare setup needed
- Accurately simulates production Workers environment
- Package.json already has `preview` script configured

**Commands**:
```bash
# Build for production
bun run build

# Preview locally (simulates Workers environment)
bun run preview
```

---

## Technical Dependencies

| Dependency | Version | Purpose |
|-----------|---------|---------|
| `@cloudflare/vite-plugin` | ^1.13.8 | Vite integration for Workers |
| `wrangler` | ^4.40.3 | CLI for deployment and local dev |
| `@sentry/tanstackstart-react` | ^10.22.0 | Client-side error tracking |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Node.js API incompatibility | Low | High | `nodejs_compat` flag enabled; test thoroughly in preview |
| Build size exceeds limits | Low | Medium | Monitor bundle size; Workers allow 10MB compressed |
| Sentry server-side not working | Medium | Low | Client-side still works; add `@sentry/cloudflare` if needed |
| Environment variable misconfiguration | Medium | Medium | Use `.dev.vars` for parity; document required secrets |
| GitHub Actions timeout | Low | Low | 10-minute timeout is sufficient; typical deploy < 2 min |

---

## References

- [TanStack Start on Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/)
- [GitHub Actions for Workers](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
- [Workers Secrets Management](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Sentry Cloudflare Guide](https://docs.sentry.io/platforms/javascript/guides/cloudflare/)





