/**
 * Tests for ISS API Layer
 *
 * Focuses on defensive handling of undefined/malformed API responses
 * to prevent runtime errors like "Cannot read properties of undefined (reading 'filter')"
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Sentry before importing the module under test
vi.mock("@sentry/tanstackstart-react", () => ({
	startSpan: vi.fn((_opts, fn) => fn()),
	captureException: vi.fn(),
}));

// Mock the server function factory to return a controllable mock
const mockFetchCrewFromApi = vi.fn();

vi.mock("@tanstack/react-start", () => ({
	createServerFn: () => ({
		handler: () => mockFetchCrewFromApi,
	}),
}));

// Import after mocks are set up
import { fetchCrewData } from "./api";

describe("fetchCrewData", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("defensive null/undefined handling", () => {
		it("should handle undefined API response gracefully", async () => {
			mockFetchCrewFromApi.mockResolvedValue(undefined);

			const result = await fetchCrewData();

			expect(result).toEqual([]);
		});

		it("should handle null API response gracefully", async () => {
			mockFetchCrewFromApi.mockResolvedValue(null);

			const result = await fetchCrewData();

			expect(result).toEqual([]);
		});

		it("should handle response with undefined people array", async () => {
			mockFetchCrewFromApi.mockResolvedValue({
				message: "success",
				number: 0,
				people: undefined,
			});

			const result = await fetchCrewData();

			expect(result).toEqual([]);
		});

		it("should handle response with null people array", async () => {
			mockFetchCrewFromApi.mockResolvedValue({
				message: "success",
				number: 0,
				people: null,
			});

			const result = await fetchCrewData();

			expect(result).toEqual([]);
		});

		it("should handle response with empty people array", async () => {
			mockFetchCrewFromApi.mockResolvedValue({
				message: "success",
				number: 0,
				people: [],
			});

			const result = await fetchCrewData();

			expect(result).toEqual([]);
		});

		it("should handle response missing people property entirely", async () => {
			mockFetchCrewFromApi.mockResolvedValue({
				message: "success",
				number: 0,
			});

			const result = await fetchCrewData();

			expect(result).toEqual([]);
		});
	});

	describe("filtering ISS crew", () => {
		it("should filter only ISS crew members from mixed spacecraft", async () => {
			mockFetchCrewFromApi.mockResolvedValue({
				message: "success",
				number: 3,
				people: [
					{ name: "Astronaut 1", craft: "ISS" },
					{ name: "Astronaut 2", craft: "Tiangong" },
					{ name: "Astronaut 3", craft: "ISS" },
				],
			});

			const result = await fetchCrewData();

			expect(result).toHaveLength(2);
			expect(result.every((a) => a.craft === "ISS")).toBe(true);
		});

		it("should return empty array when no ISS crew present", async () => {
			mockFetchCrewFromApi.mockResolvedValue({
				message: "success",
				number: 2,
				people: [
					{ name: "Astronaut 1", craft: "Tiangong" },
					{ name: "Astronaut 2", craft: "Shenzhou" },
				],
			});

			const result = await fetchCrewData();

			expect(result).toEqual([]);
		});
	});

	describe("astronaut enrichment", () => {
		it("should enrich astronaut data with id and default values", async () => {
			mockFetchCrewFromApi.mockResolvedValue({
				message: "success",
				number: 1,
				people: [{ name: "Test Astronaut", craft: "ISS" }],
			});

			const result = await fetchCrewData();

			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				id: "test-astronaut",
				name: "Test Astronaut",
				craft: "ISS",
				role: "Astronaut",
				agency: "Unknown",
			});
		});

		it("should generate correct id from astronaut name with special characters", async () => {
			mockFetchCrewFromApi.mockResolvedValue({
				message: "success",
				number: 1,
				people: [{ name: "Dr. Jane O'Connor-Smith III", craft: "ISS" }],
			});

			const result = await fetchCrewData();

			expect(result).toHaveLength(1);
			// ID should be slugified: lowercase, alphanumeric with dashes
			expect(result[0].id).toBe("dr-jane-o-connor-smith-iii");
		});
	});

	describe("error propagation", () => {
		it("should propagate API errors to caller", async () => {
			const apiError = new Error("Network error");
			mockFetchCrewFromApi.mockRejectedValue(apiError);

			await expect(fetchCrewData()).rejects.toThrow("Network error");
		});

		it("should propagate timeout errors to caller", async () => {
			const timeoutError = new Error("Request timeout");
			mockFetchCrewFromApi.mockRejectedValue(timeoutError);

			await expect(fetchCrewData()).rejects.toThrow("Request timeout");
		});
	});
});
