# Quickstart: ISS Tracker Migration

**Feature**: 001-iss-tracker-migration  
**Created**: December 13, 2025

## Prerequisites

Before starting implementation, ensure:

1. ✅ You're on the `001-iss-tracker-migration` branch
2. ✅ Bun installed
3. ✅ Ephemeris dev server runs successfully (`bun dev`)

## Step 1: Install Dependencies

Add the required packages for 3D globe visualization and orbital calculations:

```bash
cd /Users/adamslaker/projects/personal/ephemeris
bun add three@0.170.0 react-globe.gl@^2.37.0 satellite.js@5.0.0
bun add -D @types/three
```

## Step 2: Create Directory Structure

Set up the file structure for the ISS Tracker feature:

```bash
# Route files
mkdir -p src/routes/iss/-components

# Utility modules
mkdir -p src/lib/iss

# Create placeholder files
touch src/routes/iss/index.tsx
touch src/routes/iss/map.tsx
touch src/routes/iss/crew.tsx
touch src/routes/iss/-components/ISSLayout.tsx
touch src/routes/iss/-components/StatsPanel.tsx
touch src/routes/iss/-components/MatrixText.tsx
touch src/routes/iss/-components/FlyoverControl.tsx
touch src/routes/iss/-components/OrbitalSolver.tsx
touch src/routes/iss/-components/CrewCard.tsx
touch src/lib/iss/api.ts
touch src/lib/iss/queries.ts
touch src/lib/iss/audio.ts
touch src/lib/iss/orbital.ts
touch src/lib/iss/types.ts
```

## Step 3: Add Matrix Theme to styles.css

Add the ISS Matrix theme variables and animations to `src/styles.css`:

```css
/* Add after existing :root variables */

/* ISS Matrix Theme Variables */
.iss-theme {
  --matrix-bg: #0a0a0a;
  --matrix-dark: #050505;
  --matrix-text: #00ff41;
  --matrix-dim: #004d14;
  --matrix-alert: #ff3333;
}

@theme inline {
  /* Add to existing @theme inline block */
  --color-matrix-bg: var(--matrix-bg, #0a0a0a);
  --color-matrix-dark: var(--matrix-dark, #050505);
  --color-matrix-text: var(--matrix-text, #00ff41);
  --color-matrix-dim: var(--matrix-dim, #004d14);
  --color-matrix-alert: var(--matrix-alert, #ff3333);
}

/* ISS Matrix Animations */
@keyframes scanlines {
  0% { background-position: 0 0; }
  100% { background-position: 0 4px; }
}

@keyframes crt-flicker {
  0%, 100% { opacity: 0.03; }
  50% { opacity: 0.05; }
}

@keyframes pulse-fast {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.scanlines {
  background-image: repeating-linear-gradient(
    transparent 0px,
    transparent 2px,
    rgba(0, 0, 0, 0.3) 2px,
    rgba(0, 0, 0, 0.3) 4px
  );
  animation: scanlines 0.5s linear infinite;
}

.crt-flicker {
  animation: crt-flicker 0.1s infinite;
}

.crt-turn-on {
  animation: crt-on 0.5s ease-out forwards;
}

@keyframes crt-on {
  0% { transform: scaleY(0.01); filter: brightness(3); }
  50% { transform: scaleY(1); filter: brightness(1.5); }
  100% { transform: scaleY(1); filter: brightness(1); }
}

.glitch-text {
  position: relative;
}

.glitch-text::before,
.glitch-text::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.glitch-text::before {
  animation: glitch-1 0.3s infinite;
  color: #00ff41;
  z-index: -1;
}

.glitch-text::after {
  animation: glitch-2 0.3s infinite;
  color: #ff0000;
  z-index: -2;
}

@keyframes glitch-1 {
  0%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); }
  20% { clip-path: inset(20% 0 60% 0); transform: translate(-2px, 2px); }
  40% { clip-path: inset(40% 0 40% 0); transform: translate(2px, -2px); }
  60% { clip-path: inset(60% 0 20% 0); transform: translate(-1px, 1px); }
}

@keyframes glitch-2 {
  0%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); }
  20% { clip-path: inset(60% 0 20% 0); transform: translate(2px, -2px); }
  40% { clip-path: inset(20% 0 60% 0); transform: translate(-2px, 2px); }
  60% { clip-path: inset(40% 0 40% 0); transform: translate(1px, -1px); }
}

.animate-pulse-fast {
  animation: pulse-fast 1s ease-in-out infinite;
}

.animate-spin-slow {
  animation: spin-slow 8s linear infinite;
}

/* Custom scrollbar for ISS theme */
.iss-theme .custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.iss-theme .custom-scrollbar::-webkit-scrollbar-track {
  background: #050505;
}

.iss-theme .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #004d14;
  border-radius: 0;
}

.iss-theme .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #00ff41;
}
```

