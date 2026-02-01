/**
 * Represents cached content in Google GenAI.
 */
export interface GoogleGenAiCachedContent {
	/**
	 * Resource name of the cached content.
	 */
	name: string;

	/**
	 * User-friendly name for the cached content.
	 */
	displayName?: string;

	/**
	 * Model name used for the cached content.
	 */
	model?: string;

	/**
	 * System instruction used in the cached content.
	 */
	systemInstruction?: unknown;

	/**
	 * Content parts stored in the cache.
	 */
	contents?: unknown[];

	/**
	 * Tool definitions available for the cached content.
	 */
	tools?: unknown[];

	/**
	 * Creation timestamp.
	 */
	createTime?: string;

	/**
	 * Last update timestamp.
	 */
	updateTime?: string;

	/**
	 * Expiration timestamp.
	 */
	expireTime?: string;

	/**
	 * Time-to-live duration.
	 */
	ttl?: string;

	/**
	 * Native SDK cached content object.
	 */
	nativeCachedContent?: unknown;
}

/**
 * Request to create new cached content.
 */
export interface CachedContentRequest {
	/**
	 * Model name (required).
	 */
	model: string;

	/**
	 * Content to be cached.
	 */
	contents?: unknown[];

	/**
	 * System instruction for the model.
	 */
	systemInstruction?: unknown;

	/**
	 * Tools available for the model.
	 */
	tools?: unknown[];

	/**
	 * Optional display name.
	 */
	displayName?: string;

	/**
	 * Time-to-live (mutually exclusive with expireTime).
	 */
	ttl?: string;

	/**
	 * Expiration time (mutually exclusive with ttl).
	 */
	expireTime?: string;
}

/**
 * Request to update cached content TTL or expiration.
 */
export interface CachedContentUpdateRequest {
	/**
	 * New TTL duration.
	 */
	ttl?: string;

	/**
	 * New expiration timestamp.
	 */
	expireTime?: string;
}

/**
 * Paginated list of cached content.
 */
export interface CachedContentPage {
	/**
	 * List of cached content in the current page.
	 */
	contents: GoogleGenAiCachedContent[];

	/**
	 * Token for the next page.
	 */
	nextPageToken?: string;

	/**
	 * Whether there is a next page.
	 */
	hasNextPage: boolean;
}

/**
 * Exception thrown for cached content service errors.
 */
export class CachedContentException extends Error {
	constructor(
		message: string,
		/**
		 * Original error cause.
		 */
		public readonly cause?: unknown,
	) {
		super(message);
		this.name = "CachedContentException";
	}
}
