/**
 * Metadata Configuration Contracts
 * 
 * This file defines TypeScript interfaces for route-level metadata configuration
 * used in TanStack Start route definitions.
 * 
 * These interfaces ensure type safety and consistency across all route metadata
 * configurations.
 */

/**
 * Basic meta tag configuration
 */
export interface MetaTag {
	name?: string;
	property?: string;
	content: string;
	charSet?: string;
	httpEquiv?: string;
}

/**
 * Link tag configuration (for favicon, canonical, etc.)
 */
export interface LinkTag {
	rel: string;
	href: string;
	crossOrigin?: string;
	type?: string;
	sizes?: string;
}

/**
 * TanStack Start route head configuration
 * 
 * This is the structure returned by the `head` function in route definitions.
 * TanStack Start uses this to render the document head server-side and update
 * it client-side during navigation.
 */
export interface RouteHeadConfig {
	title?: string;
	meta?: MetaTag[];
	links?: LinkTag[];
	styles?: Array<{
		media?: string;
		children: string;
	}>;
	scripts?: Array<{
		src?: string;
		children?: string;
	}>;
}

/**
 * Page metadata configuration for a route
 * 
 * This represents the structured metadata for a single page/route.
 * Used internally to generate the RouteHeadConfig.
 */
export interface PageMetadataConfig {
	// Basic SEO
	title: string;
	description: string;
	canonicalUrl: string;
	
	// Open Graph
	ogTitle: string;
	ogDescription: string;
	ogImage: string;
	ogUrl: string;
	ogType: 'website' | 'article';
	ogSiteName: string;
	
	// Twitter Cards
	twitterCard: 'summary' | 'summary_large_image';
	twitterTitle: string;
	twitterDescription: string;
	twitterImage: string;
	
	// SEO Control
	robots?: string;
}

/**
 * Helper function to convert PageMetadataConfig to RouteHeadConfig
 * 
 * This utility function generates the TanStack Start head configuration
 * from a structured metadata object.
 */
export function createRouteHeadConfig(
	config: PageMetadataConfig,
	baseUrl: string = 'https://ephemeris.observer'
): RouteHeadConfig {
	const meta: MetaTag[] = [
		// Basic SEO
		{ name: 'description', content: config.description },
		{ name: 'robots', content: config.robots || 'index, follow' },
		
		// Open Graph
		{ property: 'og:title', content: config.ogTitle },
		{ property: 'og:description', content: config.ogDescription },
		{ property: 'og:image', content: config.ogImage },
		{ property: 'og:url', content: config.ogUrl },
		{ property: 'og:type', content: config.ogType },
		{ property: 'og:site_name', content: config.ogSiteName },
		
		// Twitter Cards
		{ name: 'twitter:card', content: config.twitterCard },
		{ name: 'twitter:title', content: config.twitterTitle },
		{ name: 'twitter:description', content: config.twitterDescription },
		{ name: 'twitter:image', content: config.twitterImage },
	];
	
	const links: LinkTag[] = [
		{ rel: 'canonical', href: config.canonicalUrl },
	];
	
	return {
		title: config.title,
		meta,
		links,
	};
}

/**
 * Route metadata configurations
 * 
 * Pre-defined metadata for each route in the application.
 * These can be used to generate route head configurations.
 */
export const routeMetadata: Record<string, Omit<PageMetadataConfig, 'canonicalUrl' | 'ogUrl'>> = {
	'/': {
		title: 'Ephemeris - ISS Tracker',
		description: 'Track the International Space Station in real-time. View live ISS position, crew manifest, and orbital map.',
		ogTitle: 'Ephemeris - ISS Tracker',
		ogDescription: 'Track the International Space Station in real-time. View live ISS position, crew manifest, and orbital map.',
		ogImage: '/og-image.png',
		ogType: 'website',
		ogSiteName: 'Ephemeris',
		twitterCard: 'summary_large_image',
		twitterTitle: 'Ephemeris - ISS Tracker',
		twitterDescription: 'Track the International Space Station in real-time. View live ISS position, crew manifest, and orbital map.',
		twitterImage: '/og-image.png',
	},
	'/iss': {
		title: 'Live ISS Tracker - Ephemeris',
		description: 'Real-time International Space Station tracking with 3D globe visualization, orbital paths, and live telemetry data.',
		ogTitle: 'Live ISS Tracker - Ephemeris',
		ogDescription: 'Real-time International Space Station tracking with 3D globe visualization, orbital paths, and live telemetry data.',
		ogImage: '/og-image.png',
		ogType: 'website',
		ogSiteName: 'Ephemeris',
		twitterCard: 'summary_large_image',
		twitterTitle: 'Live ISS Tracker - Ephemeris',
		twitterDescription: 'Real-time International Space Station tracking with 3D globe visualization, orbital paths, and live telemetry data.',
		twitterImage: '/og-image.png',
	},
	'/iss/crew': {
		title: 'ISS Crew Manifest - Ephemeris',
		description: 'View the current International Space Station crew members, their roles, and mission details.',
		ogTitle: 'ISS Crew Manifest - Ephemeris',
		ogDescription: 'View the current International Space Station crew members, their roles, and mission details.',
		ogImage: '/og-image.png',
		ogType: 'website',
		ogSiteName: 'Ephemeris',
		twitterCard: 'summary_large_image',
		twitterTitle: 'ISS Crew Manifest - Ephemeris',
		twitterDescription: 'View the current International Space Station crew members, their roles, and mission details.',
		twitterImage: '/og-image.png',
	},
	'/iss/map': {
		title: 'ISS Orbital Map - Ephemeris',
		description: '2D orbital map visualization of the International Space Station showing current position, orbital paths, and flyover predictions.',
		ogTitle: 'ISS Orbital Map - Ephemeris',
		ogDescription: '2D orbital map visualization of the International Space Station showing current position, orbital paths, and flyover predictions.',
		ogImage: '/og-image.png',
		ogType: 'website',
		ogSiteName: 'Ephemeris',
		twitterCard: 'summary_large_image',
		twitterTitle: 'ISS Orbital Map - Ephemeris',
		twitterDescription: '2D orbital map visualization of the International Space Station showing current position, orbital paths, and flyover predictions.',
		twitterImage: '/og-image.png',
	},
};

/**
 * Performance optimization configuration
 */
export interface PerformanceConfig {
	imageOptimization: {
		format: 'webp' | 'avif' | 'png' | 'jpg';
		lazyLoad: boolean;
		responsive: boolean;
	};
	resourceHints: {
		preconnect: string[];
		preload: string[];
		prefetch: string[];
	};
	codeSplitting: {
		enabled: boolean;
		chunkSize: number; // KB
	};
}

/**
 * Default performance configuration
 */
export const defaultPerformanceConfig: PerformanceConfig = {
	imageOptimization: {
		format: 'webp',
		lazyLoad: true,
		responsive: true,
	},
	resourceHints: {
		preconnect: ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
		preload: [],
		prefetch: [],
	},
	codeSplitting: {
		enabled: true,
		chunkSize: 200, // KB
	},
};