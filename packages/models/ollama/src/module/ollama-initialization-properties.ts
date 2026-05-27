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

import type { PullModelStrategy } from "../management/pull-model-strategy.js";

/**
 * Shared initialization settings for Ollama chat and embedding modules.
 */
export interface OllamaInitializationProperties {
  pullModelStrategy?: PullModelStrategy;
  timeout?: Milliseconds;
  maxRetries?: number;
  include?: boolean;
  additionalModels?: string[];
}
