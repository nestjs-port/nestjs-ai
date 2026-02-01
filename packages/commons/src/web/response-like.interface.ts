/**
 * Response-like interface for HTTP responses.
 * Compatible with fetch Response and axios response objects.
 */
export interface ResponseLike {
	readonly status: number;
	readonly statusText?: string;
	readonly ok?: boolean;
	text?(): Promise<string>;
	data?: unknown;
}
