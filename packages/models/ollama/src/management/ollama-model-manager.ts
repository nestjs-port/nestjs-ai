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

import assert from "node:assert/strict";

import { LoggerFactory } from "@nestjs-port/core";
import {
  type Observable,
  lastValueFrom,
  retry,
  timeout,
  toArray,
  timer,
} from "rxjs";

import type { OllamaApi } from "../api/ollama-api.js";
import { ModelManagementOptions } from "./model-management-options.js";
import { PullModelStrategy } from "./pull-model-strategy.js";

export interface OllamaModelManagerProps {
  ollamaApi: OllamaApi;
  options?: ModelManagementOptions;
}

/**
 * Manage the lifecycle of models in Ollama.
 */
export class OllamaModelManager {
  private readonly logger = LoggerFactory.getLogger(OllamaModelManager.name);

  private readonly _ollamaApi: OllamaApi;

  private readonly _options: ModelManagementOptions;

  constructor(props: OllamaModelManagerProps) {
    this._ollamaApi = props.ollamaApi;
    this._options = props.options ?? ModelManagementOptions.defaults();
  }

  static async create(
    props: OllamaModelManagerProps,
  ): Promise<OllamaModelManager> {
    const modelManager = new OllamaModelManager(props);
    await modelManager.initialize();
    return modelManager;
  }

  get options(): ModelManagementOptions {
    return this._options;
  }

  async initialize(): Promise<void> {
    for (const modelName of this._options.additionalModels) {
      await this.pullModel(modelName);
    }
  }

  async isModelAvailable(modelName: string): Promise<boolean> {
    assert(modelName.trim().length > 0, "modelName must not be empty");

    const listModelResponse = await this._ollamaApi.listModels();
    if (listModelResponse.models?.length > 0) {
      const normalizedModelName = this.normalizeModelName(modelName);
      return listModelResponse.models.some(
        (model) => model.name === normalizedModelName,
      );
    }

    return false;
  }

  async deleteModel(modelName: string): Promise<void> {
    this.logger.info(`Start deletion of model: ${modelName}`);
    if (!(await this.isModelAvailable(modelName))) {
      this.logger.info(`Model ${modelName} not found`);
      return;
    }

    await this._ollamaApi.deleteModel({ model: modelName });
    this.logger.info(`Completed deletion of model: ${modelName}`);
  }

  async pullModel(
    modelName: string,
    pullModelStrategy: PullModelStrategy = this._options.pullModelStrategy,
  ): Promise<void> {
    if (pullModelStrategy === PullModelStrategy.NEVER) {
      return;
    }

    if (pullModelStrategy === PullModelStrategy.WHEN_MISSING) {
      if (await this.isModelAvailable(modelName)) {
        this.logger.debug(
          `Model '${modelName}' already available. Skipping pull operation.`,
        );
        return;
      }
    }

    this.logger.info(`Start pulling model: ${modelName}`);

    await this.consumePullStream(
      this._ollamaApi.pullModel({
        model: modelName,
        insecure: false,
        stream: true,
      }),
      modelName,
    );

    this.logger.info(`Completed pulling the '${modelName}' model`);
  }

  private normalizeModelName(modelName: string): string {
    const modelNameWithoutSpaces = modelName.trim();
    if (modelNameWithoutSpaces.includes(":")) {
      return modelNameWithoutSpaces;
    }
    return `${modelNameWithoutSpaces}:latest`;
  }

  private async consumePullStream(
    stream: Observable<OllamaApi.ProgressResponse>,
    modelName: string,
  ): Promise<void> {
    const progressResponses = await lastValueFrom(
      stream.pipe(
        timeout(this._options.timeout),
        retry({
          count: this._options.maxRetries,
          delay: (_error, retryCount) =>
            timer(5_000 * 2 ** Math.max(retryCount - 1, 0)),
        }),
        toArray(),
      ),
    );

    for (const progressBuffer of this.bufferByStatus(progressResponses)) {
      const lastProgressResponse =
        progressBuffer[progressBuffer.length - 1] ?? null;
      if (lastProgressResponse != null) {
        this.logger.info(
          `Pulling the '${modelName}' model - Status: ${lastProgressResponse.status}`,
        );
      }
    }
  }

  private bufferByStatus(
    progressResponses: OllamaApi.ProgressResponse[],
  ): OllamaApi.ProgressResponse[][] {
    const buffers: OllamaApi.ProgressResponse[][] = [];
    for (const progressResponse of progressResponses) {
      const currentBuffer = buffers.at(-1);
      if (
        currentBuffer == null ||
        currentBuffer[currentBuffer.length - 1]?.status !==
          progressResponse.status
      ) {
        buffers.push([progressResponse]);
      } else {
        currentBuffer.push(progressResponse);
      }
    }
    return buffers;
  }
}
