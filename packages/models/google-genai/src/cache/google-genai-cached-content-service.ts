import assert from "node:assert/strict";
import type { Logger, Milliseconds } from "@nestjs-ai/commons";
import { LoggerFactory, ms } from "@nestjs-ai/commons";
import type {
	Caches,
	CreateCachedContentConfig,
	GoogleGenAI,
	UpdateCachedContentConfig,
} from "@google/genai";
import type { CachedContentRequest } from "./cached-content-request";
import { CachedContentUpdateRequest } from "./cached-content-update-request";
import { GoogleGenAiCachedContent } from "./google-genai-cached-content";

export class CachedContentException extends Error {
	constructor(message: string, cause?: Error) {
		super(message, { cause });
		this.name = "CachedContentException";
	}
}

export class CachedContentPage {
	private readonly _contents: GoogleGenAiCachedContent[];
	private readonly _nextPageToken: string | null;

	constructor(
		contents: GoogleGenAiCachedContent[],
		nextPageToken: string | null,
	) {
		this._contents = contents ? [...contents] : [];
		this._nextPageToken = nextPageToken;
	}

	get contents(): GoogleGenAiCachedContent[] {
		return this._contents;
	}

	get nextPageToken(): string | null {
		return this._nextPageToken;
	}

	get hasNextPage(): boolean {
		return this._nextPageToken !== null;
	}
}

export class GoogleGenAiCachedContentService {
	private static _logger: Logger | null = null;
	private static get logger(): Logger {
		if (!GoogleGenAiCachedContentService._logger) {
			GoogleGenAiCachedContentService._logger = LoggerFactory.getLogger(
				GoogleGenAiCachedContentService.name,
			);
		}
		return GoogleGenAiCachedContentService._logger;
	}

	private readonly _genAiClient: GoogleGenAI;
	private readonly _caches: Caches;

	constructor(genAiClient: GoogleGenAI) {
		assert(genAiClient, "GenAI client must not be null");
		this._genAiClient = genAiClient;
		this._caches = genAiClient.caches;
	}

	/**
	 * Creates cached content from the given request.
	 * @param request the cached content creation request
	 * @return the created cached content
	 */
	async create(
		request: CachedContentRequest,
	): Promise<GoogleGenAiCachedContent | null> {
		assert(request, "Request must not be null");

		const config: CreateCachedContentConfig = {
			contents: request.contents,
		};

		if (request.systemInstruction) {
			config.systemInstruction = request.systemInstruction;
		}
		if (request.displayName) {
			config.displayName = request.displayName;
		}
		if (request.ttl) {
			config.ttl = `${request.ttl / 1000}s`;
		} else if (request.expireTime) {
			config.expireTime = request.expireTime.toISOString();
		}

		try {
			const cachedContent = await this._caches.create({
				model: request.model,
				config,
			});
			GoogleGenAiCachedContentService.logger.debug(
				`Created cached content: ${cachedContent.name ?? "unknown"}`,
			);
			return GoogleGenAiCachedContent.from(cachedContent);
		} catch (e) {
			GoogleGenAiCachedContentService.logger.error(
				"Failed to create cached content",
				e,
			);
			throw new CachedContentException(
				"Failed to create cached content",
				e instanceof Error ? e : undefined,
			);
		}
	}

	async get(name: string): Promise<GoogleGenAiCachedContent | null> {
		assert(name, "Name must not be empty");

		try {
			const cachedContent = await this._caches.get({ name });
			GoogleGenAiCachedContentService.logger.debug(
				`Retrieved cached content: ${name}`,
			);
			return GoogleGenAiCachedContent.from(cachedContent);
		} catch (e) {
			GoogleGenAiCachedContentService.logger.error(
				`Failed to get cached content: ${name}`,
				e,
			);
			return null;
		}
	}

