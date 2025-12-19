# Quickstart: AI Pass Briefing

**Feature Branch**: `006-ai-pass-briefing`  
**Date**: 2024-12-17

## Overview

This guide provides step-by-step instructions to implement the AI Pass Briefing feature, including setting up dependencies, configuring Cloudflare Workers AI, and implementing core components.

---

## Prerequisites

- Node.js 18+ / Bun runtime
- Cloudflare account with Workers AI enabled
- Existing Ephemeris project setup (`bun install` completed)

---

## Step 1: Enable Cloudflare Workers AI

### 1.1 Update wrangler.jsonc

Add AI binding to your Cloudflare Workers configuration:

```jsonc
{
  // ... existing config ...
  "ai": {
    "binding": "AI"
  }
}
```

### 1.2 Update worker-configuration.d.ts

Add AI binding type:

```typescript
interface Env {
  // ... existing bindings ...
  AI: Ai;
}
```

### 1.3 Verify AI Access

Test locally with:

```bash
wrangler dev
```

In the console, verify AI binding is available.

---

## Step 2: Set Up TanStack DB for Briefings

### 2.1 Verify TanStack DB Packages

The packages are already installed but verify they're available:

```bash
bun list | grep tanstack
# Should show @tanstack/react-db and @tanstack/query-db-collection
```

### 2.2 Create Briefings Collection

Create `src/lib/briefing/collection.ts`:

```typescript
import { createCollection } from '@tanstack/react-db';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import { queryClient } from '@/integrations/tanstack-query/root-provider';
import type { PassBriefing, PassPrediction, LatLng } from './types';
import { generateBriefing } from './ai-client';

interface BriefingQueryParams {
  passId: string;
  passData: PassPrediction;
  location: LatLng;
}

export const briefingsCollection = createCollection<PassBriefing>(
  queryCollectionOptions({
    getId: (briefing) => briefing.id,
    queryClient,
    queryKey: ({ passId }: BriefingQueryParams) => ['briefing', passId],
    queryFn: async (params: BriefingQueryParams) => {
      const result = await generateBriefing(params);
      if (result.status === 'error') {
        throw new Error(result.error);
      }
      return result.briefing;
    },
  })
);

// Helper to get a briefing (triggers fetch if not cached)
export function useBriefing(passId: string) {
  return useLiveQuery(() => 
    briefingsCollection.query.where('id', '==', passId).first()
  );
}

// Helper to invalidate and refresh a briefing
export function refreshBriefing(passId: string) {
  briefingsCollection.invalidate(passId);
}
```

### 2.3 Add TypeScript Interfaces

Copy interfaces from `specs/006-ai-pass-briefing/contracts/api-interfaces.ts` to `src/lib/briefing/types.ts`.

### 2.4 No Dexie Changes Required

The existing Dexie schema for ISS telemetry data (positions, crew, tle, events) remains unchanged. Briefings use TanStack DB's query-collection pattern instead.

---

## Step 3: Location Store + Hooks Setup

This feature eliminates the existing `LocationContext` in favor of TanStack Store + focused hooks.

### 3.1 Create Location Store

Create `src/lib/location/store.ts`:

```typescript
import { Store } from "@tanstack/store";

interface LocationState {
  coordinates: { lat: number; lng: number } | null;
  displayName: string | null;
  source: "geolocation" | "manual" | "search" | null;
  lastUpdated: number | null;
}

const STORAGE_KEY = "ephemeris-user-location";

function loadFromStorage(): LocationState {
  if (typeof window === "undefined") {
    return { coordinates: null, displayName: null, source: null, lastUpdated: null };
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { coordinates: null, displayName: null, source: null, lastUpdated: null };
  } catch {
    return { coordinates: null, displayName: null, source: null, lastUpdated: null };
  }
}

export const locationStore = new Store<LocationState>(loadFromStorage());

// Auto-sync to localStorage
if (typeof window !== "undefined") {
  locationStore.subscribe(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locationStore.state));
  });
}

// Actions (pure functions - no UI state like loading/error)
export const locationActions = {
  setFromGeolocation(lat: number, lng: number) {
    locationStore.setState((prev) => ({
      ...prev,
      coordinates: { lat, lng },
      source: "geolocation",
      lastUpdated: Date.now(),
    }));
  },

  setManual(lat: number, lng: number, displayName?: string) {
    locationStore.setState((prev) => ({
      ...prev,
      coordinates: { lat, lng },
      displayName: displayName ?? null,
      source: "manual",
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

### 3.2 Create useLocation Hook

Create `src/hooks/useLocation.ts`:

```typescript
import { useStore } from "@tanstack/react-store";
import { useState, useCallback } from "react";
import { locationStore, locationActions } from "@/lib/location/store";

