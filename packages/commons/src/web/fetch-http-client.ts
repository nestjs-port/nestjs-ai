import type { HttpClient } from "./http-client.interface";

/**
 * Default HTTP client implementation using the native fetch API.
 */
export class FetchHttpClient implements HttpClient {
	fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
		return fetch(input, init);
	}
}
