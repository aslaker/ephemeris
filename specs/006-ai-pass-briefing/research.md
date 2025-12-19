# Research: AI Pass Briefing

**Feature Branch**: `006-ai-pass-briefing`  
**Date**: 2024-12-17  
**Status**: Complete

## Research Summary

This document resolves all technical unknowns identified during planning for the AI Pass Briefing feature.

---

## 1. LLM Provider Selection

### Decision: Cloudflare Workers AI

**Rationale**: The project already deploys to Cloudflare Workers (`wrangler deploy`). Using Cloudflare Workers AI provides:
- Zero network latency to AI inference (runs in same data center)
- Unified billing and quota management
- No additional API keys to manage
- Built-in rate limiting and security

### Recommended Model

**Primary**: `@cf/meta/llama-3.1-8b-instruct` (or latest Llama variant)
- Strong instruction-following for structured briefing output
- Good performance for conversational text generation
- Available in Workers AI catalog

**Fallback**: `@cf/qwen/qwen1.5-7b-chat-awq`
- Lighter model for degraded performance scenarios
- AWQ quantization for faster inference

### Implementation Pattern

```typescript
// Server function with Sentry instrumentation
import * as Sentry from '@sentry/tanstackstart-react';
import { createServerFn } from '@tanstack/start';

export const generateBriefing = createServerFn({ method: 'POST' })
  .validator((data: { passId: string; passData: PassPrediction }) => data)
  .handler(async ({ data }) => {
    return Sentry.startSpan({ name: 'Generate AI Briefing' }, async () => {
      const ai = getAIBinding(); // From Cloudflare env
      const prompt = buildBriefingPrompt(data.passData);
      
      const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
      });
      
      return parseBriefingResponse(response);
    });
  });
```

### Alternatives Considered

| Provider | Pros | Cons | Rejected Because |
|----------|------|------|------------------|
| OpenAI | Best quality | External API, latency, costs | Adds complexity for personal project |
| Anthropic Claude | Excellent quality | External API, costs | Same as OpenAI |
| Self-hosted | Full control | Operational overhead | Overkill for project scope |

---

## 2. Weather API Selection

### Decision: Open-Meteo API

**Rationale**: 
- Completely free for personal use (no API key required)
- Provides cloud cover percentage and visibility data
- Hourly forecasts up to 16 days
- Global coverage for any lat/lng coordinate
- No rate limiting for reasonable use

### API Endpoint

```
GET https://api.open-meteo.com/v1/forecast
  ?latitude={lat}
  &longitude={lng}
  &hourly=cloud_cover,visibility
  &forecast_days=7
```

### Response Shape

```typescript
interface OpenMeteoResponse {
  hourly: {
    time: string[];           // ISO timestamps
    cloud_cover: number[];    // 0-100%
    visibility: number[];     // meters
  };
}
```

### Implementation Pattern

```typescript
async function getWeatherForPass(
  location: LatLng,
  passTime: Date
): Promise<WeatherConditions | null> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(location.lat));
  url.searchParams.set('longitude', String(location.lng));
  url.searchParams.set('hourly', 'cloud_cover,visibility');
  url.searchParams.set('forecast_days', '7');
  
  const response = await fetch(url);
  if (!response.ok) return null;
  
  const data = await response.json();
  // Find closest hourly data to passTime
  return findClosestWeather(data.hourly, passTime);
}
```

### Alternatives Considered

| Provider | Pros | Cons | Rejected Because |
|----------|------|------|------------------|
| OpenWeatherMap | Popular, well-documented | Requires API key, free tier limits | Unnecessary complexity |
| Weather.gov | Free, no API key | US only | Need global coverage |
| Visual Crossing | Good free tier | 1000 daily records limit | Limit too restrictive |

---

## 3. Location Persistence Pattern

### Decision: TanStack Store with localStorage Sync (No Context)

**Rationale**:
- Constitution requires TanStack Store for complex client state (Section II)
- Location is shared across multiple pages (map, globe, passes, briefing)
- Persistence enables "remember my location" across sessions
- **Eliminates LocationContext entirely** - cleaner separation of concerns