function mapGeolocationError(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const geoError = err as GeolocationPositionError;
    if (geoError.code === 1) return "PERMISSION_DENIED";
    if (geoError.code === 2) return "POSITION_UNAVAILABLE";
    if (geoError.code === 3) return "TIMEOUT";
  }
  return "SIGNAL_INTERFERENCE";
}

export function useLocation() {
  const coordinates = useStore(locationStore, (s) => s.coordinates);
  const displayName = useStore(locationStore, (s) => s.displayName);
  const source = useStore(locationStore, (s) => s.source);

  // Transient UI state - kept in hook, not store
  const [error, setError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const requestGeolocation = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("GEOLOCATION_MODULE_MISSING");
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

### 3.3 Create useNextPass Hook

Create `src/hooks/useNextPass.ts`:

```typescript
import { useStore } from "@tanstack/react-store";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { locationStore } from "@/lib/location/store";
import { issQueries } from "@/lib/iss/queries";
import { predictNextPass } from "@/lib/iss/orbital";
import type { PassPrediction } from "@/lib/iss/types";

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
        console.error("Prediction failed:", e);
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

### 3.4 Remove LocationContext from ISSLayout

Update `src/routes/iss/-components/ISSLayout.tsx`:

```typescript
// REMOVE these imports and code:
// - createContext, useContext for LocationContext
// - useState for userLocation, nextPass, isPredicting, error
// - useEffect for pass prediction
// - requestLocation and manualLocation functions
// - LocationContext.Provider wrapper

// KEEP only layout concerns:
export const ISSLayout = ({ children }: ISSLayoutProps) => {
  const location = useLocation(); // TanStack Router, not our hook
  const [isMuted, setIsMuted] = useState(terminalAudio.isMuted);
  const [hasError, setHasError] = useState(false);

  // ... toggle mute, error boundary UI ...

  return (
    <div className="iss-theme h-screen overflow-hidden ...">
      <ScanlineOverlay visible />
      <header>...</header>
      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
      <footer>...</footer>
    </div>
  );
};
```

### 3.5 Update FlyoverControl

Update `src/routes/iss/-components/FlyoverControl.tsx`:

```typescript
// BEFORE:
import { useLocationContext } from "./ISSLayout";
const { userLocation, nextPass, isPredicting, requestLocation, error } = useLocationContext();

// AFTER:
import { useLocation } from "@/hooks/useLocation";
import { useNextPass } from "@/hooks/useNextPass";

export const FlyoverControl = () => {
  const { coordinates, requestGeolocation, error, isRequesting } = useLocation();
  const { nextPass, isPredicting } = useNextPass();
  const [timeLeft, setTimeLeft] = useState<string>("--:--:--");

  // ... rest of component (update userLocation -> coordinates, requestLocation -> requestGeolocation)
};
```

---

## Step 4: Extend Pass Predictions

### 4.1 Add predictPasses Function

In `src/lib/iss/orbital.ts`, add:

```typescript
export interface PredictPassesOptions {
  maxPasses?: number;
  maxDays?: number;
  minElevation?: number;
}

export function predictPasses(
  line1: string,
  line2: string,
  userLoc: LatLng,
  options: PredictPassesOptions = {}
): PassPrediction[] {
  const { maxPasses = 10, maxDays = 7, minElevation = 10 } = options;

  const passes: PassPrediction[] = [];
  const maxHorizon = maxDays * 24 * 60 * 60 * 1000;
  let searchStart = new Date();

  while (passes.length < maxPasses) {
    const pass = predictNextPassFrom(line1, line2, userLoc, searchStart, minElevation);

    if (!pass) break;
    if (pass.startTime.getTime() - Date.now() > maxHorizon) break;

    passes.push(pass);
    searchStart = new Date(pass.endTime.getTime() + 60000);
  }

  return passes;
}
```

---

## Step 5: Weather Integration

### 5.1 Create Weather Client

Create `src/lib/briefing/weather.ts`:

```typescript
import type { LatLng, WeatherConditions } from "@/lib/iss/types";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

export async function getWeatherForPass(
  location: LatLng,
  passTime: Date
): Promise<WeatherConditions | null> {
  try {
    const url = new URL(OPEN_METEO_URL);
    url.searchParams.set("latitude", String(location.lat));
    url.searchParams.set("longitude", String(location.lng));
    url.searchParams.set("hourly", "cloud_cover,visibility");
    url.searchParams.set("forecast_days", "7");

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    return findClosestWeather(data.hourly, passTime);
  } catch {
    return null;
  }
}

function findClosestWeather(
  hourly: { time: string[]; cloud_cover: number[]; visibility: number[] },
  passTime: Date
): WeatherConditions {
  const targetTime = passTime.getTime();
  let closestIndex = 0;
  let closestDiff = Infinity;

  for (let i = 0; i < hourly.time.length; i++) {
    const diff = Math.abs(new Date(hourly.time[i]).getTime() - targetTime);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIndex = i;
    }
  }

  const cloudCover = hourly.cloud_cover[closestIndex];
  const visibility = hourly.visibility[closestIndex];

  return {
    timestamp: new Date(hourly.time[closestIndex]),
    cloudCover,
    visibility,
    isFavorable: cloudCover < 50 && visibility > 10000,
  };
}
```

---

## Step 6: AI Briefing Server Function

### 6.1 Create Briefing Generator

Create `src/lib/briefing/ai-client.ts`:

```typescript
import * as Sentry from "@sentry/tanstackstart-react";
import { createServerFn } from "@tanstack/start";
import type { PassPrediction, PassBriefing, LatLng } from "@/lib/iss/types";
import { getWeatherForPass } from "./weather";
import { buildBriefingPrompt, SYSTEM_PROMPT, parseAIResponse } from "./prompt";

export const generateBriefing = createServerFn({ method: "POST" })
  .validator((data: { passData: PassPrediction; location: LatLng }) => data)
  .handler(async ({ data, context }) => {
    return Sentry.startSpan({ name: "Generate AI Briefing" }, async () => {
      const { passData, location } = data;

      // Fetch weather (optional enhancement)
      const weather = await getWeatherForPass(location, passData.startTime);

      // Get AI binding from Cloudflare context
      const ai = (context.cloudflare?.env as { AI?: Ai })?.AI;
      
      if (!ai) {
        // Fallback: Return structured data without AI narrative
        return createFallbackBriefing(passData, weather);
      }

      const prompt = buildBriefingPrompt(passData, location, weather);

      try {
        const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          max_tokens: 500,
        });

        return parseAIResponse(response, passData, weather);
      } catch (error) {
        Sentry.captureException(error);
        return createFallbackBriefing(passData, weather);
      }
    });
  });
