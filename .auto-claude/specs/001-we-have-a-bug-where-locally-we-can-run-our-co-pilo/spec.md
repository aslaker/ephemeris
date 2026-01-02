# Specification: ISS Copilot Feature - Cloudflare Deployment Bug Fix

## Overview

The ISS Observation Copilot feature, which allows users to ask natural language questions about the International Space Station, works correctly in local development but fails when deployed to Cloudflare. The user sees an error message "Cannot read properties of undefined (reading 'filter')" in the UI, along with a `net::ERR_BLOCKED_BY_CLIENT` browser console error and React Error #418 (hydration mismatch). This investigation will identify the root cause and implement a fix to restore the copilot functionality in production.

## Workflow Type

**Type**: investigation (bug fix for existing deployment)

**Rationale**: The feature is fully implemented and works locally. This is a deployment/environment-specific bug requiring investigation of the difference between local and production configurations, particularly around Cloudflare Durable Objects, environment bindings, and API response handling.

## Task Scope

### Services Involved
- **main** (primary) - React/TanStack frontend with Cloudflare Workers backend

### This Task Will:
- [ ] Investigate the root cause of the "Cannot read properties of undefined (reading 'filter')" error
- [ ] Verify Cloudflare Durable Object (CopilotAgent) is properly deployed and configured
- [ ] Check environment bindings (AI, CopilotAgent) are available in production
- [ ] Ensure API response handling is defensive against undefined data
- [ ] Address the `ERR_BLOCKED_BY_CLIENT` browser issue if related to the core problem
- [ ] Fix any hydration mismatches causing React Error #418

### Out of Scope:
- Adding new features to the copilot
- Changing the fundamental architecture of the agent system
- Performance optimizations beyond fixing the bug
- Redesigning the UI/UX of the copilot panel

## Service Context

### Main Service

**Tech Stack:**
- Language: TypeScript
- Framework: React with TanStack Router + TanStack Start
- Build Tool: Vite with @cloudflare/vite-plugin
- Styling: Tailwind CSS
- AI: Cloudflare Workers AI via AI SDK
- Deployment: Cloudflare Workers with Durable Objects

**Entry Point:** `src/server-entry.ts`

**How to Run:**
```bash
npm run dev
```

**Port:** 3000 (local development)

**Production URLs:**
- https://ephemeris.observer
- https://www.ephemeris.observer

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `src/lib/copilot/agent.ts` | main | Add defensive checks for undefined namespace/binding |
| `src/lib/copilot/agent-class.ts` | main | Add error handling for missing env bindings |
| `src/lib/iss/api.ts` | main | Add defensive check for `basicData.people` before `.filter()` |
| `src/lib/copilot/knowledge.ts` | main | Verify KNOWLEDGE_BASE is properly exported in production |
| `wrangler.jsonc` | main | Verify Durable Object configuration is complete |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `src/routes/iss/-components/Copilot/CopilotPanel.tsx` | Error handling pattern for API responses |
| `src/lib/copilot/store.ts` | Defensive null checks before array operations |
| `src/lib/copilot/tools.ts` | Tool execution with Sentry error capture |
| `src/routes/iss/-components/Copilot/BriefingErrorBoundary.tsx` | React error boundary pattern |

## Patterns to Follow

### Defensive Array Access

From `src/lib/copilot/store.ts`:

```typescript
// Always check if conversation exists before accessing messages
if (!prev.conversation) {
    // Auto-start conversation if none exists
    const conversation: Conversation = {
        id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        messages: [message],
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
    };
    return { ...prev, conversation };
}
```

**Key Points:**
- Check for null/undefined before accessing properties
- Provide fallback data structures when needed
- Use optional chaining (`?.`) for potentially undefined values

### Environment Binding Validation

From `src/lib/copilot/agent.ts`:

```typescript
// Get Agent DO binding
const agentNamespace = (env as any).CopilotAgent;

if (!agentNamespace) {
    throw new Error("CopilotAgent binding is not configured");
}
```

**Key Points:**
- Always validate bindings exist before use
- Throw descriptive errors when required bindings are missing
- Log errors to Sentry for visibility

