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

import type { Milliseconds } from "@nestjs-ai/commons";

/**
 * Base class for common Anthropic SDK configuration options, extended by
 * {@link AnthropicChatOptions}.
 *
 * <p>
 * Supports environment variables {@code ANTHROPIC_API_KEY} and {@code ANTHROPIC_BASE_URL}
 * for configuration.
 *
 * @see AnthropicChatOptions
 */
export class AbstractAnthropicOptions {
  /**
   * The base URL to connect to the Anthropic API. Defaults to
   * "https://api.anthropic.com" if not specified.
   */
  private _baseUrl: string | null = null;

  /**
   * The API key to authenticate with the Anthropic API. Can also be set via the
   * ANTHROPIC_API_KEY environment variable.
   */
  private _apiKey: string | null = null;

  /**
   * The model name to use for requests.
   */
  private _model: string | null = null;

  /**
   * Request timeout for the Anthropic client. Defaults to 60 seconds if not specified.
   */
  private _timeout: Milliseconds | null = null;

  /**
   * Maximum number of retries for failed requests. Defaults to 2 if not specified.
   */
  private _maxRetries: number | null = null;

  /**
   * Proxy settings for the Anthropic client.
   */
  private _proxy: unknown | null = null;

  /**
   * Custom HTTP headers to add to Anthropic client requests.
   */
  private _customHeaders: Map<string, string> = new Map();

  get baseUrl(): string | null {
    return this._baseUrl;
  }

  setBaseUrl(baseUrl: string | null): void {
    this._baseUrl = baseUrl ?? null;
  }

  get apiKey(): string | null {
    return this._apiKey;
  }

  setApiKey(apiKey: string | null): void {
    this._apiKey = apiKey ?? null;
  }

  get model(): string | null {
    return this._model;
  }

  setModel(model: string | null): void {
    this._model = model ?? null;
  }

  get timeout(): Milliseconds | null {
    return this._timeout;
  }

  setTimeout(timeout: Milliseconds | null): void {
    this._timeout = timeout ?? null;
  }

  get maxRetries(): number | null {
    return this._maxRetries;
  }

  setMaxRetries(maxRetries: number | null): void {
    this._maxRetries = maxRetries ?? null;
  }

  get proxy(): unknown | null {
    return this._proxy;
  }

  setProxy(proxy: unknown | null): void {
    this._proxy = proxy ?? null;
  }

  get customHeaders(): Map<string, string> {
    return this._customHeaders;
  }

  setCustomHeaders(customHeaders: Map<string, string>): void {
    this._customHeaders = new Map(customHeaders);
  }
}