```

### 6.2 Create Prompt Templates

Create `src/lib/briefing/prompt.ts`:

```typescript
import type { PassPrediction, LatLng, WeatherConditions } from "@/lib/iss/types";

export const SYSTEM_PROMPT = `You are an astronomy assistant helping people observe the International Space Station (ISS). Generate clear, friendly briefings for ISS passes that explain when and how to see the station. Use simple language suitable for beginners. Keep responses concise but informative.`;

export function buildBriefingPrompt(
  pass: PassPrediction,
  location: LatLng,
  weather: WeatherConditions | null
): string {
  const startTime = pass.startTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const date = pass.startTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  let prompt = `Generate a viewing briefing for an ISS pass:
- Date: ${date}
- Start time: ${startTime}
- Duration: ${Math.round(pass.duration)} minutes
- Maximum elevation: ${Math.round(pass.maxElevation)}°
- Quality: ${pass.quality}`;

  if (weather) {
    prompt += `
- Cloud cover: ${weather.cloudCover}%
- Visibility: ${Math.round(weather.visibility / 1000)} km
- Weather favorable: ${weather.isFavorable ? "Yes" : "No"}`;
  }

  prompt += `

Include:
1. A one-sentence summary
2. When to start looking and in which direction
3. How bright it will appear
4. 2-3 viewing tips

Format as JSON with keys: summary, narrative, tips[]`;

  return prompt;
}
```

---

## Step 7: Create Passes Route

### 7.1 Create Route File

Create `src/routes/iss/passes.tsx`:

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ISSLayout } from "./-components/ISSLayout";
import { PassesList } from "./-components/PassesList";
import { LocationSelector } from "./-components/LocationSelector";
import { useLocation } from "@/hooks/useLocation";
import { issQueries } from "@/lib/iss/queries";

export const Route = createFileRoute("/iss/passes")({
  component: PassesPage,
});

function PassesPage() {
  const { coordinates, hasLocation } = useLocation();
  const { data: tle } = useQuery(issQueries.tle());

  return (
    <ISSLayout>
      <div className="p-4 h-full overflow-auto">
        <h1 className="text-xl font-bold mb-4 text-matrix-text">
          UPCOMING_PASSES
        </h1>

        {!hasLocation ? (
          <LocationSelector />
        ) : (
          <PassesList location={coordinates!} tle={tle} />
        )}
      </div>
    </ISSLayout>
  );
}
```

