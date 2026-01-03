# TanStack DB Migration

Migrate from the current TanStack Query + Dexie combination to unified TanStack DB collections for reactive, consistent data management. This simplifies the data layer and enables more powerful offline-first patterns.

## Rationale
The current dual data layer creates complexity and potential consistency issues. TanStack DB provides a unified solution that's already partially integrated, reducing maintenance burden and enabling better offline support.

## User Stories
- As a user, I want data to sync seamlessly between online and offline modes so that I can use the app anywhere
- As a developer, I want a unified data layer so that I don't need to maintain two separate caching systems

## Acceptance Criteria
- [ ] All Dexie stores are migrated to TanStack DB collections
- [ ] React Query caches are replaced with TanStack DB live queries
- [ ] Offline data persistence works correctly after migration
- [ ] No regression in data loading performance
- [ ] Developer documentation updated for new data patterns
