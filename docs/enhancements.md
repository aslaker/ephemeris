# Future Enhancements

This document tracks enhancement ideas and feature suggestions identified during development conversations. Items here represent opportunities for improvement that aren't part of current work.

## How to Use This Document

- Review during roadmap planning
- Use as inspiration for future sprints
- Move to specs/ when ready to implement

---

## Ideas

<!-- New items are added here -->

### Migrate to TanStack DB with Dexie Collection

- **Date**: 2025-12-16
- **Priority**: Low
- **Related Files**: `src/lib/iss/db.ts`, `src/hooks/iss/useISSData.ts`, `specs/004-tanstack-db-storage/research.md`

**Context**: Currently using TanStack Query + Dexie directly for local-first ISS data persistence. This is the correct choice for simple read-only caching. Consider migrating to TanStack DB with `tanstack-dexie-db-collection` when either of two triggers occur: (1) Complex local queries are needed—reactive joins across collections (positions ⟷ events ⟷ crew) with sub-millisecond differential dataflow updates, or (2) User-generated content with cloud sync—user accounts, personal annotations, or bidirectional sync requiring optimistic mutations. TanStack DB serves both purposes: a powerful local reactive query engine AND sync infrastructure—two sides of the same coin.

---

---

## Implemented

<!-- Move items here when implemented, with implementation date -->