### Error Handling with Sentry

From `src/lib/copilot/agent.ts`:

```typescript
Sentry.captureException(err, {
    tags: {
        copilot: "chat_proxy_error",
    },
    extra: sanitized as Record<string, unknown>,
});

return {
    status: "error",
    error: {
        code: "UNKNOWN_ERROR",
        message: `An error occurred: ${err.message}`,
    },
};
```

**Key Points:**
- Capture exceptions to Sentry with relevant context
- Return structured error responses
- Sanitize data before logging

## Requirements

### Functional Requirements

1. **Copilot Works in Production**
   - Description: The copilot chat interface should function identically in Cloudflare production as it does locally
   - Acceptance: Users can send messages and receive AI-generated responses about the ISS

2. **Error Messages are User-Friendly**
   - Description: When errors occur, users see helpful messages instead of raw JavaScript errors
   - Acceptance: The error boundary catches errors and displays "COPILOT ERROR" with retry option

3. **Environment Bindings are Validated**
   - Description: The application validates all required Cloudflare bindings on startup
   - Acceptance: Clear error messages in Sentry when bindings are misconfigured

### Edge Cases

1. **Missing AI Binding** - Return error response "AI service unavailable" instead of crashing
2. **Missing CopilotAgent DO** - Return error response "Copilot agent not configured" with instructions
3. **API Returns Undefined Data** - Handle gracefully with fallback data or error message
4. **Network Failures** - Show "Unable to connect to ISS data services" message
5. **Rate Limiting** - Queue requests and show loading state, don't crash

## Implementation Notes

### DO
- Follow the pattern in `src/lib/copilot/store.ts` for defensive null checks
- Reuse `CopilotErrorBoundary` for catching React rendering errors
- Use Sentry breadcrumbs to trace the exact failure point
- Add defensive checks for all `.filter()`, `.map()`, `.forEach()` calls on potentially undefined arrays
- Verify the `cloudflare:workers` import works in production builds

### DON'T
- Create new error handling patterns when existing ones work
- Remove the existing error boundary - augment it
- Suppress errors silently - always log to Sentry
- Assume APIs return valid data structures - validate everything

## Development Environment

### Start Services

```bash
# Local development
npm run dev

# Build for production
npm run build

# Deploy to Cloudflare
npm run deploy
```

### Service URLs
- Local Development: http://localhost:3000
- Production: https://ephemeris.observer

### Required Environment Variables
- `VITE_SENTRY_DSN`: Sentry DSN for error tracking (optional, in .env.local)
- `VITE_SENTRY_ORG`: Sentry organization slug
- `VITE_SENTRY_PROJECT`: Sentry project name
- `SENTRY_AUTH_TOKEN`: Sentry auth token (sensitive, for source maps)

### Required Cloudflare Bindings (in wrangler.jsonc)
- `AI`: Cloudflare Workers AI binding
- `CopilotAgent`: Durable Object binding for the agent

## Investigation Steps

### Step 1: Identify Exact Error Location

1. **Check Browser Console**
   - Note the full stack trace of "Cannot read properties of undefined (reading 'filter')"
   - Identify which file/line is causing the error

2. **Review Network Tab**
   - Check which request triggers `ERR_BLOCKED_BY_CLIENT`
   - Note if it's an ad blocker issue or actual network failure

### Step 2: Verify Cloudflare Configuration

1. **Check Cloudflare Dashboard**
   - Verify CopilotAgent Durable Object is deployed
   - Verify AI binding is enabled for the worker
   - Check worker logs for binding errors

2. **Review wrangler.jsonc**
   - Confirm `durable_objects.bindings` includes CopilotAgent
   - Confirm `ai.binding` is configured
   - Check migrations are applied

### Step 3: Add Defensive Code

1. **In `src/lib/iss/api.ts`**
   ```typescript
   // Before
   const issCrew = basicData.people.filter((p) => p.craft === "ISS");

   // After
   const people = basicData?.people ?? [];
   const issCrew = people.filter((p) => p.craft === "ISS");
   ```

