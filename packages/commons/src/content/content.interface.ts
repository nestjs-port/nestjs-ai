/**
 * Data structure that contains content and metadata.
 * Common parent for the Document and the Message classes.
 */
export interface Content {
	/**
	 * Get the text content.
	 * @returns the text content, or null if not available
	 */
	get text(): string | null;

	/**
	 * Get the metadata associated with the content.
	 * @returns the metadata associated with the content
	 */
	get metadata(): Record<string, unknown>;
}
