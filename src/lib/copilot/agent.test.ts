/**
 * Tests for Copilot Agent Error Handling
 *
 * Focuses on defensive handling of AI binding errors, response parsing,
 * and graceful error responses instead of crashes.
 *
 * TODO: These tests need to be updated for AI SDK v6 migration
 * - Tests were written for @cloudflare/ai-utils (deprecated)
 * - Need to update mocks for new generateText + stepCountIs API
 * - Need to test Durable Object CopilotAgent class
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock Sentry before importing the module under test
vi.mock("@sentry/tanstackstart-react", () => ({
	startSpan: vi.fn((_opts, fn) => fn()),
	addBreadcrumb: vi.fn(),
	captureException: vi.fn(),
	captureMessage: vi.fn(),
}));

// Mock Sentry init
vi.mock("../briefing/sentry-init", () => ({
	ensureSentryInitialized: vi.fn(),
}));

// Mock the Cloudflare AI utils
const mockRunWithTools = vi.fn();
vi.mock("@cloudflare/ai-utils", () => ({
	runWithTools: (...args: unknown[]) => mockRunWithTools(...args),
}));

// Mock Cloudflare workers env - this is the key for testing binding errors
let mockEnv: { AI?: unknown } = {};
vi.mock("cloudflare:workers", () => ({
	get env() {
		return mockEnv;
	},
}));

// Mock crypto.randomUUID for consistent test output
vi.stubGlobal("crypto", {
	randomUUID: () => "test-uuid-1234",
});

// Mock the server function factory to return a controllable function
let handlerFn: ((args: { data: unknown }) => Promise<unknown>) | null = null;
vi.mock("@tanstack/react-start", () => ({
	createServerFn: () => ({
		inputValidator: () => ({
			handler: (fn: (args: { data: unknown }) => Promise<unknown>) => {
				handlerFn = fn;
				return fn;
			},
		}),
	}),
}));

// Mock the external dependencies
vi.mock("../briefing/weather", () => ({
	getWeatherForPass: vi.fn().mockResolvedValue({
		cloudCover: 20,
		visibility: 10000,
		isFavorable: true,
	}),
}));

vi.mock("../iss/api", () => ({
	fetchISSPosition: vi.fn().mockResolvedValue({
		latitude: 45.5,
		longitude: -122.6,
		altitude: 420,
		velocity: 7.66,
		visibility: "daylight",
		timestamp: 1704067200,
	}),
	fetchTLE: vi.fn().mockResolvedValue(["TLE Line 1", "TLE Line 2"]),
}));

vi.mock("../iss/orbital", () => ({
	predictPasses: vi.fn().mockReturnValue([
		{
			id: "pass-1",
			startTime: new Date("2024-01-15T20:00:00Z"),
			endTime: new Date("2024-01-15T20:06:00Z"),
			maxElevation: 65,
			quality: "excellent",
		},
	]),
}));

// Import after mocks are set up
// import { chatCompletion } from "./agent"; // TODO: Re-enable when tests are updated for AI SDK v6
import * as Sentry from "@sentry/tanstackstart-react";

// Helper to create valid request data
function createTestRequest(
	overrides: Partial<{
		message: string;
		conversationContext: { messages: Array<{ role: string; content: string }> };
		location: { lat: number; lng: number } | null;
	}> = {},
) {
	return {
		message: overrides.message ?? "When is the next ISS pass?",
		conversationContext: overrides.conversationContext ?? { messages: [] },
		location: overrides.location ?? { lat: 45.5, lng: -122.6 },
	};
}

describe.skip("chatCompletion", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset env to have AI binding by default
		mockEnv = { AI: { run: vi.fn() } };
		// Reset mock to return successful response
		mockRunWithTools.mockResolvedValue({
			response: "The next ISS pass is tonight at 8pm.",
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("AI binding validation", () => {
		it("should return error when AI binding is undefined", async () => {
			mockEnv = { AI: undefined };

			const result = await handlerFn?.({
				data: createTestRequest(),
			});

			expect(result).toEqual({
				status: "error",
				error: {
					code: "AI_BINDING_MISSING",
					message:
						"AI service is not configured. Please ensure the AI binding is set up in wrangler.jsonc.",
				},
			});
			expect(Sentry.captureMessage).toHaveBeenCalledWith(
				"AI binding is undefined in copilot agent",
				expect.objectContaining({
					level: "warning",
					tags: { copilot: "missing_binding", binding: "AI" },
				}),
			);
		});

		it("should return error when AI binding is null", async () => {
			mockEnv = { AI: null };

			const result = await handlerFn?.({
				data: createTestRequest(),
			});

			expect(result).toEqual({
				status: "error",
				error: {
					code: "AI_BINDING_MISSING",
					message:
						"AI service is not configured. Please ensure the AI binding is set up in wrangler.jsonc.",
				},
			});
		});

		it("should add breadcrumb when AI binding is missing", async () => {
			mockEnv = { AI: undefined };

			await handlerFn?.({
				data: createTestRequest(),
			});

			expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
				expect.objectContaining({
					message: "AI binding not available",
					category: "copilot",
					level: "warning",
				}),
			);
		});
	});

	describe("AI binding access errors", () => {
		it("should handle env.AI access throwing an error", async () => {
			// Override the mock to throw when AI is accessed
			mockEnv = {};
			Object.defineProperty(mockEnv, "AI", {
				get() {
					throw new Error("Binding not available in this context");
				},
			});

			const result = await handlerFn?.({
				data: createTestRequest(),
			});

			expect(result).toEqual({
				status: "error",
				error: {
					code: "BINDING_ACCESS_ERROR",
					message:
						"Unable to access AI service. The service may not be properly configured.",
				},
			});
			expect(Sentry.captureException).toHaveBeenCalledWith(
				expect.any(Error),
				expect.objectContaining({
					tags: { copilot: "binding_access_error", binding: "AI" },
				}),
			);
		});
	});

	describe("AI service errors", () => {
		it("should return rate limit error when AI service is rate limited", async () => {
			mockRunWithTools.mockRejectedValue(new Error("rate limit exceeded"));

			const result = await handlerFn?.({
				data: createTestRequest(),
			});

			expect(result).toEqual({
				status: "error",
				error: {
					code: "AI_RATE_LIMITED",
					message:
						"The AI service is currently busy. Please wait a moment and try again.",
				},
			});
			expect(Sentry.captureException).toHaveBeenCalledWith(
				expect.any(Error),
				expect.objectContaining({
					tags: { copilot: "ai_rate_limited" },
				}),
			);
		});

		it("should return model error when AI model fails", async () => {
			mockRunWithTools.mockRejectedValue(new Error("model inference failed"));

			const result = await handlerFn?.({
				data: createTestRequest(),
			});

			expect(result).toEqual({
				status: "error",
				error: {
					code: "AI_MODEL_ERROR",
					message: "The AI model encountered an issue. Please try again later.",
				},
			});
			expect(Sentry.captureException).toHaveBeenCalledWith(
				expect.any(Error),
				expect.objectContaining({
					tags: { copilot: "ai_model_error" },
				}),
			);
		});

		it("should return generic AI error for unknown AI failures", async () => {
			mockRunWithTools.mockRejectedValue(new Error("Something went wrong"));

			const result = await handlerFn?.({
				data: createTestRequest(),
			});

			expect(result).toEqual({
				status: "error",
				error: {
					code: "AI_GENERATION_FAILED",
					message: "Failed to generate a response. Please try again.",
				},
			});
			expect(Sentry.captureException).toHaveBeenCalledWith(
				expect.any(Error),
				expect.objectContaining({
					tags: { copilot: "ai_generation_failed" },
				}),
			);
		});
	});

	describe("response parsing", () => {
		it("should extract response from standard format", async () => {
			mockRunWithTools.mockResolvedValue({
				response: "Here is your ISS pass information.",
			});

			const result = await handlerFn?.({
				data: createTestRequest(),
			});

			expect(result).toEqual({
				status: "success",
				message: {
					id: "test-uuid-1234",
					role: "assistant",
					content: "Here is your ISS pass information.",
					timestamp: expect.any(Number),
				},
			});
		});

		it("should extract response from string format", async () => {
			mockRunWithTools.mockResolvedValue("Direct string response");

			const result = await handlerFn?.({
				data: createTestRequest(),
			});

			expect(result).toEqual({
				status: "success",
				message: {
					id: "test-uuid-1234",
					role: "assistant",
					content: "Direct string response",
					timestamp: expect.any(Number),
				},
			});
		});

		it("should handle null response gracefully", async () => {
			mockRunWithTools.mockResolvedValue(null);

			const result = await handlerFn?.({
				data: createTestRequest(),
			});

			expect(result).toEqual({
				status: "success",
				message: {
					id: "test-uuid-1234",
					role: "assistant",
					content:
						"I apologize, but I couldn't generate a response. Please try again.",
					timestamp: expect.any(Number),
				},
			});
			expect(Sentry.captureException).toHaveBeenCalledWith(
				expect.any(Error),
				expect.objectContaining({
					tags: { copilot: "response_parse_error" },
				}),
			);
		});

		it("should handle undefined response gracefully", async () => {
			mockRunWithTools.mockResolvedValue(undefined);

			const result = await handlerFn?.({
				data: createTestRequest(),
			});

			expect(result).toEqual({
				status: "success",
				message: {
					id: "test-uuid-1234",
					role: "assistant",
					content:
						"I apologize, but I couldn't generate a response. Please try again.",
					timestamp: expect.any(Number),
				},
			});
		});

		it("should handle empty object response gracefully", async () => {
			mockRunWithTools.mockResolvedValue({});

			const result = await handlerFn?.({
				data: createTestRequest(),
			});

			expect(result).toEqual({
				status: "success",
				message: {
					id: "test-uuid-1234",
					role: "assistant",
					content:
						"I apologize, but I couldn't generate a response. Please try again.",
					timestamp: expect.any(Number),
				},
			});
		});

		it("should extract content from nested response format", async () => {
			mockRunWithTools.mockResolvedValue({
				response: {
					message: {
						content: "Nested content response",
					},
				},
			});

			const result = await handlerFn?.({
				data: createTestRequest(),
			});

			expect(result).toEqual({
				status: "success",
				message: {
					id: "test-uuid-1234",
					role: "assistant",
					content: "Nested content response",
					timestamp: expect.any(Number),
				},
			});
		});
	});

	describe("error categorization in outer catch", () => {
		it("should categorize binding errors correctly", async () => {
			// This tests the outer catch block by throwing after AI is accessed
			mockEnv = { AI: { run: vi.fn() } };
			mockRunWithTools.mockImplementation(() => {
				throw new Error("Failed to access binding in production");
			});

			const result = await handlerFn?.({
				data: createTestRequest(),
			});

			// Since the error contains "binding", it should be categorized appropriately
			// Note: This goes through the AI generation failed path first
			expect(result).toHaveProperty("status", "error");
		});

		it("should categorize network errors correctly", async () => {
			// Network errors in the outer try-catch should be categorized
			mockRunWithTools.mockImplementation(() => {
				const err = new Error("network connection failed");
				throw err;
			});

			const result = await handlerFn?.({
				data: createTestRequest(),
			});

			expect(result).toHaveProperty("status", "error");
			expect(result).toHaveProperty("error.code", "AI_GENERATION_FAILED");
		});
	});

	describe("successful completion", () => {
		it("should return success with properly formatted message", async () => {
			mockRunWithTools.mockResolvedValue({
				response: "The ISS is currently over the Pacific Ocean.",
			});

			const result = await handlerFn?.({
				data: createTestRequest(),
			});

			expect(result).toEqual({
				status: "success",
				message: {
					id: "test-uuid-1234",
					role: "assistant",
					content: "The ISS is currently over the Pacific Ocean.",
					timestamp: expect.any(Number),
				},
			});
		});

		it("should add success breadcrumb on completion", async () => {
			mockRunWithTools.mockResolvedValue({
				response: "Success response",
			});

			await handlerFn?.({
				data: createTestRequest(),
			});

			expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
				expect.objectContaining({
					message: "Chat completion successful",
					level: "info",
				}),
			);
		});

		it("should pass conversation context to AI", async () => {
			const request = createTestRequest({
				conversationContext: {
					messages: [
						{ role: "user", content: "Previous message" },
						{ role: "assistant", content: "Previous response" },
					],
				},
			});

			await handlerFn?.({ data: request });

			expect(mockRunWithTools).toHaveBeenCalledWith(
				expect.anything(),
				"@cf/meta/llama-3.1-8b-instruct",
				expect.objectContaining({
					messages: expect.arrayContaining([
						expect.objectContaining({ role: "system" }),
						expect.objectContaining({
							role: "user",
							content: "Previous message",
						}),
						expect.objectContaining({
							role: "assistant",
							content: "Previous response",
						}),
						expect.objectContaining({
							role: "user",
							content: "When is the next ISS pass?",
						}),
					]),
				}),
			);
		});
	});

	describe("request logging", () => {
		it("should add entry breadcrumb with request metadata", async () => {
			const request = createTestRequest({
				message: "Test message",
				conversationContext: { messages: [{ role: "user", content: "prev" }] },
				location: { lat: 45.5, lng: -122.6 },
			});

			await handlerFn?.({ data: request });

			expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
				expect.objectContaining({
					message: "Copilot chat request received",
					category: "copilot",
					level: "info",
					data: {
						messageLength: 12,
						contextMessageCount: 1,
						hasLocation: true,
					},
				}),
			);
		});

		it("should add breadcrumb before calling runWithTools", async () => {
			await handlerFn?.({
				data: createTestRequest(),
			});

			expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
				expect.objectContaining({
					message: "Calling runWithTools",
					category: "copilot",
					level: "info",
					data: expect.objectContaining({
						model: "@cf/meta/llama-3.1-8b-instruct",
						toolCount: 5,
					}),
				}),
			);
		});
	});
});

describe.skip("Tool function error handling", () => {
	// These tests verify that tool functions handle errors gracefully
	// and return error JSON instead of throwing

	beforeEach(() => {
		vi.clearAllMocks();
		mockEnv = { AI: { run: vi.fn() } };
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should have 5 tools registered", async () => {
		// Capture the tools passed to runWithTools
		mockRunWithTools.mockImplementation((_ai, _model, options) => {
			expect(options.tools).toHaveLength(5);
			expect(options.tools.map((t: { name: string }) => t.name)).toEqual([
				"get_iss_position",
				"get_upcoming_passes",
				"get_pass_weather",
				"get_user_location",
				"search_knowledge_base",
			]);
			return { response: "Test" };
		});

		await handlerFn?.({
			data: createTestRequest(),
		});

		expect(mockRunWithTools).toHaveBeenCalled();
	});

	it("should pass location to get_user_location tool", async () => {
		const location = { lat: 45.5, lng: -122.6 };
		let capturedTools: Array<{
			name: string;
			function: () => Promise<string>;
		}> = [];

		mockRunWithTools.mockImplementation((_ai, _model, options) => {
			capturedTools = options.tools;
			return { response: "Test" };
		});

		await handlerFn?.({
			data: createTestRequest({ location }),
		});

		// Find and call the get_user_location tool
		const userLocationTool = capturedTools.find(
			(t) => t.name === "get_user_location",
		);
		expect(userLocationTool).toBeDefined();

		const result = JSON.parse(await userLocationTool?.function());
		expect(result).toEqual({
			available: true,
			coordinates: { lat: 45.5, lng: -122.6 },
		});
	});

	it("should handle missing user location gracefully", async () => {
		let capturedTools: Array<{
			name: string;
			function: () => Promise<string>;
		}> = [];

		mockRunWithTools.mockImplementation((_ai, _model, options) => {
			capturedTools = options.tools;
			return { response: "Test" };
		});

		await handlerFn?.({
			data: createTestRequest({ location: null }),
		});

		const userLocationTool = capturedTools.find(
			(t) => t.name === "get_user_location",
		);
		expect(userLocationTool).toBeDefined();
		const result = JSON.parse(await userLocationTool?.function());

		expect(result).toEqual({
			available: false,
			message:
				"No location saved. Please set your location to get personalized pass predictions.",
		});
	});
});
