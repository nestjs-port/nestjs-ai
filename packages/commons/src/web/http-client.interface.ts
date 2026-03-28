/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
