# Data Model: Professional Polish & SEO Optimization

**Feature**: 005-professional-polish  
**Date**: 2025-01-27  
**Status**: Design Phase

## Overview

This feature does not introduce new database entities or data storage. Instead, it defines metadata configuration structures for route-level page metadata, SEO tags, and performance optimization settings. All metadata is static configuration per route, not dynamic data.

## Entities

### Page Metadata

Represents the collection of meta tags, titles, and descriptions for each route, including Open Graph, Twitter Cards, and SEO-specific tags.

**Structure**:
```typescript
interface PageMetadata {
  // Basic SEO
  title: string;                    // Page title (< 60 chars, unique per route)
  description: string;              // Meta description (150-160 chars)
  canonicalUrl: string;            // Canonical URL for the page
  
  // Open Graph (Social Media)
  ogTitle: string;                 // Open Graph title (up to 95 chars)
  ogDescription: string;           // Open Graph description (up to 200 chars)
  ogImage: string;                 // Open Graph image URL (1200x630px, single branded image)
  ogUrl: string;                   // Open Graph URL (canonical URL)
  ogType: 'website' | 'article';  // Open Graph type
  ogSiteName: string;              // Site name (e.g., "Ephemeris")
  
  // Twitter Cards
  twitterCard: 'summary' | 'summary_large_image';  // Twitter card type
  twitterTitle: string;            // Twitter title (< 70 chars)
  twitterDescription: string;      // Twitter description (up to 200 chars)
  twitterImage: string;            // Twitter image URL (1200x675px, can reuse OG image)
  
  // SEO Control
  robots: string;                  // Meta robots tag (e.g., "index, follow")
}
```

**Routes and Metadata Mapping**:

| Route | Title | Description | Focus |
|-------|-------|-------------|-------|
| `/` | Ephemeris - ISS Tracker | Home page description | Landing/intro |
| `/iss` | Live ISS Tracker - Ephemeris | Real-time ISS position tracking | Live tracking |
| `/iss/crew` | ISS Crew Manifest - Ephemeris | Current ISS crew members | Personnel |
| `/iss/map` | ISS Orbital Map - Ephemeris | 2D orbital map visualization | Map visualization |

**Validation Rules**:
- Title must be unique per route
- Title length: ≤ 60 characters (for search results display)
- Description length: 150-160 characters (optimal for SEO)
- Open Graph image must be accessible via HTTPS
- Canonical URL must be absolute URL (includes domain)
- All metadata must be static (not dynamically generated from ISS data)

**State Transitions**: N/A - Metadata is static configuration, no state transitions

---

### Performance Metrics

Represents measurable performance indicators including load times, Core Web Vitals, and resource optimization metrics.

**Structure**:
```typescript
interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number;                     // Largest Contentful Paint (ms, target: < 2500ms)
  fcp: number;                     // First Contentful Paint (ms, target: < 1500ms)
  inp: number;                     // Interaction to Next Paint (ms, target: < 200ms)
  cls: number;                     // Cumulative Layout Shift (score, target: < 0.1)
  tti: number;                     // Time to Interactive (ms, target: < 3500ms)
  
  // Additional Metrics
  ttfb: number;                    // Time to First Byte (ms, target: < 800ms)
  bundleSize: number;              // JavaScript bundle size (KB)
  imageOptimization: {
    format: 'webp' | 'avif' | 'png' | 'jpg';
    size: number;                  // File size in KB
    dimensions: { width: number; height: number };
  };
}
```

**Target Thresholds** (per spec success criteria):
- FCP: < 1.5 seconds (Good)
- LCP: < 2.5 seconds (Good)
- TTI: < 3.5 seconds (Good)
- INP: < 200ms (Good)
- CLS: < 0.1 (Good)

**Measurement Approach**:
- Use browser DevTools Performance tab
- Use Lighthouse for Core Web Vitals
- Use Web Vitals library for runtime measurement
- Measure on 4G network throttling conditions

**Validation Rules**:
- Metrics must be measured before and after optimizations
- Minimum 10% improvement required per spec (SC-013)
- Measurements should be taken on representative devices and network conditions

---

### Generative Engine Optimization (GEO)

Represents content structure, metadata, and formatting optimized for AI search engines and generative AI systems to accurately parse, understand, and reference the application.