### Architecture: Store + Hooks (No Context)

The current `LocationContext` in ISSLayout mixes concerns. We split into:

| Concern | Solution | Why |
|---------|----------|-----|
| Location coordinates | TanStack Store | Shared persistent state |
| Next pass prediction | `useNextPass()` hook | Derived from location + TLE |
| Geolocation request | `useLocation()` hook | Transient UI state (loading, error) |
| isPredicting state | `useNextPass()` hook | Transient, not shared |
| error state | `useLocation()` hook | Transient, not shared |

### Implementation: Location Store

```typescript
// src/lib/location/store.ts
import { Store } from '@tanstack/store';

interface LocationState {
  coordinates: { lat: number; lng: number } | null;
  displayName: string | null;
  source: 'geolocation' | 'manual' | 'search' | null;
  lastUpdated: number | null;
}

const STORAGE_KEY = 'ephemeris-user-location';

function loadFromStorage(): LocationState {
  if (typeof window === 'undefined') {
    return { coordinates: null, displayName: null, source: null, lastUpdated: null };
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored 
      ? JSON.parse(stored) 
      : { coordinates: null, displayName: null, source: null, lastUpdated: null };
  } catch {
    return { coordinates: null, displayName: null, source: null, lastUpdated: null };
  }
}

export const locationStore = new Store<LocationState>(loadFromStorage());

// Auto-sync to localStorage
if (typeof window !== 'undefined') {
  locationStore.subscribe(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locationStore.state));
  });
}

// Actions (pure functions, no UI state)
export const locationActions = {
  setFromGeolocation(lat: number, lng: number) {
    locationStore.setState((prev) => ({
      ...prev,
      coordinates: { lat, lng },
      source: 'geolocation',
      lastUpdated: Date.now(),
    }));
  },

  setManual(lat: number, lng: number, displayName?: string) {
    locationStore.setState((prev) => ({
      ...prev,
      coordinates: { lat, lng },
      displayName: displayName ?? null,
      source: 'manual',
      lastUpdated: Date.now(),
    }));
  },

  clear() {
    locationStore.setState({
      coordinates: null,
      displayName: null,
      source: null,
      lastUpdated: null,
    });
  },
};
```

### Implementation: useLocation Hook

```typescript
// src/hooks/useLocation.ts
import { useStore } from '@tanstack/react-store';
import { useState, useCallback } from 'react';
import { locationStore, locationActions } from '@/lib/location/store';

function mapGeolocationError(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const geoError = err as GeolocationPositionError;
    if (geoError.code === 1) return 'PERMISSION_DENIED';
    if (geoError.code === 2) return 'POSITION_UNAVAILABLE';
    if (geoError.code === 3) return 'TIMEOUT';
  }
  return 'SIGNAL_INTERFERENCE';
}

export function useLocation() {
  const coordinates = useStore(locationStore, (s) => s.coordinates);
  const displayName = useStore(locationStore, (s) => s.displayName);
  const source = useStore(locationStore, (s) => s.source);
  
  // Transient UI state - NOT in store
  const [error, setError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const requestGeolocation = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('GEOLOCATION_MODULE_MISSING');
      return;
    }

    setError(null);
    setIsRequesting(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
        });
      });
      
      locationActions.setFromGeolocation(
        position.coords.latitude,
        position.coords.longitude
      );
    } catch (err) {
      setError(mapGeolocationError(err));
    } finally {
      setIsRequesting(false);
    }
  }, []);

  return {
    coordinates,
    displayName,
    source,
    hasLocation: coordinates !== null,
    error,
    isRequesting,
    requestGeolocation,
    setManual: locationActions.setManual,
    clear: locationActions.clear,
  };
}
```

### Implementation: useNextPass Hook

