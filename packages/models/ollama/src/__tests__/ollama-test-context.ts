/*
 * Copyright 2026-present the original author or authors.
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

import assert from "node:assert/strict";

import { OllamaContainer } from "@testcontainers/ollama";
import { lastValueFrom } from "rxjs";

import { OllamaApi } from "../api/ollama-api.js";
import { OllamaApiConstants } from "../api/common/ollama-api-constants.js";

const DEFAULT_IMAGE = "ollama/ollama:0.12.10";
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_PULL_RETRY_DELAY_MS = 1_000;

type OllamaContainerHandle = {
  getEndpoint(): string;
  stop(): Promise<unknown>;
};

export interface OllamaTestContextProps {
  baseUrl?: string;
  image?: string;
  reuseExistingOllama?: boolean;
  maxRetries?: number;
}

export class OllamaTestContext {
  private readonly _api: OllamaApi;

  private readonly _baseUrl: string;

  private readonly _container: OllamaContainerHandle | null;

  private constructor(props: {
    api: OllamaApi;
    baseUrl: string;
    container: OllamaContainerHandle | null;
  }) {
    this._api = props.api;
    this._baseUrl = props.baseUrl;
    this._container = props.container;
  }

  static async initializeOllama(
    models: string[],
    props: OllamaTestContextProps = {},
  ): Promise<OllamaTestContext> {
    assert(models.length > 0, "at least one model name must be provided");

    const hasExplicitBaseUrl = props.baseUrl != null;
    const reuseExistingOllama =
      props.reuseExistingOllama ?? process.env.OLLAMA_WITH_REUSE === "true";

    const container =
      hasExplicitBaseUrl || reuseExistingOllama
        ? null
        : await new OllamaContainer(props.image ?? DEFAULT_IMAGE)
            .withReuse()
            .start();

    const baseUrl =
      props.baseUrl ??
      container?.getEndpoint() ??
      OllamaApiConstants.DEFAULT_BASE_URL;

    const api = new OllamaApi({ baseUrl });
    await this.ensureModelsPresent(
      api,
      models,
      props.maxRetries ?? DEFAULT_MAX_RETRIES,
    );

    return new OllamaTestContext({ api, baseUrl, container });
  }

  get api(): OllamaApi {
    return this._api;
  }

  get baseUrl(): string {
    return this._baseUrl;
  }

  async stop(): Promise<void> {
    await this._container?.stop();
  }

  private static async ensureModelsPresent(
    api: OllamaApi,
    models: string[],
    maxRetries: number,
  ): Promise<void> {
    for (const model of models) {
      await this.pullModelWithRetries(api, model, maxRetries);
    }
  }

  private static async pullModelWithRetries(
    api: OllamaApi,
    model: string,
    maxRetries: number,
  ): Promise<void> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await lastValueFrom(
          api.pullModel({
            model,
            stream: true,
            insecure: false,
          }),
        );
        return;
      } catch (error) {
        lastError = error;
        if (attempt >= maxRetries) {
          throw error;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, DEFAULT_PULL_RETRY_DELAY_MS),
        );
      }
    }

    throw lastError;
  }
}
