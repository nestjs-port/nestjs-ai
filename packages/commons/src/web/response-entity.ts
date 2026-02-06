/**
 * A typed wrapper around an HTTP response, analogous to Spring's ResponseEntity.
 *
 * Provides type-safe access to the parsed response body along with
 * HTTP metadata (status code and headers).
 *
 * @typeParam T - The type of the response body.
 */
export interface ResponseEntity<T> {
	/** The parsed response body. */
	body: T;
	/** The HTTP status code. */
	status: number;
	/** The response headers. */
	headers: Headers;
}