## Step 4: Add Google Font

Add the Share Tech Mono font to the `__root.tsx` or create a font loading utility:

```tsx
// Option 1: Add to document head in __root.tsx
// Inside the Head component:
<link 
  href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" 
  rel="stylesheet" 
/>
```

## Step 5: Copy Type Definitions

Copy the type definitions from the contracts file:

```bash
cp specs/001-iss-tracker-migration/contracts/api-interfaces.ts src/lib/iss/types.ts
```

Then simplify for runtime use (remove JSDoc, export function signatures become actual functions).

## Step 6: Implementation Order

Follow this order for implementation to minimize blocked dependencies:

### Layer 1: Foundation (No dependencies)
1. `src/lib/iss/types.ts` - Type definitions
2. `src/lib/iss/audio.ts` - Audio engine (standalone)
3. `src/styles.css` - Theme additions

### Layer 2: API & Utilities
4. `src/lib/iss/api.ts` - Data fetching with Sentry (**must add `id` fields to all entities**)
5. `src/lib/iss/queries.ts` - TanStack Query definitions (positioned for TanStack DB)
6. `src/lib/iss/orbital.ts` - Orbital calculations

> **Important for TanStack DB**: All entities must have an `id` field for future `getKey` compatibility.
> - `ISSPosition.id` = `timestamp.toString()`
> - `Astronaut.id` = slugified name (e.g., `"sunita-williams"`)
> - See `contracts/api-interfaces.ts` for `generateEntityId` helper

### Layer 3: Base Components
7. `src/routes/iss/-components/MatrixText.tsx`
8. `src/routes/iss/-components/StatsPanel.tsx`

### Layer 4: Feature Components
9. `src/routes/iss/-components/OrbitalSolver.tsx`
10. `src/routes/iss/-components/FlyoverControl.tsx`
11. `src/routes/iss/-components/CrewCard.tsx`

### Layer 5: Layout & Context
12. `src/routes/iss/-components/ISSLayout.tsx` (with LocationContext)

### Layer 6: Route Pages
13. `src/routes/iss/index.tsx` - 3D Globe
14. `src/routes/iss/map.tsx` - 2D Map
15. `src/routes/iss/crew.tsx` - Crew Manifest

## Step 7: Verify Integration

After implementation, verify:

```bash
# Start dev server
bun dev

# Visit routes
# http://localhost:3000/iss       - 3D Globe
# http://localhost:3000/iss/map   - 2D Map  
# http://localhost:3000/iss/crew  - Crew Manifest
```

### Verification Checklist

- [ ] Globe renders with ISS position marker
- [ ] Position updates every 5 seconds
- [ ] Orbital paths display on globe
- [ ] Stats panel shows telemetry data
- [ ] Matrix theme styling applies correctly
- [ ] Audio plays on interactions (after init)
- [ ] 2D map shows ISS with path
- [ ] Crew manifest displays astronaut cards
- [ ] Flyover prediction works with location
- [ ] Orbital solver modal shows parameters
- [ ] No console errors
- [ ] Sentry spans appear in Sentry dashboard

## Common Issues

### Globe not rendering
- Ensure `three` is installed
- Check browser WebGL support
- Verify container has explicit height

### Audio not playing
- User must click "INITIALIZE_UPLINK" first
- Check browser audio policies
- Verify not muted in localStorage

### TLE fetch failing
- Check CORS - may need proxy for some sources
- Fallback TLE should still work

### Types not found
- Run `bun dev` to regenerate route tree
- Check import paths are correct

## External API Endpoints

For reference during implementation:

| API | URL | Rate Limit |
|-----|-----|------------|
| Where The ISS At | `https://api.wheretheiss.at/v1/satellites/25544` | None specified |
| Open Notify (legacy) | `http://api.open-notify.org/iss-now.json` | Via proxy only |
| Open Notify Crew | `http://api.open-notify.org/astros.json` | Via proxy only |
| CelesTrak TLE | `https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE` | None specified |
| ARISS TLE (backup) | `https://live.ariss.org/iss.txt` | None specified |

**Proxy URL**: `https://api.allorigins.win/raw?url=` (for CORS-blocked APIs)
