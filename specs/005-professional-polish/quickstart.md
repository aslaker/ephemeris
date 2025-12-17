# Quickstart: Professional Polish & SEO Optimization

**Feature**: 005-professional-polish  
**Date**: 2025-01-27

## Overview

This guide provides step-by-step instructions for implementing professional polish and SEO optimization for the Ephemeris ISS tracker application. The implementation includes updating page metadata, adding SEO tags, optimizing for AI search engines, and improving performance.

## Prerequisites

- TanStack Start application running locally
- Access to route files in `src/routes/`
- Access to public assets in `public/`
- Understanding of TanStack Start's `head` function pattern

## Implementation Steps

### Step 1: Update Root Route Metadata

**File**: `src/routes/__root.tsx`

Update the root route's `head` function to set default metadata:

```tsx
export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Ephemeris - ISS Tracker", // Updated from "TanStack Start Starter"
			},
			{
				name: "description",
				content: "Track the International Space Station in real-time. View live ISS position, crew manifest, and orbital map.",
			},
			// Open Graph tags
			{
				property: "og:title",
				content: "Ephemeris - ISS Tracker",
			},
			{
				property: "og:description",
				content: "Track the International Space Station in real-time. View live ISS position, crew manifest, and orbital map.",
			},
			{
				property: "og:image",
				content: "https://ephemeris.observer/og-image.png",
			},
			{
				property: "og:url",
				content: "https://ephemeris.observer",
			},
			{
				property: "og:type",
				content: "website",
			},
			{
				property: "og:site_name",
				content: "Ephemeris",
			},
			// Twitter Cards
			{
				name: "twitter:card",
				content: "summary_large_image",
			},
			{
				name: "twitter:title",
				content: "Ephemeris - ISS Tracker",
			},
			{
				name: "twitter:description",
				content: "Track the International Space Station in real-time. View live ISS position, crew manifest, and orbital map.",
			},
			{
				name: "twitter:image",
				content: "https://ephemeris.observer/og-image.png",
			},
			// SEO
			{
				name: "robots",
				content: "index, follow",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "icon",
				href: "/favicon.ico",
			},
			{
				rel: "canonical",
				href: "https://ephemeris.observer",
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com",
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap",
			},
		],
	}),
	// ... rest of route config
});
```

### Step 2: Add Metadata to Home Route

**File**: `src/routes/index.tsx`

Add a `head` function to the home route:

```tsx
export const Route = createFileRoute("/")({
	head: () => ({
		title: "Ephemeris - ISS Tracker",
		meta: [
			{
				name: "description",
				content: "Track the International Space Station in real-time. View live ISS position, crew manifest, and orbital map.",
			},
			{
				property: "og:title",
				content: "Ephemeris - ISS Tracker",
			},
			{
				property: "og:description",
				content: "Track the International Space Station in real-time. View live ISS position, crew manifest, and orbital map.",
			},
			{
				property: "og:url",
				content: "https://ephemeris.observer",
			},
			{
				name: "twitter:title",
				content: "Ephemeris - ISS Tracker",
			},
			{
				name: "twitter:description",
				content: "Track the International Space Station in real-time. View live ISS position, crew manifest, and orbital map.",
			},
		],
		links: [
			{
				rel: "canonical",
				href: "https://ephemeris.observer",
			},
		],
	}),
	component: InitializePage,
});
```

### Step 3: Add Metadata to ISS Tracker Route

**File**: `src/routes/iss/index.tsx`

Add a `head` function:

