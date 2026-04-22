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

import type { Milliseconds } from "@nestjs-port/core";
import type { ClientOptions } from "openai";
import type { EmbeddingCreateParams } from "openai/resources/embeddings";

import {
  AbstractOpenAiOptions,
  type AbstractOpenAiOptionsProps,
} from "./abstract-open-ai-options";

export type OpenAiEmbeddingCreateParams = EmbeddingCreateParams;

export interface OpenAiEmbeddingOptionsProps extends AbstractOpenAiOptionsProps {
  /**
   * An identifier for the caller or end user of the operation. This may be used for
   * tracking or rate-limiting purposes.
   */
  user?: string | null;
  dimensions?: number | null;
}

/**
 * Configuration information for the Embedding Model implementation using the OpenAI Java
 * SDK.
 */
export class OpenAiEmbeddingOptions extends AbstractOpenAiOptions {
  static readonly DEFAULT_EMBEDDING_MODEL = "text-embedding-ada-002";

  private _user: string | null = null;
  private _dimensions: number | null = null;

  constructor(props: OpenAiEmbeddingOptionsProps = {}) {
    super(props);
    this._user = props.user ?? null;
    this._dimensions = props.dimensions ?? null;
  }

  static builder(): OpenAiEmbeddingOptions.Builder {
    return new OpenAiEmbeddingOptions.Builder();
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

  toOpenAiCreateParams(instructions: string[]): OpenAiEmbeddingCreateParams {
    const params: OpenAiEmbeddingCreateParams = {
      input: instructions,
      model:
        this.deploymentName != null
          ? this.deploymentName
          : this.model != null
            ? this.model
            : OpenAiEmbeddingOptions.DEFAULT_EMBEDDING_MODEL,
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

export namespace OpenAiEmbeddingOptions {
  export class Builder {
    private readonly options = new OpenAiEmbeddingOptions();

    from(fromOptions: OpenAiEmbeddingOptions): this;
    from(openAiCreateParams: OpenAiEmbeddingCreateParams): this;
    from(value: OpenAiEmbeddingOptions | OpenAiEmbeddingCreateParams): this {
      if (value instanceof OpenAiEmbeddingOptions) {
        this.options.setBaseUrl(value.baseUrl);
        this.options.setApiKey(value.apiKey);
        this.options.setAzureADTokenProvider(value.azureADTokenProvider);
        this.options.setModel(value.model);
        this.options.setDeploymentName(value.deploymentName);
        this.options.setMicrosoftFoundryServiceVersion(
          value.microsoftFoundryServiceVersion,
        );
        this.options.setOrganizationId(value.organizationId);
        this.options.setMicrosoftFoundry(value.microsoftFoundry);
        this.options.setGitHubModels(value.gitHubModels);
        this.options.setTimeout(value.timeout);
        this.options.setMaxRetries(value.maxRetries);
        this.options.setFetchOptions(value.fetchOptions);
        this.options.setCustomHeaders({ ...value.customHeaders });
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
      if (from instanceof OpenAiEmbeddingOptions) {
        if (from.baseUrl != null) {
          this.options.setBaseUrl(from.baseUrl);
        }
        if (from.apiKey != null) {
          this.options.setApiKey(from.apiKey);
        }
        if (from.azureADTokenProvider != null) {
          this.options.setAzureADTokenProvider(from.azureADTokenProvider);
        }
        if (from.model != null) {
          this.options.setModel(from.model);
        }
        if (from.deploymentName != null) {
          this.options.setDeploymentName(from.deploymentName);
        }
        if (from.microsoftFoundryServiceVersion != null) {
          this.options.setMicrosoftFoundryServiceVersion(
            from.microsoftFoundryServiceVersion,
          );
        }
        if (from.organizationId != null) {
          this.options.setOrganizationId(from.organizationId);
        }
        this.options.setMicrosoftFoundry(from.microsoftFoundry);
        this.options.setGitHubModels(from.gitHubModels);
        if (from.timeout != null) {
          this.options.setTimeout(from.timeout);
        }
        if (from.maxRetries != null) {
          this.options.setMaxRetries(from.maxRetries);
        }
        if (from.fetchOptions != null) {
          this.options.setFetchOptions(from.fetchOptions);
        }
        if (from.customHeaders != null) {
          this.options.setCustomHeaders({ ...from.customHeaders });
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
      this.options.setDeploymentName(deploymentName);
      return this;
    }

    model(model: string): this {
      this.options.setModel(model);
      return this;
    }

    baseUrl(baseUrl: string): this {
      this.options.setBaseUrl(baseUrl);
      return this;
    }

    apiKey(apiKey: string): this {
      this.options.setApiKey(apiKey);
      return this;
    }

    azureADTokenProvider(
      azureADTokenProvider: (() => Promise<string>) | null,
    ): this {
      this.options.setAzureADTokenProvider(azureADTokenProvider);
      return this;
    }

    azureOpenAIServiceVersion(azureOpenAIServiceVersion: unknown): this {
      this.options.setMicrosoftFoundryServiceVersion(azureOpenAIServiceVersion);
      return this;
    }

    organizationId(organizationId: string): this {
      this.options.setOrganizationId(organizationId);
      return this;
    }

    azure(azure: boolean): this {
      this.options.setMicrosoftFoundry(azure);
      return this;
    }

    gitHubModels(gitHubModels: boolean): this {
      this.options.setGitHubModels(gitHubModels);
      return this;
    }

    timeout(timeout: Milliseconds | null): this {
      this.options.setTimeout(timeout);
      return this;
    }

    maxRetries(maxRetries: number): this {
      this.options.setMaxRetries(maxRetries);
      return this;
    }

    fetchOptions(fetchOptions: ClientOptions["fetchOptions"] | null): this {
      this.options.setFetchOptions(fetchOptions);
      return this;
    }

    customHeaders(customHeaders: Record<string, string>): this {
      this.options.setCustomHeaders({ ...customHeaders });
      return this;
    }

    dimensions(dimensions: number): this {
      this.options.dimensions = dimensions;
      return this;
    }

    build(): OpenAiEmbeddingOptions {
      return this.options;
    }
  }
}