	async update(
		name: string,
		request: CachedContentUpdateRequest,
	): Promise<GoogleGenAiCachedContent | null> {
		assert(name, "Name must not be empty");
		assert(request, "Request must not be null");

		const config: UpdateCachedContentConfig = {};

		if (request.ttl) {
			config.ttl = `${request.ttl / 1000}s`;
		}
		if (request.expireTime) {
			config.expireTime = request.expireTime.toISOString();
		}

		try {
			const cachedContent = await this._caches.update({
				name,
				config,
			});
			GoogleGenAiCachedContentService.logger.debug(
				`Updated cached content: ${name}`,
			);
			return GoogleGenAiCachedContent.from(cachedContent);
		} catch (e) {
			GoogleGenAiCachedContentService.logger.error(
				`Failed to update cached content: ${name}`,
				e,
			);
			throw new CachedContentException(
				`Failed to update cached content: ${name}`,
				e instanceof Error ? e : undefined,
			);
		}
	}

	async delete(name: string): Promise<boolean> {
		assert(name, "Name must not be empty");

		try {
			await this._caches.delete({ name });
			GoogleGenAiCachedContentService.logger.debug(
				`Deleted cached content: ${name}`,
			);
			return true;
		} catch (e) {
			GoogleGenAiCachedContentService.logger.error(
				`Failed to delete cached content: ${name}`,
				e,
			);
			return false;
		}
	}

	async list(
		pageSize?: number,
		pageToken?: string | null,
	): Promise<CachedContentPage> {
		const config: { pageSize?: number; pageToken?: string } = {};

		if (pageSize && pageSize > 0) {
			config.pageSize = pageSize;
		}
		if (pageToken) {
			config.pageToken = pageToken;
		}

		try {
			const pager = await this._caches.list({ config });

			const contents: GoogleGenAiCachedContent[] = [];
			const limit = pageSize ?? 100;
			for (const item of pager.page) {
				const content = GoogleGenAiCachedContent.from(item);
				if (content) {
					contents.push(content);
				}
				if (contents.length >= limit) {
					break;
				}
			}

			// Note: Pager doesn't expose page tokens directly, so we can't support
			// pagination
			// in the same way. This is a limitation of the SDK.
			GoogleGenAiCachedContentService.logger.debug(
				`Listed ${contents.length} cached content items`,
			);

			return new CachedContentPage(contents, null);
		} catch (e) {
			GoogleGenAiCachedContentService.logger.error(
				"Failed to list cached content",
				e,
			);
			throw new CachedContentException(
				"Failed to list cached content",
				e instanceof Error ? e : undefined,
			);
		}
	}

	async listAll(): Promise<GoogleGenAiCachedContent[]> {
		const allContent: GoogleGenAiCachedContent[] = [];
		let pageToken: string | null = null;

		do {
			const page = await this.list(100, pageToken);
			allContent.push(...page.contents);
			pageToken = page.nextPageToken;
		} while (pageToken != null);

		return allContent;
	}

	async extendTtl(
		name: string,
		additionalTtlMs: Milliseconds,
	): Promise<GoogleGenAiCachedContent | null> {
		assert(name, "Name must not be empty");
		assert(additionalTtlMs, "Additional TTL must not be null");

		const existing = await this.get(name);
		if (!existing) {
			throw new CachedContentException(`Cached content not found: ${name}`);
		}

		const baseTime = existing.expireTime
			? new Date(existing.expireTime).getTime()
			: Date.now();
		const newExpireTime = new Date(baseTime + additionalTtlMs);

		return this.update(
			name,
			new CachedContentUpdateRequest({
				expireTime: newExpireTime,
			}),
		);
	}

	async refreshExpiration(
		name: string,
		maxTtl: Milliseconds,
	): Promise<GoogleGenAiCachedContent | null> {
		assert(name, "Name must not be empty");
		assert(maxTtl, "Max TTL must not be null");

		return this.update(name, new CachedContentUpdateRequest({ ttl: maxTtl }));
	}

	async cleanupExpired(): Promise<number> {
		const allContent = await this.listAll();
		let removed = 0;

		for (const content of allContent) {
			if (content.expired) {
				if (await this.delete(content.name!)) {
					removed++;
					GoogleGenAiCachedContentService.logger.info(
						`Removed expired cached content: ${content.name}`,
					);
				}
			}
		}

		return removed;
	}
}
