/**
 * Copilot Utilities
 *
 * Language detection, sanitization, and rate limiting utilities.
 * Feature: 007-observation-copilot
 */

// No imports needed

// =============================================================================
// LANGUAGE DETECTION
// =============================================================================

/**
 * Check if text is likely non-English
 * Uses character range detection and non-ASCII ratio
 */
export function isLikelyNonEnglish(text: string): boolean {
	// Check for scripts that are clearly non-Latin
	const nonLatinRegex =
		/[\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/;
	if (nonLatinRegex.test(text)) return true;

	// Check ratio of non-ASCII characters
	if (text.length <= 10) return false; // Too short to determine

	// biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional ASCII range check
	const nonAscii = text.replace(/[\x00-\x7F]/g, "").length;
	return nonAscii / text.length > 0.3;
}

// =============================================================================
// DATA SANITIZATION
// =============================================================================

/**
 * Sanitize data before logging to Sentry
 * - Hash IDs with consistent salt
 * - Round coordinates to 1 decimal place
 * - Redact PII patterns (emails, phones)
 */
export function sanitizeForLogging(data: unknown): unknown {
	if (typeof data !== "object" || data === null) {
		return sanitizeString(String(data));
	}

	if (Array.isArray(data)) {
		return data.map(sanitizeForLogging);
	}

	const sanitized: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(data)) {
		// Hash IDs
		if (key.toLowerCase().includes("id") && typeof value === "string") {
			sanitized[key] = hashId(value);
		}
		// Round coordinates
		else if (
			(key === "lat" ||
				key === "lng" ||
				key === "latitude" ||
				key === "longitude") &&
			typeof value === "number"
		) {
			sanitized[key] = Math.round(value * 10) / 10;
		}
		// Sanitize strings
		else if (typeof value === "string") {
			sanitized[key] = sanitizeString(value);
		}
		// Recursively sanitize objects
		else if (typeof value === "object" && value !== null) {
			sanitized[key] = sanitizeForLogging(value);
		}
		// Keep primitives as-is
		else {
			sanitized[key] = value;
		}
	}
	return sanitized;
}

/**
 * Sanitize string content - redact PII patterns
 */
function sanitizeString(text: string): string {
	// Redact email patterns
	text = text.replace(
		/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
		"[EMAIL_REDACTED]",
	);

	// Redact phone patterns (US format)
	text = text.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[PHONE_REDACTED]");

	return text;
}

/**
 * Hash an ID with consistent salt
 */
function hashId(id: string): string {
	// Simple hash function - in production, use crypto.subtle
	let hash = 0;
	const salt = "ephemeris-copilot-salt-2025";
	const combined = salt + id;
	for (let i = 0; i < combined.length; i++) {
		const char = combined.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return `hash_${Math.abs(hash).toString(16)}`;
}

// =============================================================================
// REQUEST QUEUE
// =============================================================================

/**
 * Request queue for rate limiting
 * Manages concurrent requests with configurable limits
 */
export class RequestQueue {
	private active = 0;
	private queue: Array<() => Promise<void>> = [];
	private readonly MAX_CONCURRENT = 3;
	private readonly MAX_QUEUED = 5;

	/**
	 * Check if a new request can be enqueued
	 */
	canEnqueue(): boolean {
		return this.queue.length < this.MAX_QUEUED;
	}

	/**
	 * Get current queue state
	 */
	getState(): { activeCount: number; queuedCount: number } {
		return {
			activeCount: this.active,
			queuedCount: this.queue.length,
		};
	}

	/**
	 * Enqueue a request function
	 * Returns immediately if under concurrent limit, otherwise queues
	 */
	async enqueue<T>(fn: () => Promise<T>): Promise<T> {
		if (this.active < this.MAX_CONCURRENT) {
			return this.execute(fn);
		}

		if (!this.canEnqueue()) {
			throw new Error("RATE_LIMIT_EXCEEDED");
		}

		return new Promise<T>((resolve, reject) => {
			this.queue.push(async () => {
				try {
					resolve(await this.execute(fn));
				} catch (e) {
					reject(e);
				}
			});
			this.processQueue();
		});
	}

	/**
	 * Execute a function and track active count
	 */
	private async execute<T>(fn: () => Promise<T>): Promise<T> {
		this.active++;
		try {
			return await fn();
		} finally {
			this.active--;
			this.processQueue();
		}
	}

	/**
	 * Process queued requests when capacity is available
	 */
	private processQueue(): void {
		if (this.queue.length > 0 && this.active < this.MAX_CONCURRENT) {
			const next = this.queue.shift();
			next?.();
		}
	}
}
