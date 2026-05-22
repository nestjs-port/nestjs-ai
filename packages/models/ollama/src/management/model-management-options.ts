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

import { type Milliseconds, ms } from "@nestjs-port/core";

import { PullModelStrategy } from "./pull-model-strategy.js";

const DEFAULT_TIMEOUT = ms(300_000);

export interface ModelManagementOptionsProps {
  /**
   * The strategy to pull models.
   */
  pullModelStrategy?: PullModelStrategy;

  /**
   * Additional models to manage.
   */
  additionalModels?: string[];

  /**
   * The timeout for managing models.
   */
  timeout?: Milliseconds;

  /**
   * The maximum number of retries.
   */
  maxRetries?: number;
}

/**
 * Options for managing models in Ollama.
 */
export class ModelManagementOptions {
  private readonly _pullModelStrategy: PullModelStrategy;

  private readonly _additionalModels: string[];

  private readonly _timeout: Milliseconds;

  private readonly _maxRetries: number;

  constructor(props: ModelManagementOptionsProps = {}) {
    this._pullModelStrategy =
      props.pullModelStrategy ?? PullModelStrategy.NEVER;
    this._additionalModels = [...(props.additionalModels ?? [])];
    this._timeout = props.timeout ?? DEFAULT_TIMEOUT;
    this._maxRetries = props.maxRetries ?? 0;
  }

  get pullModelStrategy(): PullModelStrategy {
    return this._pullModelStrategy;
  }

  get additionalModels(): string[] {
    return [...this._additionalModels];
  }

  get timeout(): Milliseconds {
    return this._timeout;
  }

  get maxRetries(): number {
    return this._maxRetries;
  }

  static defaults(): ModelManagementOptions {
    return new ModelManagementOptions();
  }
}
