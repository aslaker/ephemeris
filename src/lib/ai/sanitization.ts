import { SANITIZATION_RULES } from "../../../specs/008-tanstack-ai-migration/contracts/api-interfaces";

/**
 * Data sanitization utility for protecting sensitive information
 *
 * @see FR-018: Data sanitization requirements
 */

/**
 * Sanitizes a value based on defined rules
 */
export function sanitizeData<T>(
	data: T,
	context: "logging" | "sentry" | "ai_prompt" = "logging",
): T {
	if (!data || typeof data !== "object") {
		return data;
	}

	const result = { ...data } as any;

	for (const rule of SANITIZATION_RULES) {
		if (rule.contexts.includes(context)) {
			const path = rule.fieldPath.split(".");
			applyRule(result, path, rule.action);
		}
	}

	return result as T;
}

/**
 * Recursively applies a sanitization rule to a nested object
 */
function applyRule(
	obj: any,
	path: string[],
	action: "redact" | "mask" | "exclude",
): void {
	if (!obj || typeof obj !== "object") return;

	const key = path[0];
	if (path.length === 1) {
		if (key in obj) {
			switch (action) {
				case "redact":
					obj[key] = "[REDACTED]";
					break;
				case "mask":
					obj[key] = "****";
					break;
				case "exclude":
					delete obj[key];
					break;
			}
		}
	} else {
		if (key in obj) {
			applyRule(obj[key], path.slice(1), action);
		}
	}
}