```typescript
// src/hooks/useNextPass.ts
import { useStore } from '@tanstack/react-store';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { locationStore } from '@/lib/location/store';
import { issQueries } from '@/lib/iss/queries';
import { predictNextPass } from '@/lib/iss/orbital';
import type { PassPrediction } from '@/lib/iss/types';

export function useNextPass() {
  const coordinates = useStore(locationStore, (s) => s.coordinates);
  const { data: tle } = useQuery(issQueries.tle());
  
  const [nextPass, setNextPass] = useState<PassPrediction | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  useEffect(() => {
    if (!coordinates || !tle || tle.length !== 2) {
      setNextPass(null);
      return;
    }

    setIsPredicting(true);
    const timeoutId = setTimeout(() => {
      try {
        const pass = predictNextPass(tle[0], tle[1], coordinates);
        setNextPass(pass);
      } catch (e) {
        console.error('Prediction failed:', e);
        setNextPass(null);
      } finally {
        setIsPredicting(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [coordinates, tle]);

  return { nextPass, isPredicting, hasLocation: coordinates !== null };
}
```

### Migration: Remove LocationContext

**Before** (ISSLayout.tsx):
```typescript
// ❌ Remove: Context provider, useState for location, useEffect for prediction
<LocationContext.Provider value={locationContextValue}>
  {children}
</LocationContext.Provider>
```

**After** (ISSLayout.tsx):
```typescript
// ✅ Clean layout component - no location state management
export const ISSLayout = ({ children }: ISSLayoutProps) => {
  const [isMuted, setIsMuted] = useState(terminalAudio.isMuted);
  // ... only layout concerns
  
  return (
    <div className="iss-theme ...">
      <ScanlineOverlay visible />
      <header>...</header>
      <main>{children}</main>
      <footer>...</footer>
    </div>
  );
};
```

**Components use hooks directly**:
```typescript
// FlyoverControl.tsx
export const FlyoverControl = () => {
  const { coordinates, requestGeolocation, error, isRequesting } = useLocation();
  const { nextPass, isPredicting } = useNextPass();
  
  // ... component logic
};
```

### Benefits of This Approach

| Aspect | Context Approach | Store + Hooks Approach |
|--------|------------------|------------------------|
| Scope | Limited to provider tree | Available anywhere |
| Persistence | Must add manually | Built into store |
| Re-renders | Whole tree on change | Granular subscriptions |
| Testing | Need provider wrapper | Just import hooks |
| Separation | Mixed concerns | Clean split |
| Types to maintain | LocationContextType | Just hook return types |

---

## 4. Multiple Pass Prediction

### Decision: Extend Existing orbital.ts

**Rationale**: The existing `predictNextPass` function already implements the core algorithm. We need a wrapper that continues searching after finding each pass.

### Implementation Pattern

```typescript
// src/lib/iss/orbital.ts (extension)

export interface PredictPassesOptions {
  maxPasses?: number;      // Default: 10
  maxDays?: number;        // Default: 7
  minElevation?: number;   // Default: 10°
}

export function predictPasses(
  line1: string,
  line2: string,
  userLoc: LatLng,
  options: PredictPassesOptions = {}
): PassPrediction[] {
  const {
    maxPasses = 10,
    maxDays = 7,
    minElevation = 10,
  } = options;
  
  const passes: PassPrediction[] = [];
  const maxHorizon = maxDays * 24 * 60 * 60 * 1000;
  let searchStart = new Date();
  
  while (passes.length < maxPasses) {
    const pass = predictNextPassFrom(line1, line2, userLoc, searchStart, minElevation);
    
    if (!pass) break;
    if (pass.startTime.getTime() - Date.now() > maxHorizon) break;
    
    passes.push(pass);
    // Start next search after this pass ends
    searchStart = new Date(pass.endTime.getTime() + 60000); // +1 minute
  }
  
  return passes;
}

// Internal helper - predictNextPass starting from specific time
function predictNextPassFrom(
  line1: string,
  line2: string,
  userLoc: LatLng,
  startTime: Date,
  minElevation: number
): PassPrediction | null {
  // Same logic as existing predictNextPass but with configurable start
  // and minimum elevation threshold
}
```