**Structure**:
```typescript
interface GEOOptimization {
  // Semantic Content
  semanticHTML: boolean;            // Uses proper HTML5 semantic elements
  headingHierarchy: boolean;        // Proper h1-h6 hierarchy
  naturalLanguage: boolean;         // Natural, conversational language
  
  // Entity-Based Content
  entities: string[];              // Key entities (e.g., ["ISS", "International Space Station", "orbital tracking"])
  intentAlignment: string;         // Primary user intent addressed
  
  // Content Structure
  structuredContent: boolean;       // Well-structured, logical content flow
  descriptiveAltText: boolean;     // Descriptive alt text for images
  clearMetadata: boolean;           // Clear, descriptive metadata
}
```

**Optimization Criteria**:
- Content uses natural, semantic language (not keyword-stuffed)
- Proper HTML5 semantic structure (header, main, article, section, etc.)
- Clear heading hierarchy (h1 for main title, h2-h6 for subsections)
- Descriptive alt text for all images
- Entity-focused content (mentions key entities naturally)
- Intent-driven content (addresses user questions and needs)

**Validation Rules**:
- Content should be easily parseable by AI systems
- Metadata should use natural language descriptions
- Avoid keyword stuffing
- Focus on comprehensive topic coverage

---

## Relationships

### Route → Page Metadata (1:1)
- Each route has exactly one PageMetadata configuration
- Metadata is defined in the route file's `head` function
- Metadata is static and does not change based on application state

### Page Metadata → Performance Metrics (N:1)
- All routes share the same performance optimization strategies
- Performance metrics are measured at the application level
- Individual routes may have different performance characteristics

### Page Metadata → GEO Optimization (1:1)
- Each route's metadata contributes to overall GEO optimization
- GEO strategies apply consistently across all routes
- Content structure and metadata work together for AI optimization

---

## Configuration Files

### Route Metadata Configuration

Each route file contains a `head` function that returns metadata:

```typescript
// src/routes/iss/index.tsx
export const Route = createFileRoute("/iss/")({
  head: () => ({
    title: 'Live ISS Tracker - Ephemeris',
    meta: [
      { name: 'description', content: '...' },
      { property: 'og:title', content: '...' },
      // ... more meta tags
    ],
  }),
  component: ISSIndexPage,
});
```

### Public Assets

- `public/favicon.ico` - Custom favicon
- `public/manifest.json` - Web app manifest (updated with Ephemeris branding)
- `public/og-image.png` - Single branded Open Graph image (1200x630px)

---

## Data Flow

1. **Route Definition**: Each route defines metadata via `head` function
2. **Server-Side Rendering**: TanStack Start renders `<HeadContent />` in root layout
3. **SEO Crawlers**: Receive fully rendered HTML with metadata in `<head>`
4. **Client-Side Navigation**: TanStack Router updates document head on route changes
5. **Social Media Crawlers**: Access Open Graph and Twitter Card tags for link previews
6. **AI Search Engines**: Parse semantic HTML and metadata for understanding and citation

---

## Edge Cases

### Missing Metadata
- **Scenario**: Route doesn't define `head` function
- **Handling**: Fall back to root route metadata (defined in `__root.tsx`)
- **Prevention**: Ensure all routes define appropriate metadata

### Invalid Metadata Values
- **Scenario**: Title exceeds 60 characters or description exceeds 160 characters
- **Handling**: Truncate with ellipsis, log warning in development
- **Prevention**: Validate metadata during development, use TypeScript types

### Image Loading Failures
- **Scenario**: Open Graph image fails to load
- **Handling**: Social media platforms will show default/no image
- **Prevention**: Ensure image is accessible via HTTPS, test with platform validators

### Performance Degradation
- **Scenario**: Performance metrics don't meet targets
- **Handling**: Profile and optimize specific bottlenecks
- **Prevention**: Measure baseline before changes, optimize incrementally

### Client-Side Navigation Metadata Updates
- **Scenario**: Metadata doesn't update when navigating client-side
- **Handling**: TanStack Router automatically updates head on route changes
- **Prevention**: Ensure `head` function is properly defined in route

---

## Validation

### Metadata Validation
- All routes have unique titles
- All routes have descriptions (150-160 chars)
- All routes have Open Graph tags
- All routes have Twitter Card tags
- Canonical URLs are absolute and correct
- Open Graph image is accessible

### Performance Validation
- Core Web Vitals meet target thresholds
- Bundle size is optimized
- Images are optimized (format, size)
- Resource loading is optimized

### GEO Validation
- Content uses natural language
- Semantic HTML structure is correct
- Heading hierarchy is proper
- Alt text is descriptive
- Metadata is clear and descriptive



