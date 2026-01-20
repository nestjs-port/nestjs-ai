/**
 * Data structure that contains content and metadata.
 * Common parent for the Document and the Message classes.
 */
export interface Content {
	/**
	 * Get the text content.
	 * @returns the text content, or null if not available
	 */
	getText(): string | null;

	/**
	 * Get the metadata associated with the content.
	 * @returns the metadata associated with the content
	 */
	getMetadata(): Record<string, unknown>;
}