```tsx
export const Route = createFileRoute("/iss/")({
	head: () => ({
		title: "Live ISS Tracker - Ephemeris",
		meta: [
			{
				name: "description",
				content: "Real-time International Space Station tracking with 3D globe visualization, orbital paths, and live telemetry data.",
			},
			{
				property: "og:title",
				content: "Live ISS Tracker - Ephemeris",
			},
			{
				property: "og:description",
				content: "Real-time International Space Station tracking with 3D globe visualization, orbital paths, and live telemetry data.",
			},
			{
				property: "og:url",
				content: "https://ephemeris.observer/iss",
			},
			{
				name: "twitter:title",
				content: "Live ISS Tracker - Ephemeris",
			},
			{
				name: "twitter:description",
				content: "Real-time International Space Station tracking with 3D globe visualization, orbital paths, and live telemetry data.",
			},
		],
		links: [
			{
				rel: "canonical",
				href: "https://ephemeris.observer/iss",
			},
		],
	}),
	component: ISSIndexPage,
});
```

### Step 4: Add Metadata to Crew Route

**File**: `src/routes/iss/crew.tsx`

Add a `head` function:

```tsx
export const Route = createFileRoute("/iss/crew")({
	head: () => ({
		title: "ISS Crew Manifest - Ephemeris",
		meta: [
			{
				name: "description",
				content: "View the current International Space Station crew members, their roles, and mission details.",
			},
			{
				property: "og:title",
				content: "ISS Crew Manifest - Ephemeris",
			},
			{
				property: "og:description",
				content: "View the current International Space Station crew members, their roles, and mission details.",
			},
			{
				property: "og:url",
				content: "https://ephemeris.observer/iss/crew",
			},
			{
				name: "twitter:title",
				content: "ISS Crew Manifest - Ephemeris",
			},
			{
				name: "twitter:description",
				content: "View the current International Space Station crew members, their roles, and mission details.",
			},
		],
		links: [
			{
				rel: "canonical",
				href: "https://ephemeris.observer/iss/crew",
			},
		],
	}),
	component: CrewPage,
});
```

### Step 5: Add Metadata to Map Route

**File**: `src/routes/iss/map.tsx`

Add a `head` function:

```tsx
export const Route = createFileRoute("/iss/map")({
	head: () => ({
		title: "ISS Orbital Map - Ephemeris",
		meta: [
			{
				name: "description",
				content: "2D orbital map visualization of the International Space Station showing current position, orbital paths, and flyover predictions.",
			},
			{
				property: "og:title",
				content: "ISS Orbital Map - Ephemeris",
			},
			{
				property: "og:description",
				content: "2D orbital map visualization of the International Space Station showing current position, orbital paths, and flyover predictions.",
			},
			{
				property: "og:url",
				content: "https://ephemeris.observer/iss/map",
			},
			{
				name: "twitter:title",
				content: "ISS Orbital Map - Ephemeris",
			},
			{
				name: "twitter:description",
				content: "2D orbital map visualization of the International Space Station showing current position, orbital paths, and flyover predictions.",
			},
		],
		links: [
			{
				rel: "canonical",
				href: "https://ephemeris.observer/iss/map",
			},
		],
	}),
	component: MapPage,
});
```

### Step 6: Update Web App Manifest

**File**: `public/manifest.json`

Update with Ephemeris branding:

```json
{
  "short_name": "Ephemeris",
  "name": "Ephemeris - ISS Tracker",
  "icons": [
    {
      "src": "favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    },
    {
      "src": "logo192.png",
      "type": "image/png",
      "sizes": "192x192"
    },
    {
      "src": "logo512.png",
      "type": "image/png",
      "sizes": "512x512"
    }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#000000",
  "description": "Track the International Space Station in real-time"
}
```

### Step 7: Create Open Graph Image

**File**: `public/og-image.png`

Create a branded Open Graph image:
- Dimensions: 1200 x 630 pixels
- Format: PNG or JPG
- Content: Ephemeris logo/branding with ISS theme
- File size: Optimize for web (< 200KB recommended)

**Note**: This image will be used for all pages' Open Graph and Twitter Card previews.

### Step 8: Update Favicon

**File**: `public/favicon.ico`

Replace the default favicon with a custom Ephemeris-branded favicon:
- Format: ICO
- Sizes: 16x16, 32x32, 48x48 (multi-resolution ICO)
- Theme: ISS/space theme matching application branding

