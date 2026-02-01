import type { GoogleGenerativeAI } from "@google/generative-ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleGenAiCachedContentService } from "../cache/cached.content.service";
import { CachedContentException } from "../cache/cached.content.types";

vi.mock("@google/generative-ai");
vi.mock("@google/generative-ai/server", () => {
	return {
		GoogleAICacheManager: class {
			create = vi.fn();
			get = vi.fn();
			update = vi.fn();
			delete = vi.fn();
			list = vi.fn();
		},
	};
});

describe("GoogleGenAiCachedContentService", () => {
	let service: GoogleGenAiCachedContentService;
	let mockClient: GoogleGenerativeAI;
	let mockCacheManager: {
		create: ReturnType<typeof vi.fn>;
		get: ReturnType<typeof vi.fn>;
		update: ReturnType<typeof vi.fn>;
		delete: ReturnType<typeof vi.fn>;
		list: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		mockClient = {
			apiKey: "test-api-key",
			getCachedContentManager: vi.fn(),
		} as unknown as GoogleGenerativeAI;

		service = new GoogleGenAiCachedContentService(mockClient);
		mockCacheManager = (
			service as unknown as { cacheManager: typeof mockCacheManager }
		).cacheManager;
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	it("should create cached content", async () => {
		const mockContent = {
			name: "cached-content/123",
			displayName: "test-cache",
			model: "models/gemini-pro",
		};

		mockCacheManager.create.mockResolvedValue(mockContent);

		const result = await service.create({
			model: "models/gemini-pro",
			contents: [],
		});

		expect(mockCacheManager.create).toHaveBeenCalled();
		expect(result.name).toBe("cached-content/123");
	});

	it("should handle create errors", async () => {
		mockCacheManager.create.mockRejectedValue(new Error("API Error"));

		await expect(
			service.create({
				model: "models/gemini-pro",
			}),
		).rejects.toThrow(CachedContentException);
	});

	it("should list all cached contents", async () => {
		mockCacheManager.list
			.mockResolvedValueOnce({
				cachedContents: [{ name: "page1" }],
				nextPageToken: "token1",
			})
			.mockResolvedValueOnce({
				cachedContents: [{ name: "page2" }],
				nextPageToken: undefined,
			});

		const result = await service.listAll();

		expect(result).toHaveLength(2);
		expect(result[0].name).toBe("page1");
		expect(result[1].name).toBe("page2");
		expect(mockCacheManager.list).toHaveBeenCalledTimes(2);
	});
});
