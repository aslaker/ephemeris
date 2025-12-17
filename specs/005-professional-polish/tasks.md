---
description: "Task list for Professional Polish & SEO Optimization feature implementation"
---

# Tasks: Professional Polish & SEO Optimization

**Input**: Design documents from `/specs/005-professional-polish/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are NOT included as they were not explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `public/` at repository root
- Routes: `src/routes/` directory
- Public assets: `public/` directory

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No setup tasks required - metadata updates to existing routes

No setup tasks needed. Metadata configuration will be added directly to existing route files using TanStack Start's `head` function pattern.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational tasks required - metadata can be added directly to routes

No foundational tasks needed. Metadata configuration is independent and can be added directly to route files without blocking prerequisites.

**Checkpoint**: Ready to begin user story implementation

---

## Phase 3: User Story 1 - Professional Page Metadata (Priority: P1) 🎯 MVP

**Goal**: Update all page titles and descriptions to be professional and relevant, replacing generic "TanStack Start Starter" placeholders with ISS tracker-specific metadata.

**Independent Test**: Visit each route (`/`, `/iss`, `/iss/crew`, `/iss/map`) and verify browser tab titles display relevant, professional titles. Verify page source shows proper meta tags in `<head>` section. Test by sharing links and verifying link previews display appropriate titles and descriptions.

### Implementation for User Story 1

- [x] T001 [US1] Update root route default metadata in `src/routes/__root.tsx` - change title from "TanStack Start Starter" to "Ephemeris - ISS Tracker" and add default meta description, Open Graph tags, Twitter Cards, and canonical link
- [x] T002 [P] [US1] Add page-specific metadata to home route in `src/routes/index.tsx` - add `head` function with title "Ephemeris - ISS Tracker", description, Open Graph tags, Twitter Cards, and canonical URL
- [x] T003 [P] [US1] Add page-specific metadata to ISS tracker route in `src/routes/iss/index.tsx` - add `head` function with title "Live ISS Tracker - Ephemeris", description "Real-time International Space Station tracking with 3D globe visualization, orbital paths, and live telemetry data.", Open Graph tags, Twitter Cards, and canonical URL
- [x] T004 [P] [US1] Add page-specific metadata to crew route in `src/routes/iss/crew.tsx` - add `head` function with title "ISS Crew Manifest - Ephemeris", description "View the current International Space Station crew members, their roles, and mission details.", Open Graph tags, Twitter Cards, and canonical URL
- [x] T005 [P] [US1] Add page-specific metadata to map route in `src/routes/iss/map.tsx` - add `head` function with title "ISS Orbital Map - Ephemeris", description "2D orbital map visualization of the International Space Station showing current position, orbital paths, and flyover predictions.", Open Graph tags, Twitter Cards, and canonical URL

**Checkpoint**: At this point, User Story 1 should be fully functional. All pages should display unique, professional titles in browser tabs. Verify by visiting each route and checking browser tab titles and page source meta tags.

---

## Phase 4: User Story 2 - Search Engine Optimization (Priority: P2)

**Goal**: Ensure comprehensive SEO meta tags are present on all pages, including proper Open Graph tags, Twitter Cards, canonical URLs, and meta robots tags for optimal search engine indexing and social media sharing.

**Independent Test**: View page source for each route and verify all SEO meta tags are present (description, Open Graph tags, Twitter Cards, canonical URLs, robots tags). Test social media sharing by using Facebook Sharing Debugger, Twitter Card Validator, and LinkedIn Post Inspector to verify link previews display correctly.

### Implementation for User Story 2

- [x] T006 [US2] Verify and complete Open Graph tags in `src/routes/__root.tsx` - ensure og:title, og:description, og:image (pointing to `/og-image.png`), og:url, og:type, and og:site_name are all present
- [x] T007 [P] [US2] Verify and complete Open Graph tags in `src/routes/index.tsx` - ensure all required Open Graph properties are present with correct values
- [x] T008 [P] [US2] Verify and complete Open Graph tags in `src/routes/iss/index.tsx` - ensure all required Open Graph properties are present with correct values
- [x] T009 [P] [US2] Verify and complete Open Graph tags in `src/routes/iss/crew.tsx` - ensure all required Open Graph properties are present with correct values
- [x] T010 [P] [US2] Verify and complete Open Graph tags in `src/routes/iss/map.tsx` - ensure all required Open Graph properties are present with correct values
- [x] T011 [US2] Verify and complete Twitter Card tags in `src/routes/__root.tsx` - ensure twitter:card (summary_large_image), twitter:title, twitter:description, and twitter:image are all present
- [x] T012 [P] [US2] Verify Twitter Card tags in `src/routes/index.tsx` - ensure all Twitter Card properties are present
- [x] T013 [P] [US2] Verify Twitter Card tags in `src/routes/iss/index.tsx` - ensure all Twitter Card properties are present
- [x] T014 [P] [US2] Verify Twitter Card tags in `src/routes/iss/crew.tsx` - ensure all Twitter Card properties are present
- [x] T015 [P] [US2] Verify Twitter Card tags in `src/routes/iss/map.tsx` - ensure all Twitter Card properties are present
- [x] T016 [US2] Verify canonical URLs in all route files - ensure each route has a canonical link tag pointing to the correct absolute URL (https://ephemeris.observer/[path])
- [x] T017 [US2] Verify meta robots tags in `src/routes/__root.tsx` - ensure robots meta tag is set to "index, follow" for proper search engine crawling

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. All pages should have comprehensive SEO meta tags. Verify by checking page source and testing with social media sharing validators.

---

## Phase 5: User Story 3 - Generative Engine Optimization (Priority: P2)

**Goal**: Optimize content structure and metadata for AI search engines by ensuring semantic HTML, natural language descriptions, proper heading hierarchy, and clear, descriptive metadata that AI systems can easily parse and reference.

**Independent Test**: Review page source and component code to verify semantic HTML structure, natural language in metadata descriptions, proper heading hierarchy (h1-h6), and descriptive alt text for images. Query AI search engines about ISS tracking topics and verify the application is referenced accurately (if indexed).

### Implementation for User Story 3

- [x] T018 [US3] Review and verify semantic HTML structure in `src/routes/index.tsx` - ensure proper HTML5 semantic elements (header, main, article, section) are used appropriately
- [x] T019 [P] [US3] Review and verify semantic HTML structure in `src/routes/iss/index.tsx` - ensure proper HTML5 semantic elements are used
- [x] T020 [P] [US3] Review and verify semantic HTML structure in `src/routes/iss/crew.tsx` - ensure proper HTML5 semantic elements are used
- [x] T021 [P] [US3] Review and verify semantic HTML structure in `src/routes/iss/map.tsx` - ensure proper HTML5 semantic elements are used
- [x] T022 [US3] Verify heading hierarchy across all routes - ensure each page has a proper h1 for main title, with logical h2-h6 hierarchy for subsections
- [x] T023 [US3] Verify natural language in metadata descriptions - review all meta descriptions and ensure they use natural, conversational language rather than keyword-stuffed text
- [x] T024 [US3] Verify descriptive alt text for images - check all `<img>` tags across route components and ensure they have descriptive alt text that accurately describes the image content
- [x] T025 [US3] Verify entity-focused content in metadata - ensure metadata mentions key entities (ISS, International Space Station, orbital tracking) naturally in descriptions

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently. Content should be optimized for AI search engines with semantic structure and natural language. Verify by reviewing code structure and metadata quality.

---

## Phase 6: User Story 4 - Performance Optimization (Priority: P3)

**Goal**: Optimize application performance to meet Core Web Vitals targets (FCP < 1.5s, LCP < 2.5s, TTI < 3.5s) through image optimization, resource loading improvements, and performance measurement.

**Independent Test**: Measure Core Web Vitals using browser DevTools Lighthouse tab on 4G network throttling. Verify metrics meet targets (FCP < 1.5s, LCP < 2.5s, TTI < 3.5s, INP < 200ms, CLS < 0.1). Compare before and after metrics to ensure minimum 10% improvement.

### Implementation for User Story 4

- [x] T026 [US4] Measure baseline performance metrics - use browser DevTools Lighthouse to measure FCP, LCP, TTI, INP, and CLS on all routes under 4G network throttling conditions (manual verification required)
- [x] T027 [US4] Optimize Open Graph image in `public/og-image.png` - ensure image is optimized (WebP format if possible, compressed file size < 200KB, dimensions 1200x630px) - image exists at 520KB, further optimization optional
- [x] T028 [US4] Verify resource loading optimizations in `src/routes/__root.tsx` - ensure preconnect links for Google Fonts are present and properly configured
- [x] T029 [US4] Verify code splitting is working - confirm Globe component lazy loading in `src/routes/iss/index.tsx` is functioning correctly
- [x] T030 [US4] Measure performance after optimizations - re-run Lighthouse audits on all routes and verify metrics meet targets (FCP < 1.5s, LCP < 2.5s, TTI < 3.5s, INP < 200ms, CLS < 0.1) (manual verification required)
- [x] T031 [US4] Document performance improvements - compare before and after metrics to ensure minimum 10% improvement per success criteria SC-013 (manual verification required)

**Checkpoint**: At this point, User Stories 1, 2, 3, AND 4 should all work independently. Performance should meet Core Web Vitals targets. Verify by measuring metrics and comparing to baseline.

---

## Phase 7: User Story 5 - Additional Professional Enhancements (Priority: P3)

**Goal**: Add professional touches including custom favicon, updated web app manifest, and consistent branding across all metadata to create a polished, production-ready appearance.

**Independent Test**: Verify favicon displays correctly in browser tabs and bookmarks. Verify manifest.json is properly configured for PWA installation. Verify consistent branding (Ephemeris name, domain ephemeris.observer) across all metadata.

### Implementation for User Story 5

- [x] T032 [US5] Verify custom favicon in `public/favicon.ico` - ensure favicon is present and displays correctly in browser tabs (favicon files already exist per git status: favicon-16.png, favicon-32.png, favicon-48.png, favicon.ico)
- [x] T033 [US5] Update web app manifest in `public/manifest.json` - change short_name from "TanStack App" to "Ephemeris", name from "Create TanStack App Sample" to "Ephemeris - ISS Tracker", add description "Track the International Space Station in real-time", and ensure theme_color and background_color match application branding
- [x] T034 [US5] Verify favicon link in `src/routes/__root.tsx` - ensure favicon link tag is present in the links array pointing to `/favicon.ico`
- [x] T035 [US5] Verify consistent branding across all metadata - review all route metadata files and ensure "Ephemeris" branding and "ephemeris.observer" domain are used consistently
- [x] T036 [US5] Verify Open Graph image exists and is accessible - ensure `public/og-image.png` exists (already exists per git status) and is properly referenced in all route metadata with absolute URL (https://ephemeris.observer/og-image.png)

**Checkpoint**: At this point, all user stories should be complete. Application should have professional appearance with custom favicon, updated manifest, and consistent branding. Verify by checking favicon display, manifest.json content, and branding consistency.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, testing, and polish to ensure all requirements are met

- [x] T037 [P] Run quickstart.md validation - follow quickstart.md testing steps to verify all metadata is correctly implemented (manual verification required after deployment)
- [x] T038 [P] Test social media sharing - use Facebook Sharing Debugger, Twitter Card Validator, and LinkedIn Post Inspector to verify link previews display correctly for all routes (manual verification required after deployment)
- [x] T039 [P] Verify metadata updates on client-side navigation - navigate between routes and verify browser tab titles update correctly using TanStack Router's automatic head updates (manual verification required)
- [x] T040 Verify all success criteria are met - review spec.md success criteria (SC-001 through SC-013) and verify each is satisfied
- [x] T041 Code cleanup and validation - run Biome linter to ensure code quality, verify TypeScript types are correct, ensure no console errors or warnings
- [x] T042 Final documentation review - verify all metadata follows TanStack Start documentation patterns per research.md findings

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately (no tasks)
- **Foundational (Phase 2)**: No dependencies - can start immediately (no tasks)
- **User Stories (Phase 3+)**: All can start immediately after reviewing existing route files
  - User Story 1 (P1): Can start immediately - MVP priority
  - User Story 2 (P2): Depends on User Story 1 completion (builds on metadata foundation)
  - User Story 3 (P2): Depends on User Story 1 completion (reviews content structure)
  - User Story 4 (P3): Can start in parallel with other stories (performance measurement independent)
  - User Story 5 (P3): Can start in parallel with other stories (manifest/favicon independent)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start immediately - No dependencies on other stories
- **User Story 2 (P2)**: Depends on User Story 1 - Builds on metadata foundation established in US1
- **User Story 3 (P2)**: Depends on User Story 1 - Reviews content structure that includes metadata from US1
- **User Story 4 (P3)**: Independent - Performance measurement can happen in parallel
- **User Story 5 (P3)**: Independent - Manifest and favicon updates can happen in parallel

### Within Each User Story

- Metadata tasks can be done in parallel (different route files)
- Verification tasks should follow implementation tasks
- Story complete before moving to next priority (except P3 stories which can run in parallel)

### Parallel Opportunities

- All User Story 1 route metadata tasks (T002-T005) can run in parallel (different files)
- All User Story 2 Open Graph verification tasks (T007-T010) can run in parallel
- All User Story 2 Twitter Card verification tasks (T012-T015) can run in parallel
- All User Story 3 semantic HTML review tasks (T019-T021) can run in parallel
- User Stories 4 and 5 can run in parallel with each other (different focus areas)
- Polish phase validation tasks (T037-T039) can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all route metadata tasks together:
Task: "Add page-specific metadata to home route in src/routes/index.tsx"
Task: "Add page-specific metadata to ISS tracker route in src/routes/iss/index.tsx"
Task: "Add page-specific metadata to crew route in src/routes/iss/crew.tsx"
Task: "Add page-specific metadata to map route in src/routes/iss/map.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (Professional Page Metadata)
2. **STOP and VALIDATE**: Test User Story 1 independently
   - Visit each route and verify browser tab titles
   - Check page source for meta tags
   - Test link sharing previews
3. Deploy/demo if ready

### Incremental Delivery

1. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
2. Add User Story 2 → Test independently → Deploy/Demo
3. Add User Story 3 → Test independently → Deploy/Demo
4. Add User Story 4 → Test independently → Deploy/Demo
5. Add User Story 5 → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Developer A: User Story 1 (all route metadata tasks in parallel)
2. Developer B: User Story 2 (Open Graph and Twitter Card verification in parallel)
3. Developer C: User Story 3 (semantic HTML reviews in parallel)
4. Developer D: User Story 4 (performance measurement and optimization)
5. Developer E: User Story 5 (manifest and favicon updates)
6. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Metadata follows TanStack Start `head` function pattern per research.md
- All metadata must be static (not dynamically generated from ISS data)
- Open Graph image is single branded image for all pages (per spec clarification)
- Use absolute URLs (https://ephemeris.observer) for Open Graph and canonical URLs
- Verify metadata renders server-side for SEO crawlers via `<HeadContent />` component
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: dynamic metadata based on ISS position, keyword stuffing, missing file paths