### Performance Considerations

- Use Web Workers for computation-heavy prediction (optional optimization)
- Cache results in TanStack Query with 5-minute staleTime
- Compute passes lazily (first 3 immediately, rest on scroll/expand)

---

## 5. Accessibility Patterns

### Decision: Native HTML + ARIA + Keyboard Event Handlers

**Rationale**: 
- Constitution requires WCAG 2.1 AA (FR-009)
- Shadcn/Radix primitives already provide accessibility foundations
- Add explicit keyboard navigation for custom components

### Key Patterns

#### 1. Semantic HTML Structure

```tsx
// Passes list with proper heading structure
<section aria-labelledby="passes-heading">
  <h2 id="passes-heading">Upcoming ISS Passes</h2>
  <ul role="list" aria-label="List of upcoming ISS passes">
    {passes.map((pass) => (
      <li key={pass.id}>
        <PassCard pass={pass} />
      </li>
    ))}
  </ul>
</section>
```

#### 2. Focus Management

```tsx
// BriefingCard with focus trap when expanded
function BriefingCard({ briefing, onClose }: BriefingCardProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  
  // Focus close button when briefing opens
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);
  
  // Handle Escape to close
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };
  
  return (
    <article
      role="article"
      aria-label={`AI briefing for ${briefing.passTime}`}
      onKeyDown={handleKeyDown}
    >
      {/* content */}
      <button ref={closeButtonRef} onClick={onClose}>
        Close Briefing
      </button>
    </article>
  );
}
```

#### 3. Live Regions for Dynamic Content

```tsx
// Announce briefing generation status
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {isGenerating && 'Generating AI briefing...'}
  {briefing && 'Briefing ready.'}
  {error && `Error: ${error}`}
</div>
```

#### 4. Color Contrast

- Matrix theme colors need AA contrast verification
- Add high-contrast mode option or ensure base colors meet 4.5:1 ratio
- Use Biome/ESLint a11y rules for automated checking

#### 5. Reduced Motion

```tsx
// Respect user's motion preferences
const prefersReducedMotion = 
  typeof window !== 'undefined' && 
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

<div className={prefersReducedMotion ? '' : 'animate-pulse'}>
  {/* animated content */}
</div>
```

### Testing Approach

1. **Automated**: axe-core via @axe-core/react in development
2. **Manual**: VoiceOver (macOS), NVDA (Windows) testing
3. **Keyboard**: Tab navigation audit for all interactive elements

---

## 6. Briefing Cache Strategy

### Decision: TanStack DB with Query-DB-Collection

**Rationale**:
- FR-015 requires local caching of briefings
- FR-016 requires manual refresh capability
- TanStack DB provides reactive queries and automatic Query integration
- Aligns with TanStack-first architecture preference
- `@tanstack/query-db-collection` is purpose-built for server-generated, locally-cached data

### Why TanStack DB Over Extending Dexie

| Factor | Dexie Extension | TanStack DB |
|--------|-----------------|-------------|
| Query Integration | Manual sync code | Automatic via query-db-collection |
| Reactive Updates | Requires liveQuery wrapper | Built-in |
| Optimistic Updates | Manual implementation | Built-in with rollback |
| Type Safety | Good with TypeScript | Excellent with Zod schemas |
| Future Positioning | Separate from Query | Unified with TanStack ecosystem |

### Implementation Pattern

```typescript
// src/lib/briefing/collection.ts
import { createCollection } from '@tanstack/react-db';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import { queryClient } from '@/integrations/tanstack-query/root-provider';
import { PassBriefingSchema, type PassBriefing } from './types';

export const briefingsCollection = createCollection<PassBriefing>(
  queryCollectionOptions({
    getId: (briefing) => briefing.id,
    queryKey: (passId: string) => ['briefing', passId],
    queryFn: async ({ passId, passData, location }) => {
      // Server function generates the briefing
      return generateBriefing({ passId, passData, location });
    },
    queryClient,
    // Optional: persist to IndexedDB via Dexie adapter
    // persistence: dexiePersistence({ tableName: 'briefings' }),
  })
);
```

