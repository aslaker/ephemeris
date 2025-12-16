# Data Model: Fix Crew Data Rendering Regression

**Feature**: 003-fix-crew-render  
**Created**: 2024-12-15

## Overview

This feature is a bug fix - no new entities are introduced. This document captures the existing data model for reference.

## Entities

### Astronaut

**Location**: `src/lib/iss/types.ts`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✅ | Unique identifier (slugified name) |
| `name` | `string` | ✅ | Full name of astronaut |
| `craft` | `string` | ✅ | Spacecraft currently aboard ("ISS") |
| `image` | `string` | ❌ | Wikipedia portrait URL |
| `role` | `string` | ❌ | Mission role (e.g., "Commander", "Flight Engineer") |
| `agency` | `string` | ❌ | Space agency affiliation (e.g., "NASA", "Roscosmos") |
| `launchDate` | `string` | ❌ | Launch date ISO string (YYYY-MM-DD) |
| `endDate` | `string` | ❌ | Expected return date ISO string |

**Source**: Open Notify API (`name`, `craft`) enriched with local mission database

### MissionProfile

**Location**: `src/lib/iss/types.ts`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `start` | `string` | ❌ | Mission start date (YYYY-MM-DD) |
| `end` | `string` | ❌ | Mission end date (YYYY-MM-DD) |
| `role` | `string` | ✅ | Mission role |
| `agency` | `string` | ❌ | Space agency |
| `image` | `string` | ❌ | Portrait URL |
| `aliasFor` | `string` | ❌ | Reference to canonical name entry |

**Source**: Local database (`src/lib/iss/mission-db.ts`)

## Data Flow

```
Open Notify API ─────────────────────────────────────────────────┐
  (via server function)                                          │
  Response: { people: [{ name, craft }], number, message }       │
                                                                 ▼
                                                          ┌──────────────┐
                                                          │ fetchCrewData │
                                                          └──────────────┘
                                                                 │
                                                                 ▼
Mission Database ─────────────────────────────────────────► Enrichment
  (findMissionProfile)                                           │
  Matches: name → { role, agency, image, start, end }            │
                                                                 ▼
                                                          ┌──────────────┐
                                                          │ Astronaut[]  │
                                                          └──────────────┘
                                                                 │
                                                                 ▼
                                                          ┌──────────────┐
                                                          │ TanStack     │
                                                          │ Query Cache  │
                                                          └──────────────┘
                                                                 │
                                                                 ▼
                                                          ┌──────────────┐
                                                          │ CrewManifest │
                                                          │ Component    │
                                                          └──────────────┘
```

## Validation Rules

### API Response Validation

The Open Notify API response must be validated before processing:

1. `message` field must equal `"success"`
2. `people` must be an array
3. Each person must have `name` (string) and `craft` (string)

### ISS Crew Filtering

Only crew members with `craft === "ISS"` are displayed. Other spacecraft (e.g., "Tiangong") are filtered out.

## State Transitions

### Query State Machine

```
IDLE ──────► LOADING ──────► SUCCESS (crew: Astronaut[])
                │
                └──────────► ERROR (isError: true)
```

### UI State Mapping

| Query State | Condition | UI Component |
|-------------|-----------|--------------|
| `isLoading: true` | - | Loading skeleton (4 placeholder cards) |
| `isError: true` | - | Error message "CREW_DATA_UNAVAILABLE" |
| `data: []` | Empty array | Empty state "NO_CREW_DATA" |
| `data: Astronaut[]` | Has items | CrewCard grid |

## No Schema Changes

This bug fix does not modify any data structures. The existing types in `src/lib/iss/types.ts` remain unchanged.
