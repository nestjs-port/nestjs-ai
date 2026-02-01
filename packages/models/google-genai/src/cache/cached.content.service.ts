import type { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAICacheManager } from "@google/generative-ai/server";
import {
	CachedContentException,
	type CachedContentPage,
	type CachedContentRequest,
	type CachedContentUpdateRequest,
	type GoogleGenAiCachedContent,
} from "./cached.content.types";

/**
 * Service for managing cached content in Google GenAI.
 * Allows creating, retrieving, updating, deleting, and listing cached content.
 */
export class GoogleGenAiCachedContentService {
	private readonly cacheManager: GoogleAICacheManager;

	/**
	 * Create a new GoogleGenAiCachedContentService instance.
	 * @param client - Google GenAI SDK client
	 */
	constructor(client: GoogleGenerativeAI) {
		const apiKey = (client as any).apiKey;
		if (!apiKey) {
			throw new Error("Google GenAI client must have an API key");
		}
		this.cacheManager = new GoogleAICacheManager(apiKey);
	}

	/**
	 * Create new cached content.
	 * @param request - Request object containing content and configuration
	 * @returns Created cached content
	 * @throws CachedContentException if creation fails
	 */
	async create(
		request: CachedContentRequest,
	): Promise<GoogleGenAiCachedContent> {
		try {
			const response = await this.cacheManager.create(request as any);
			return this.toCachedContent(response);
		} catch (error) {
			throw new CachedContentException(
				"Failed to create cached content",
				error,
			);
		}
	}

	/**
	 * Get cached content by name.
	 * @param name - Resource name of the cached content
	 * @returns Cached content or null if not found
	 * @throws CachedContentException if retrieval fails (other than 404)
	 */
	async get(name: string): Promise<GoogleGenAiCachedContent | null> {
		try {
			const response = await this.cacheManager.get(name);
			return this.toCachedContent(response);
		} catch (error: any) {
			if (error.status === 404 || error.message?.includes("not found")) {
				return null;
			}
			throw new CachedContentException(
				`Failed to get cached content: ${name}`,
				error,
			);
		}
	}

	/**
	 * Update existing cached content.
	 * @param name - Resource name of the cached content to update
	 * @param request - Update request containing new TTL or expiration
	 * @returns Updated cached content
	 * @throws CachedContentException if update fails
	 */
	async update(
		name: string,
		request: CachedContentUpdateRequest,
	): Promise<GoogleGenAiCachedContent> {
		try {
			const response = await this.cacheManager.update(name, request as any);
			return this.toCachedContent(response);
		} catch (error) {
			throw new CachedContentException(
				`Failed to update cached content: ${name}`,
				error,
			);
		}
	}

	/**
	 * Delete cached content.
	 * @param name - Resource name of the cached content to delete
	 * @returns Promise that resolves when deletion is complete
	 * @throws CachedContentException if deletion fails
	 */
	async delete(name: string): Promise<void> {
		try {
			await this.cacheManager.delete(name);
		} catch (error) {
			throw new CachedContentException(
				`Failed to delete cached content: ${name}`,
				error,
			);
		}
	}

	/**
	 * List available cached content.
	 * @param pageSize - Maximum number of results to return (default: 50)
	 * @param pageToken - Token for retrieving the next page of results
	 * @returns Page of cached content results
	 * @throws CachedContentException if listing fails
	 */
	async list(pageSize = 50, pageToken?: string): Promise<CachedContentPage> {
		try {
			const response = await this.cacheManager.list({
				pageSize,
				pageToken,
			});
			const contents = (response.cachedContents || []).map((c: unknown) =>
				this.toCachedContent(c),
			);
			return {
				contents,
				nextPageToken: response.nextPageToken,
				hasNextPage: !!response.nextPageToken,
			};
		} catch (error) {
			throw new CachedContentException("Failed to list cached content", error);
		}
	}

	/**
	 * List all available cached content by iterating through pages.
	 * @returns Array of all cached content
	 * @throws CachedContentException if listing fails
	 */
	async listAll(): Promise<GoogleGenAiCachedContent[]> {
		let page = await this.list();
		const all = [...page.contents];
		while (page.hasNextPage && page.nextPageToken) {
			page = await this.list(50, page.nextPageToken);
			all.push(...page.contents);
		}
		return all;
	}

	/**
	 * Remove all expired cached content.
	 * Iterates through all content and deletes those with past expiration times.
	 * @returns Number of deleted items
	 */
	async cleanupExpired(): Promise<number> {
		const all = await this.listAll();
		let count = 0;
		const now = new Date();
		for (const content of all) {
			if (content.expireTime && new Date(content.expireTime) < now) {
				try {
					await this.delete(content.name);
					count++;
				} catch (e) {
					// Ignore delete errors for cleanup
				}
			}
		}
		return count;
	}

	/**
	 * Extend the TTL of cached content.
	 * @param name - Resource name of the cached content
	 * @param ttl - New TTL duration (e.g., "3600s")
	 * @returns Updated cached content
	 * @throws CachedContentException if update fails
	 */
	async extendTtl(
		name: string,
		ttl: string,
	): Promise<GoogleGenAiCachedContent> {
		return this.update(name, { ttl });
	}

	/**
	 * Refresh content expiration by resetting TTL to its current value.
	 * @param name - Resource name of the cached content
	 * @returns Updated cached content
	 * @throws CachedContentException if content not found or has no TTL
	 */
	async refreshExpiration(name: string): Promise<GoogleGenAiCachedContent> {
		const content = await this.get(name);
		if (!content) {
			throw new CachedContentException(`Content not found: ${name}`);
		}
		if (!content.ttl) {
			throw new CachedContentException(`Content has no TTL: ${name}`);
		}
		return this.update(name, { ttl: content.ttl });
	}

	private toCachedContent(nativeContent: any): GoogleGenAiCachedContent {
		return {
			name: nativeContent.name,
			displayName: nativeContent.displayName,
			model: nativeContent.model,
			systemInstruction: nativeContent.systemInstruction,
			contents: nativeContent.contents,
			tools: nativeContent.tools,
			createTime: nativeContent.createTime,
			updateTime: nativeContent.updateTime,
			expireTime: nativeContent.expireTime,
			ttl: nativeContent.ttl,
			nativeCachedContent: nativeContent,
		};
	}
}