2. **In `src/lib/copilot/agent.ts`**
   - Add try-catch around agent invocation
   - Return meaningful error when binding is missing

### Step 4: Test in Production-like Environment

1. **Use Wrangler local preview**
   ```bash
   npx wrangler dev --remote
   ```

2. **Deploy to staging (if available)**

## Success Criteria

The task is complete when:

1. [ ] Root cause of the error is identified and documented
2. [ ] The copilot feature works in production Cloudflare deployment
3. [ ] Users can ask questions and receive AI-generated responses
4. [ ] Error messages are user-friendly (caught by error boundary)
5. [ ] No console errors related to undefined `.filter()` calls
6. [ ] React Error #418 is resolved (no hydration mismatches)
7. [ ] Existing tests still pass
8. [ ] New functionality verified via browser at https://ephemeris.observer/iss/copilot

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| API defensive checks | `src/lib/iss/api.test.ts` | fetchCrewData handles undefined `people` array |
| Agent error handling | `src/lib/copilot/agent.test.ts` | chatCompletion handles missing bindings |
| Knowledge search | `src/lib/copilot/knowledge.test.ts` | searchKnowledgeBase handles empty queries |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Chat flow | Frontend ↔ Agent DO | Message sent, response received |
| Tool execution | Agent ↔ ISS APIs | Tools execute without undefined errors |
| Error propagation | All | Errors surface to UI correctly |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Basic Chat | 1. Navigate to /iss/copilot 2. Enter question 3. Click send | AI response appears in chat |
| Error Handling | 1. Simulate API failure 2. Observe UI | Error boundary shows, retry option works |
| Suggested Prompts | 1. Load page 2. Click suggested prompt | Prompt is sent, response received |

### Browser Verification (Frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Copilot Page | `http://localhost:3000/iss/copilot` | Page loads without errors |
| Chat Interface | `http://localhost:3000/iss/copilot` | Input works, messages display |
| Error Boundary | `http://localhost:3000/iss/copilot` | Errors caught and displayed |
| Production | `https://ephemeris.observer/iss/copilot` | Feature works in deployed environment |

### Cloudflare Verification
| Check | Command/Action | Expected |
|-------|---------------|----------|
| DO exists | Check Cloudflare Dashboard | CopilotAgent listed in Durable Objects |
| AI binding | Check wrangler.jsonc | `ai.binding: "AI"` present |
| Worker logs | View Cloudflare Analytics | No binding errors in logs |
| Migrations | Check wrangler.jsonc | v1 migration with CopilotAgent class |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete - local
- [ ] Browser verification complete - production
- [ ] Cloudflare configuration verified
- [ ] No regressions in existing functionality
- [ ] Code follows established patterns
- [ ] No security vulnerabilities introduced
- [ ] Error tracking (Sentry) receiving errors correctly

## Error Analysis Summary

### Primary Error: "Cannot read properties of undefined (reading 'filter')"

**Most Likely Sources:**
1. `src/lib/iss/api.ts:189` - `basicData.people.filter()` where `basicData.people` is undefined
2. `src/lib/copilot/knowledge.ts:54` - `KNOWLEDGE_BASE.map().filter()` if import fails
3. `src/lib/copilot/prompts.ts:113` - `SUGGESTED_PROMPTS.filter()` if import fails
4. `src/lib/copilot/store.ts:69` - `messages.filter()` if messages undefined

### Secondary Error: `ERR_BLOCKED_BY_CLIENT`

**Likely Causes:**
- Browser ad blocker blocking requests with "copilot" or "AI" in the URL
- Content Security Policy blocking the request
- Cloudflare security rules blocking the request

**Mitigation:**
- Rename API endpoints to avoid ad blocker patterns
- Configure proper CORS/CSP headers
- Test with ad blocker disabled to confirm

### React Error #418

**Meaning:** Hydration mismatch - server rendered different HTML than client expected

**Likely Cause:**
- Error occurring during server render causing different output
- Cascade effect from the primary undefined filter error

**Fix:** Resolve the primary error, hydration should resolve automatically
