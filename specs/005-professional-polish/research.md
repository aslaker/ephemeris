# Research: Professional Polish & SEO Optimization

**Feature**: 005-professional-polish  
**Date**: 2025-01-27  
**Status**: Complete

## Research Areas

### 1. TanStack Start Metadata Patterns

**Decision**: Use route-level `head` function for metadata configuration

**Rationale**: 
- TanStack Start/Router provides a unified `head` function in route definitions (consolidated from separate `meta`, `links`, `scripts` methods in v1.82.0)
- The `head` function returns an object with `title`, `meta`, `links`, `styles`, and `scripts` properties
- Head content is rendered server-side via `<HeadContent />` component in root layout
- This ensures SEO crawlers receive proper metadata without requiring JavaScript execution
- Route-level configuration allows per-page customization while maintaining consistency

**Implementation Pattern**:
```tsx
export const Route = createFileRoute("/path")({
  head: () => ({
    title: 'Page Title',
    meta: [
      { name: 'description', content: 'Page description' },
      { property: 'og:title', content: 'OG Title' },
      // ... more meta tags
    ],
    links: [
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  component: PageComponent,
});
```

**Alternatives Considered**:
- Separate metadata files: Rejected - adds complexity, TanStack Start pattern is more maintainable
- Dynamic metadata based on ISS position: Rejected - spec clarifies metadata should remain static per page
- Third-party metadata library: Rejected - TanStack Start's built-in solution is sufficient and follows framework patterns

**References**:
- TanStack Router Documentation: Document Head Management
- Breaking change note: v1.82.0 unified metadata methods under `head` function

---

### 2. SEO Best Practices (2025)

**Decision**: Implement comprehensive meta tags, Open Graph tags, and Twitter Cards following 2025 best practices

**Rationale**:
- Title tags should be under 60 characters, unique per page, with primary keywords near the beginning
- Meta descriptions should be 150-160 characters, incorporating keywords naturally
- Open Graph tags are essential for social media sharing (Facebook, LinkedIn)
- Twitter Cards enhance Twitter sharing appearance
- Canonical tags prevent duplicate content issues
- Meta robots tags control search engine crawling behavior