---

## Step 8: Environment Variables

### 8.1 Update .dev.vars

Add any required secrets for development:

```
# No additional secrets required - Cloudflare AI uses binding
# Open-Meteo API is free and requires no key
```

### 8.2 Update src/env.ts (if needed)

No changes required for this feature - all integrations use bindings or free APIs.

---

## Step 9: Add Navigation Link

### 9.1 Update ISSLayout Header

In `src/routes/iss/-components/ISSLayout.tsx`, add navigation link:

```typescript
<Link
  to="/iss/passes"
  className={`px-3 py-1 text-xs uppercase border transition-colors hover:border-matrix-dim ${
    location.pathname === "/iss/passes"
      ? "border-matrix-text text-matrix-text"
      : "border-transparent"
  }`}
>
  Passes
</Link>
```

---

## Testing Checklist

- [ ] Location persists across page refreshes
- [ ] Location is shared between /iss, /iss/map, and /iss/passes
- [ ] Pass predictions load for set location
- [ ] AI briefing generates (or fallback shows when AI unavailable)
- [ ] Weather data appears in briefings when available
- [ ] Keyboard navigation works for all interactive elements
- [ ] Screen reader announces briefing content correctly
- [ ] Reduced motion preference is respected

---

## Troubleshooting

### AI Binding Not Available

If `context.cloudflare?.env?.AI` is undefined:
1. Verify `wrangler.jsonc` has the AI binding configured
2. Restart `wrangler dev`
3. Check Cloudflare dashboard for Workers AI quota

### Weather API Failing

Open-Meteo has no rate limits for reasonable use, but:
1. Check network connectivity
2. Verify coordinates are valid (-90 to 90 lat, -180 to 180 lng)
3. Fallback gracefully with `weatherIncluded: false`

### Pass Predictions Slow

For large date ranges:
1. Consider Web Worker for orbital calculations
2. Implement pagination (load first 3, then rest on scroll)
3. Add staleTime to TanStack Query to cache results