### Step 9: Performance Optimizations

#### 9.1: Optimize Open Graph Image

Ensure the Open Graph image is optimized:
- Use WebP format if possible (with PNG fallback)
- Compress image to reduce file size
- Ensure image loads quickly

#### 9.2: Verify Resource Loading

Check that resource hints are properly configured:
- Preconnect to external domains (already configured for Google Fonts)
- Ensure critical CSS loads first
- Verify code splitting is working (Globe component already lazy-loaded)

#### 9.3: Measure Performance

Use browser DevTools to measure Core Web Vitals:
- Open DevTools → Lighthouse tab
- Run performance audit
- Verify metrics meet targets:
  - FCP < 1.5s
  - LCP < 2.5s
  - TTI < 3.5s
  - INP < 200ms
  - CLS < 0.1

## Testing

### 1. Metadata Testing

**Browser Tab Titles**:
- Visit each route and verify the browser tab shows the correct title
- Titles should be unique per route

**Page Source Inspection**:
- View page source for each route
- Verify all meta tags are present in `<head>`
- Check that Open Graph and Twitter Card tags are correct

### 2. Social Media Testing

**Facebook Sharing Debugger**:
- Visit https://developers.facebook.com/tools/debug/
- Enter each page URL
- Verify Open Graph preview displays correctly

**Twitter Card Validator**:
- Visit https://cards-dev.twitter.com/validator
- Enter each page URL
- Verify Twitter Card preview displays correctly

**LinkedIn Post Inspector**:
- Visit https://www.linkedin.com/post-inspector/
- Enter each page URL
- Verify LinkedIn preview displays correctly

### 3. SEO Testing

**Google Search Console**:
- Submit sitemap (if applicable)
- Request indexing for each page
- Monitor for indexing issues

**Meta Tags Validation**:
- Use online meta tag validators
- Verify all required tags are present
- Check for any warnings or errors

### 4. Performance Testing

**Lighthouse Audit**:
- Run Lighthouse for each route
- Verify Core Web Vitals scores
- Check performance recommendations

**Network Throttling**:
- Test on 4G network throttling
- Verify metrics meet targets under throttled conditions
- Measure before and after optimizations

## Validation Checklist

- [ ] All routes have unique, descriptive titles
- [ ] All routes have meta descriptions (150-160 chars)
- [ ] All routes have Open Graph tags
- [ ] All routes have Twitter Card tags
- [ ] All routes have canonical URLs
- [ ] Open Graph image is accessible and displays correctly
- [ ] Favicon is updated and displays correctly
- [ ] Manifest.json is updated with Ephemeris branding
- [ ] Browser tab titles update correctly on navigation
- [ ] Social media previews display correctly
- [ ] Performance metrics meet targets
- [ ] No console errors or warnings

## Common Issues

### Issue: Metadata Not Updating on Client-Side Navigation

**Solution**: Ensure `head` function is properly defined in route file and returns the correct structure. TanStack Router automatically updates the head on route changes.

### Issue: Open Graph Image Not Displaying

**Solution**: 
- Verify image URL is absolute (includes domain)
- Ensure image is accessible via HTTPS
- Check image dimensions (1200x630px recommended)
- Test with Facebook Sharing Debugger

### Issue: Performance Metrics Not Meeting Targets

**Solution**:
- Profile with DevTools Performance tab
- Identify bottlenecks (large images, unoptimized scripts)
- Implement optimizations incrementally
- Re-measure after each change

## Next Steps

After completing this quickstart:

1. Review generated `data-model.md` for entity structures
2. Review `contracts/metadata-interfaces.ts` for TypeScript interfaces
3. Proceed to implementation tasks in `tasks.md` (generated by `/speckit.tasks`)

## References

- [TanStack Router - Document Head Management](https://tanstack.com/router/v1/docs/framework/react/guide/document-head-management)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Core Web Vitals](https://web.dev/vitals/)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