### React Usage Pattern

```typescript
// Component with reactive briefing data
import { useLiveQuery } from '@tanstack/react-db';
import { briefingsCollection } from '@/lib/briefing/collection';

function BriefingCard({ passId }: { passId: string }) {
  // Reactive - automatically updates when briefing is fetched or refreshed
  const briefing = useLiveQuery(() => 
    briefingsCollection.query.where('id', '==', passId).first()
  );

  const handleRefresh = () => {
    // Invalidate triggers re-fetch from server function
    briefingsCollection.invalidate(passId);
  };

  if (!briefing) return <GenerateBriefingButton passId={passId} />;
  
  return (
    <article>
      <p>{briefing.narrative}</p>
      <button onClick={handleRefresh}>Refresh Briefing</button>
    </article>
  );
}
```

### Persistence Strategy

For client-side persistence (surviving page refreshes), two options:

**Option A: Built-in TanStack Query persistence**
```typescript
// Already have query-persist-client configured
// Briefings cached via Query's persistence layer
```

**Option B: Dexie adapter for long-term storage**
```typescript
import { dexieCollectionOptions } from 'tanstack-dexie-db-collection';

// Use community adapter for IndexedDB persistence
const briefingsCollection = createCollection(
  dexieCollectionOptions({
    id: 'briefings',
    schema: PassBriefingSchema,
    getKey: (item) => item.id,
    dbName: 'ephemeris-iss', // Same DB as existing tables
  })
);
```

**Recommendation**: Start with Option A (Query persistence). If longer retention is needed, add Dexie adapter later.

---

## 7. Future Positioning: Unified TanStack DB Layer

### Context

The feature roadmap (`docs/feature_roadmap.md`) includes several features that would benefit from a unified reactive data layer:

- **Observation Copilot** - Agent querying passes, positions, weather
- **Daily Mission Log** - Aggregating telemetry data
- **Smart Alert Suggestions** - Rule engine with pass predictions
- **Mission Planner Agent** - Combining passes, launches, satellites

### Decision: Gradual Migration Path

**Phase 1 (This Feature)**: Introduce TanStack DB for new data (briefings)
- Use `@tanstack/query-db-collection` for briefings
- Keep existing Dexie for telemetry (positions, crew, tle, events)
- Proves the pattern with low risk

**Phase 2 (Future)**: Consider `tanstack-dexie-db-collection` for telemetry
- Community adapter wraps existing Dexie tables in TanStack DB collections
- Enables reactive queries on telemetry data
- Unified query interface for agent tools

### Benefits of Unified Layer (Future)

| Benefit | Impact on Roadmap Features |
|---------|---------------------------|
| Unified query interface | Agents can query any data the same way |
| Reactive cross-collection queries | Mission Planner can combine passes + weather + events |
| Consistent optimistic updates | Smart Alerts can show pending rules immediately |
| Single abstraction for tools | Observation Copilot tools become simpler |

### Migration Considerations

The `tanstack-dexie-db-collection` adapter:
- Works with existing Dexie databases
- Adds metadata fields for sync tracking
- Supports partial updates and batch sync
- Can be adopted incrementally per table

**Recommendation**: Evaluate after this feature ships. If agent features are prioritized, the unified layer becomes more valuable.

---

## 8. Agent Framework Research (Future Reference)

### Context

Features #2 (Observation Copilot), #9 (Mission Planner Agent), and #10 (Space Ops Digest) in the roadmap require an agent framework for tool-calling, conversation state, and multi-step reasoning. This section documents research for when those features are prioritized.

### Recommendation: TanStack AI

