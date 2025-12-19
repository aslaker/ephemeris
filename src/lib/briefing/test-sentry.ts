/**
 * Test Sentry Integration
 *
 * This file can be used to test if Sentry is working correctly.
 * Call testSentryCapture() from a server function to verify Sentry is initialized.
 */

import * as Sentry from "@sentry/tanstackstart-react";
import { ensureSentryInitialized } from "./sentry-init";

/**
 * Test function to verify Sentry is working
 * Call this from a server function to test Sentry capture
 */
export async function testSentryCapture(): Promise<{
	success: boolean;
	message: string;
}> {
	try {
		ensureSentryInitialized();

		// Try to capture a test message
		const testMessage = `Sentry test at ${new Date().toISOString()}`;
		Sentry.captureMessage(testMessage, {
			level: "info",
			tags: {
				test: "sentry_integration",
				environment:
					typeof process !== "undefined" ? "development" : "production",
			},
		});

		return {
			success: true,
			message: "Test message sent to Sentry. Check your Sentry dashboard.",
		};
	} catch (error) {
		const err = error instanceof Error ? error : new Error(String(error));
		return {
			success: false,
			message: `Failed to send test message: ${err.message}`,
		};
	}
}
