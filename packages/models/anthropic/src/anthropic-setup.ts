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

import {
  Anthropic,
  type ClientOptions as AnthropicClientOptions,
} from "@anthropic-ai/sdk";
import {
  type Logger,
  LoggerFactory,
  type Milliseconds,
  ms,
} from "@nestjs-ai/commons";

export interface AnthropicSetupProps {
  baseUrl?: string | null;
  apiKey?: string | null;
  timeout?: Milliseconds | null;
  maxRetries?: number | null;
  fetch?: AnthropicClientOptions["fetch"] | null;
  fetchOptions?: AnthropicClientOptions["fetchOptions"] | null;
  customHeaders?: Record<string, string> | null;
}

/**
 * Factory class for creating and configuring Anthropic SDK client instances.
 *
 * This utility class provides static factory methods for creating Anthropic clients
 * with comprehensive configuration support. It handles API key detection from
 * environment variables and provides sensible defaults for timeouts and retry
 * behavior.
 *
 * Client types:
 * - Synchronous client: Used for blocking API calls.
 * - Asynchronous client: Used for streaming responses.
 *
 * Environment variable support:
 * - `ANTHROPIC_API_KEY` - Primary API key for authentication
 * - `ANTHROPIC_AUTH_TOKEN` - Alternative authentication token
 * - `ANTHROPIC_BASE_URL` - Override the default API endpoint
 *
 * Default configuration:
 * - Timeout: 60 seconds
 * - Max retries: 2
 * - User-Agent: `spring-ai-anthropic-sdk`
 *
 * This class is not intended to be instantiated directly. Use the static factory
 * method to create client instances.
 *
 * @see AnthropicChatModel
 */
export abstract class AnthropicSetup {
  private static readonly ANTHROPIC_URL = "https://api.anthropic.com";
  private static readonly ANTHROPIC_API_KEY = "ANTHROPIC_API_KEY";
  private static readonly ANTHROPIC_AUTH_TOKEN = "ANTHROPIC_AUTH_TOKEN";
  private static readonly ANTHROPIC_BASE_URL = "ANTHROPIC_BASE_URL";
  private static readonly DEFAULT_USER_AGENT = "spring-ai-anthropic-sdk";
  private static readonly DEFAULT_TIMEOUT: Milliseconds = ms(60_000);
  private static readonly DEFAULT_MAX_RETRIES = 2;

  private static readonly logger: Logger = LoggerFactory.getLogger(
    AnthropicSetup.name,
  );

  /**
   * Creates a configured Anthropic client with the specified settings.
   *
   * @param props the client configuration properties
   * @returns a configured Anthropic client
   */
  static setupClient(props: AnthropicSetupProps): Anthropic {
    const resolvedBaseUrl = AnthropicSetup.detectBaseUrlFromEnv(props.baseUrl);
    const resolvedTimeout = props.timeout ?? AnthropicSetup.DEFAULT_TIMEOUT;
    const resolvedMaxRetries =
      props.maxRetries ?? AnthropicSetup.DEFAULT_MAX_RETRIES;
    const resolvedApiKey = props.apiKey ?? AnthropicSetup.detectApiKey();

    const defaultHeaders = {
      "User-Agent": AnthropicSetup.DEFAULT_USER_AGENT,
      ...(props.customHeaders ?? {}),
    };

    return new Anthropic({
      baseURL: resolvedBaseUrl ?? AnthropicSetup.ANTHROPIC_URL,
      apiKey: resolvedApiKey,
      timeout: resolvedTimeout,
      maxRetries: resolvedMaxRetries,
      defaultHeaders,
      fetch: props.fetch ?? undefined,
      fetchOptions: props.fetchOptions ?? undefined,
      logger: AnthropicSetup.logger,
    });
  }

  /**
   * Detects the base URL from environment variable if not explicitly provided.
   *
   * @param baseUrl the explicitly provided base URL
   * @returns the base URL to use
   */
  private static detectBaseUrlFromEnv(
    baseUrl: string | null | undefined,
  ): string | null | undefined {
    if (baseUrl == null) {
      const envBaseUrl = process.env[AnthropicSetup.ANTHROPIC_BASE_URL];
      if (envBaseUrl != null) {
        AnthropicSetup.logger.debug(
          "Anthropic Base URL detected from environment variable {}.",
          AnthropicSetup.ANTHROPIC_BASE_URL,
        );
        return envBaseUrl;
      }
    }
    return baseUrl;
  }

  /**
   * Detects the API key from environment variables.
   *
   * @returns the API key, or null if not found
   */
  private static detectApiKey(): string | null {
    const apiKey = process.env[AnthropicSetup.ANTHROPIC_API_KEY];
    if (apiKey != null) {
      AnthropicSetup.logger.debug(
        "Anthropic API key detected from environment variable {}.",
        AnthropicSetup.ANTHROPIC_API_KEY,
      );
      return apiKey;
    }

    const authToken = process.env[AnthropicSetup.ANTHROPIC_AUTH_TOKEN];
    if (authToken != null) {
      AnthropicSetup.logger.debug(
        "Anthropic auth token detected from environment variable {}.",
        AnthropicSetup.ANTHROPIC_AUTH_TOKEN,
      );
      return authToken;
    }

    return null;
  }
}