**Status**: Alpha (December 2025)  
**Package**: `@tanstack/ai`  
**GitHub**: [github.com/TanStack/ai](https://github.com/TanStack/ai)

**Why TanStack AI for Ephemeris**:

| Factor | Assessment |
|--------|------------|
| Ecosystem alignment | Same patterns as Query, Router, Store, DB |
| Type safety | Zod schemas throughout, isomorphic tool definitions |
| Provider flexibility | Cloudflare AI, OpenAI, Anthropic, Gemini, Ollama |
| No vendor lock-in | Switch providers at runtime |
| Active development | Tanner Linsley and TanStack team |

### Key Features

```typescript
// Type-safe tool definitions with Zod
import { defineTool } from '@tanstack/ai';

const passTool = defineTool({
  name: 'getNextPass',
  description: 'Get the next visible ISS pass for a location',
  schema: z.object({
    location: LatLngSchema,
    minElevation: z.number().optional(),
  }),
  execute: async ({ location, minElevation }) => {
    const [line1, line2] = await getTLE();
    return predictNextPass(line1, line2, location);
  },
});

// React hook for chat interface
const { messages, sendMessage, isLoading } = useChat({
  tools: [passTool, weatherTool, briefingTool],
  provider: cloudflareProvider,
  onToolCall: (tool, args) => {
    // Log for observability
    console.log(`Tool called: ${tool.name}`, args);
  },
});
```

### Integration with TanStack DB

When using unified TanStack DB collections, agent tools become simple queries:

```typescript
const positionsTool = defineTool({
  name: 'getRecentPositions',
  schema: z.object({ hours: z.number().default(1) }),
  execute: async ({ hours }) => {
    // Query TanStack DB collection directly
    return positionsCollection.query
      .where('timestamp', '>', Date.now() - hours * 3600000)
      .toArray();
  },
});

const briefingTool = defineTool({
  name: 'getBriefing',
  schema: z.object({ passId: z.string() }),
  execute: async ({ passId }) => {
    return briefingsCollection.query
      .where('id', '==', passId)
      .first();
  },
});
```

### Alternatives Evaluated

| Framework | Pros | Cons | Verdict |
|-----------|------|------|---------|
| **TanStack AI** | Ecosystem alignment, type-safe, provider-agnostic | Alpha stage | ✅ Recommended |
| **Mastra** | Mature, workflows, RAG, observability | Another framework, heavier | Consider for complex workflows |
| **AWS Strands** | Enterprise-grade, AWS integration | Ties to AWS (we're on Cloudflare) | ❌ Not a fit |

### When to Introduce

| Feature | Timing | Reason |
|---------|--------|--------|
| #1 AI Pass Briefing | Now | Simple server function, no agent needed |
| #2 Observation Copilot | TanStack AI | Tool-calling agent for natural language queries |
| #9 Mission Planner | TanStack AI + evaluate Mastra | Multi-step planning may need workflows |

### Dependencies to Add (When Ready)

```bash
bun add @tanstack/ai @tanstack/react-ai
```

### Observability Integration

TanStack AI supports hooks for logging and tracing that integrate with existing Sentry setup:

```typescript
import * as Sentry from '@sentry/tanstackstart-react';

const chat = useChat({
  tools: [...],
  onToolCall: (tool, args) => {
    Sentry.startSpan({ name: `Agent Tool: ${tool.name}` }, () => {
      // Tool execution is traced
    });
  },
  onError: (error) => {
    Sentry.captureException(error);
  },
});
```

---

## Summary of Decisions

| Unknown | Decision | Key Rationale |
|---------|----------|---------------|
| LLM Provider | Cloudflare Workers AI | Zero latency, unified platform |
| Weather API | Open-Meteo | Free, no key, global coverage |
| Location Persistence | TanStack Store + localStorage | Constitution compliance, app-wide sharing |
| Multiple Passes | Extend orbital.ts | Build on proven algorithm |
| Accessibility | Native HTML + ARIA + keyboard | WCAG AA with existing tools |
| Briefing Cache | TanStack DB + query-db-collection | Reactive queries, TanStack ecosystem alignment |
| Future Data Layer | Gradual migration via Dexie adapter | Position for agent features |
| Agent Framework | TanStack AI (when needed) | Ecosystem alignment, type-safe, provider-agnostic |