**Key Tags to Implement**:
- **Basic SEO**: `title`, `description`, `robots`
- **Open Graph**: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:site_name`
- **Twitter Cards**: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- **Technical**: `canonical` link tag

**Image Specifications**:
- Open Graph image: 1200 x 630 pixels (recommended)
- Twitter Card image: 1200 x 675 pixels (recommended)
- Images must be accessible over HTTPS
- Single branded image for all pages (per spec clarification)

**Alternatives Considered**:
- Minimal meta tags: Rejected - insufficient for professional appearance and SEO
- Dynamic Open Graph images: Rejected - spec specifies single branded image for all pages
- robots.txt file: Rejected - spec specifies meta robots tags only

**References**:
- BasicOG Best Practices Guide
- MetaTagPro.io Guides
- SEO Meta Data Best Practices 2025

---

### 3. Generative Engine Optimization (GEO)

**Decision**: Optimize content structure and metadata for AI search engines using semantic, entity-based approach

**Rationale**:
- AI-powered search engines (ChatGPT, Perplexity, Google Gemini) are increasingly prevalent
- GEO market is growing rapidly (USD 848M in 2025, projected USD 33.68B by 2034)
- AI systems prioritize semantic understanding over keyword matching
- Well-structured, semantic content improves AI system recognition and citation
- Natural language processing optimization enhances AI parsing

**Key Strategies**:
1. **Semantic Content**: Develop comprehensive, semantically rich content that covers topics thoroughly
2. **Entity-Based SEO**: Focus on entities (people, places, concepts) rather than just keywords
3. **Intent-Driven Content**: Craft content addressing specific user needs and questions
4. **Structured Data**: Implement schema markup (JSON-LD) for maximum AI compatibility
5. **Natural Language**: Write in conversational, natural language that AI systems can easily parse

**Implementation Approach**:
- Ensure page titles and descriptions use natural, descriptive language
- Include semantic HTML structure (proper heading hierarchy, semantic elements)
- Use clear, descriptive alt text for images
- Structure content logically with proper HTML5 semantic elements
- Consider basic schema.org structured data (though advanced Schema.org is out of scope per spec)

**Alternatives Considered**:
- Keyword-focused optimization only: Rejected - insufficient for AI search engines
- Advanced Schema.org markup: Rejected - out of scope per spec (focus on fundamental optimizations)
- Complex GEO techniques: Rejected - spec specifies basic but comprehensive approach appropriate for pet project

**References**:
- Generative Engine Optimization Wikipedia
- AI-Powered SEO Strategies 2025
- Google AI Mode and AI-powered search trends

---

### 4. Performance Optimization

**Decision**: Optimize for Core Web Vitals with focus on FCP, LCP, INP, and CLS metrics

**Rationale**:
- Core Web Vitals are key ranking factors and user experience indicators
- Updated thresholds effective January 2026: LCP < 2.0s (previously 2.5s), INP < 200ms, CLS < 0.1
- Performance improvements directly impact conversion rates and bounce rates
- Existing codebase already uses code splitting (`React.lazy` for Globe component)

**Target Metrics** (per spec success criteria):
- **First Contentful Paint (FCP)**: < 1.5 seconds (Good threshold)
- **Largest Contentful Paint (LCP)**: < 2.5 seconds (Good threshold, aligns with spec)
- **Time to Interactive (TTI)**: < 3.5 seconds (Good threshold, aligns with spec)
- **Interaction to Next Paint (INP)**: < 200ms (Good threshold)
- **Cumulative Layout Shift (CLS)**: < 0.1 (Good threshold)

**Optimization Strategies**:
1. **Image Optimization**: 
   - Use modern formats (WebP, AVIF)
   - Implement responsive images
   - Lazy load non-critical images
   - Optimize Open Graph image size

2. **Code Optimization**:
   - Continue using code splitting (already implemented for Globe)
   - Minimize JavaScript execution
   - Optimize bundle size
   - Preload critical resources

3. **Resource Loading**:
   - Preconnect to external domains (already implemented for Google Fonts)
   - Prioritize critical CSS
   - Defer non-critical scripts
   - Use resource hints (preload, prefetch)

4. **Layout Stability**:
   - Reserve space for images and dynamic content
   - Avoid inserting content above existing content
   - Use CSS aspect ratios for images

**Alternatives Considered**:
- Major architectural changes: Rejected - spec specifies optimization of existing code
- Service workers for offline functionality: Rejected - out of scope per spec
- Advanced PWA features: Rejected - spec focuses on basic manifest only

**References**:
- Core Web Vitals Optimization Guide 2025
- Web Performance Optimization Guide
- Updated Core Web Vitals thresholds (effective January 2026)

---

## Consolidated Findings

### Metadata Implementation Strategy
- Use TanStack Start's `head` function in each route file
- Configure static metadata per route (title, description, Open Graph, Twitter Cards)
- Ensure server-side rendering via `<HeadContent />` component
- Use single branded Open Graph image (1200x630px) for all pages

### SEO Implementation Strategy
- Implement comprehensive meta tags following 2025 best practices
- Use meta robots tags (no robots.txt file)
- Ensure unique titles and descriptions per page
- Include canonical URLs for each page

### GEO Implementation Strategy
- Write natural, semantic content in titles and descriptions
- Use proper HTML5 semantic structure
- Ensure content is easily parseable by AI systems
- Focus on entity-based, intent-driven content

### Performance Optimization Strategy
- Optimize images (format, size, lazy loading)
- Continue code splitting patterns
- Optimize resource loading (preconnect, preload)
- Ensure layout stability (reserve space, avoid shifts)
- Measure and validate against Core Web Vitals thresholds

### Professional Touches
- Update favicon with custom Ephemeris branding
- Update manifest.json with proper app name and metadata
- Ensure consistent branding across all metadata
- Test metadata rendering on social media platforms

## Unknowns Resolved

✅ **TanStack Start metadata patterns**: Resolved - use route-level `head` function  
✅ **SEO best practices**: Resolved - comprehensive meta tags, Open Graph, Twitter Cards  
✅ **GEO strategies**: Resolved - semantic, entity-based, natural language optimization  
✅ **Performance optimization**: Resolved - Core Web Vitals focus with specific strategies  
✅ **Image specifications**: Resolved - 1200x630px for Open Graph, single branded image  
✅ **Metadata rendering**: Resolved - server-side via `<HeadContent />` component  

## Next Steps

Proceed to Phase 1: Design & Contracts
- Generate data-model.md for metadata entities
- Create API contracts (if applicable - metadata is static configuration)
- Generate quickstart.md for implementation guide



