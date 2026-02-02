/**
 * HTTP client interface compatible with the Fetch API.
 *
 * Allows users to provide custom implementations (axios, undici, got, etc.)
 * wrapped to match the fetch signature.
 *
 * @example
 * ```typescript
 * // Using default fetch
 * const client = new FetchHttpClient();
 *
 * // Custom axios implementation
 * class AxiosHttpClient implements HttpClient {
 *   constructor(private axios: AxiosInstance) {}
 *
 *   async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
 *     const response = await this.axios({ url: input.toString(), ... });
 *     return new Response(JSON.stringify(response.data), {
 *       status: response.status,
 *       headers: response.headers
 *     });
 *   }
 * }
 * ```
 */
export interface HttpClient {
	/**
	 * Fetches a resource from the network.
	 * @param input - The resource URL or Request object
	 * @param init - Optional request configuration
	 * @returns A Promise that resolves to the Response
	 */
	fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}
