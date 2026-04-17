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
import type { ClientOptions } from "openai";
import type { EmbeddingCreateParams } from "openai/resources/embeddings";

import {
  AbstractOpenAiSdkOptions,
  type AbstractOpenAiSdkOptionsProps,
} from "./abstract-open-ai-sdk-options";

export type OpenAiSdkEmbeddingCreateParams = EmbeddingCreateParams;

export interface OpenAiSdkEmbeddingOptionsProps
  extends AbstractOpenAiSdkOptionsProps {
  user?: string | null;
  dimensions?: number | null;
}

/**
 * Configuration information for the Embedding Model implementation using the OpenAI Node SDK.
 */
export class OpenAiSdkEmbeddingOptions extends AbstractOpenAiSdkOptions {
  static readonly DEFAULT_EMBEDDING_MODEL = "text-embedding-ada-002";

  private _user: string | null = null;
  private _dimensions: number | null = null;

  constructor(props: OpenAiSdkEmbeddingOptionsProps = {}) {
    super(props);
    this._user = props.user ?? null;
    this._dimensions = props.dimensions ?? null;
  }

  static builder(): OpenAiSdkEmbeddingOptions.Builder {
    return new OpenAiSdkEmbeddingOptions.Builder();
  }

  get user(): string | null {
    return this._user;
  }

  set user(user: string | null) {
    this._user = user ?? null;
  }

  get dimensions(): number | null {
    return this._dimensions;
  }

  set dimensions(dimensions: number | null) {
    this._dimensions = dimensions ?? null;
  }

  toString(): string {
    return (
      "OpenAiSdkEmbeddingOptions{" +
      `user='${this.user}', model='${this.model}', deploymentName='${this.deploymentName}', dimensions=${this.dimensions}` +
      "}"
    );
  }

  toOpenAiCreateParams(instructions: string[]): OpenAiSdkEmbeddingCreateParams {
    const params: OpenAiSdkEmbeddingCreateParams = {
      input: instructions,
      model:
        this.deploymentName != null
          ? this.deploymentName
          : this.model != null
            ? this.model
            : OpenAiSdkEmbeddingOptions.DEFAULT_EMBEDDING_MODEL,
    };

    if (this.user != null) {
      params.user = this.user;
    }
    if (this.dimensions != null) {
      params.dimensions = this.dimensions;
    }

    return params;
  }
}

export namespace OpenAiSdkEmbeddingOptions {
  export class Builder {
    private readonly options = new OpenAiSdkEmbeddingOptions();

    from(fromOptions: OpenAiSdkEmbeddingOptions): this;
    from(openAiCreateParams: OpenAiSdkEmbeddingCreateParams): this;
    from(
      value: OpenAiSdkEmbeddingOptions | OpenAiSdkEmbeddingCreateParams,
    ): this {
      if (value instanceof OpenAiSdkEmbeddingOptions) {
        this.options.baseUrl = value.baseUrl;
        this.options.apiKey = value.apiKey;
        this.options.azureADTokenProvider = value.azureADTokenProvider;
        this.options.model = value.model;
        this.options.deploymentName = value.deploymentName;
        this.options.microsoftFoundryServiceVersion =
          value.microsoftFoundryServiceVersion;
        this.options.organizationId = value.organizationId;
        this.options.microsoftFoundry = value.microsoftFoundry;
        this.options.gitHubModels = value.gitHubModels;
        this.options.timeout = value.timeout;
        this.options.maxRetries = value.maxRetries;
        this.options.fetchOptions = value.fetchOptions;
        this.options.customHeaders = { ...value.customHeaders };
        this.options.user = value.user;
        this.options.dimensions = value.dimensions;
        return this;
      }

      if (value.user != null) {
        this.options.user = value.user;
      }
      if (value.dimensions != null) {
        this.options.dimensions = value.dimensions;
      }
      return this;
    }

    merge(from: unknown): this {
      if (from instanceof OpenAiSdkEmbeddingOptions) {
        if (from.baseUrl != null) {
          this.options.baseUrl = from.baseUrl;
        }
        if (from.apiKey != null) {
          this.options.apiKey = from.apiKey;
        }
        if (from.azureADTokenProvider != null) {
          this.options.azureADTokenProvider = from.azureADTokenProvider;
        }
        if (from.model != null) {
          this.options.model = from.model;
        }
        if (from.deploymentName != null) {
          this.options.deploymentName = from.deploymentName;
        }
        if (from.microsoftFoundryServiceVersion != null) {
          this.options.microsoftFoundryServiceVersion =
            from.microsoftFoundryServiceVersion;
        }
        if (from.organizationId != null) {
          this.options.organizationId = from.organizationId;
        }
        this.options.microsoftFoundry = from.microsoftFoundry;
        this.options.gitHubModels = from.gitHubModels;
        if (from.timeout != null) {
          this.options.timeout = from.timeout;
        }
        if (from.maxRetries != null) {
          this.options.maxRetries = from.maxRetries;
        }
        if (from.fetchOptions != null) {
          this.options.fetchOptions = from.fetchOptions;
        }
        if (from.customHeaders != null) {
          this.options.customHeaders = { ...from.customHeaders };
        }
        if (from.user != null) {
          this.options.user = from.user;
        }
        if (from.dimensions != null) {
          this.options.dimensions = from.dimensions;
        }
      }
      return this;
    }

    user(user: string): this {
      this.options.user = user;
      return this;
    }

    deploymentName(deploymentName: string): this {
      this.options.deploymentName = deploymentName;
      return this;
    }

    model(model: string): this {
      this.options.model = model;
      return this;
    }

    baseUrl(baseUrl: string): this {
      this.options.baseUrl = baseUrl;
      return this;
    }

    apiKey(apiKey: string): this {
      this.options.apiKey = apiKey;
      return this;
    }

    azureADTokenProvider(
      azureADTokenProvider: (() => Promise<string>) | null,
    ): this {
      this.options.azureADTokenProvider = azureADTokenProvider;
      return this;
    }

    azureOpenAIServiceVersion(azureOpenAIServiceVersion: unknown): this {
      this.options.microsoftFoundryServiceVersion = azureOpenAIServiceVersion;
      return this;
    }

    organizationId(organizationId: string): this {
      this.options.organizationId = organizationId;
      return this;
    }

    azure(azure: boolean): this {
      this.options.microsoftFoundry = azure;
      return this;
    }

    gitHubModels(gitHubModels: boolean): this {
      this.options.gitHubModels = gitHubModels;
      return this;
    }

    timeout(timeout: Milliseconds | null): this {
      this.options.timeout = timeout;
      return this;
    }

    maxRetries(maxRetries: number): this {
      this.options.maxRetries = maxRetries;
      return this;
    }

    fetchOptions(fetchOptions: ClientOptions["fetchOptions"] | null): this {
      this.options.fetchOptions = fetchOptions;
      return this;
    }

    customHeaders(customHeaders: Record<string, string>): this {
      this.options.customHeaders = { ...customHeaders };
      return this;
    }

    dimensions(dimensions: number): this {
      this.options.dimensions = dimensions;
      return this;
    }

    build(): OpenAiSdkEmbeddingOptions {
      return this.options;
    }
  }
}
