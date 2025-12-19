/**
 * Sentry Initialization Utility for Server-Side (Cloudflare Workers)
 *
 * Uses @sentry/cloudflare for server-side error tracking in Cloudflare Workers.
 * Client-side should continue using @sentry/tanstackstart-react.
 */

// import { env } from "cloudflare:workers";
// Use @sentry/tanstackstart-react for server-side as it's designed for TanStack Start
// @sentry/cloudflare requires withSentry wrapper which doesn't work with TanStack Start's managed entry point
import * as Sentry from "@sentry/tanstackstart-react";

let initialized = false;

/**
 * Ensure Sentry is initialized for server-side use in Cloudflare Workers
 * This function is idempotent - safe to call multiple times
 */
export function ensureSentryInitialized(): void {
	if (initialized) {
		return;
	}

	// Try to get DSN from various sources
	// Note: For server-side in Cloudflare Workers, use SENTRY_DSN (runtime)
	const envObj = (typeof process !== "undefined"
		? process.env
		: {}) as unknown as {
		SENTRY_DSN?: string;
		VITE_SENTRY_DSN?: string;
	};
	const dsn =
		// Cloudflare Workers env - prefer SENTRY_DSN for server-side runtime
		envObj?.SENTRY_DSN ||
		envObj?.VITE_SENTRY_DSN ||
		// import.meta.env (build-time, Vite)
		(typeof import.meta !== "undefined" && import.meta.env?.VITE_SENTRY_DSN) ||
		// process.env (Node.js, local dev)
		process?.env?.SENTRY_DSN ||
		process?.env?.VITE_SENTRY_DSN ||
		undefined;

	// Debug logging (will appear in Cloudflare logs)
	console.error(
		"[Sentry Init] Checking DSN availability:",
		JSON.stringify({
			hasEnvSentryDsn: !!envObj?.SENTRY_DSN,
			hasEnvViteSentryDsn: !!envObj?.VITE_SENTRY_DSN,
			hasImportMetaEnv: !!(
				typeof import.meta !== "undefined" && import.meta.env?.VITE_SENTRY_DSN
			),
			hasProcessEnv: !!process?.env?.SENTRY_DSN,
			hasProcessViteEnv: !!process?.env?.VITE_SENTRY_DSN,
			dsnFound: !!dsn,
			dsnLength: dsn?.length || 0,
			dsnPrefix: dsn ? `${dsn.substring(0, 20)}...` : "none",
		}),
	);

	if (!dsn) {
		console.error(
			"[Sentry Init] ERROR: Sentry DSN not found. Sentry error tracking will not work.",
		);
		initialized = true; // Mark as initialized to avoid repeated warnings
		return;
	}

	try {
		// Initialize @sentry/tanstackstart-react for server-side
		// This package is designed for TanStack Start and should work server-side
		// Note: It may need nodejs_compat flag which is already set in wrangler.jsonc
		if (typeof Sentry.init === "function") {
			Sentry.init({
				dsn,
				sendDefaultPii: true,
				tracesSampleRate: 1.0,
				environment:
					typeof process !== "undefined" ? "development" : "production",
			});
			console.error(
				"[Sentry Init] @sentry/tanstackstart-react initialized successfully",
			);
		} else {
			console.error(
				"[Sentry Init] Sentry.init is not a function - SDK may not be compatible",
			);
		}
		initialized = true;
	} catch (error) {
		console.error("[Sentry Init] Failed to initialize Sentry:", error);
		initialized = true; // Mark as initialized to avoid repeated errors
	}
}
