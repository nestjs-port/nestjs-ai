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

import { strict as assert } from "node:assert";

import type {
  AudioContent,
  ClientCapabilities,
  CreateMessageRequest,
  ImageContent,
  Implementation,
  LoggingLevel,
  Request,
  SamplingMessage,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";

import type { McpServerExchange } from "./mcp-server-exchange.js";

export type ContextInclusionStrategy =
  CreateMessageRequest["params"]["includeContext"];

export interface McpRequestContextTypes<ET = McpServerExchange> {
  // --------------------------------------
  // Getters
  // --------------------------------------
  request(): Request;

  exchange(): ET;

  sessionId(): string | undefined;

  clientInfo(): Implementation | undefined;

  clientCapabilities(): ClientCapabilities | undefined;

  // TODO: Should we rename it to meta()?
  requestMeta(): Record<string, unknown> | undefined;
}

// --------------------------------------
// Elicitation
// --------------------------------------

export interface ElicitationSpec {
  message(message: string): ElicitationSpec;

  meta(m: Record<string, unknown>): ElicitationSpec;

  meta(k: string, v: unknown): ElicitationSpec;
}

// --------------------------------------
// Sampling
// --------------------------------------

export interface ModelPreferenceSpec {
  modelHints(...models: string[]): ModelPreferenceSpec;

  modelHint(modelHint: string): ModelPreferenceSpec;

  costPriority(costPriority: number): ModelPreferenceSpec;

  speedPriority(speedPriority: number): ModelPreferenceSpec;

  intelligencePriority(intelligencePriority: number): ModelPreferenceSpec;
}

export interface SamplingSpec {
  message(...content: AudioContent[]): SamplingSpec;

  message(...content: ImageContent[]): SamplingSpec;

  message(...content: TextContent[]): SamplingSpec;

  message(...text: string[]): SamplingSpec;

  message(...message: SamplingMessage[]): SamplingSpec;

  modelPreferences(
    modelPreferenceSpec: (spec: ModelPreferenceSpec) => void,
  ): SamplingSpec;

  systemPrompt(systemPrompt: string): SamplingSpec;

  includeContextStrategy(
    includeContextStrategy: ContextInclusionStrategy,
  ): SamplingSpec;

  temperature(temperature: number): SamplingSpec;

  maxTokens(maxTokens: number): SamplingSpec;

  stopSequences(...stopSequences: string[]): SamplingSpec;

  metadata(m: Record<string, unknown>): SamplingSpec;

  metadata(k: string, v: unknown): SamplingSpec;

  meta(m: Record<string, unknown>): SamplingSpec;

  meta(k: string, v: unknown): SamplingSpec;
}

// --------------------------------------
// Progress
// --------------------------------------

export interface ProgressSpec {
  progress(progress: number): ProgressSpec;

  total(total: number): ProgressSpec;

  message(message: string | null | undefined): ProgressSpec;

  meta(m: Record<string, unknown>): ProgressSpec;

  meta(k: string, v: unknown): ProgressSpec;
}

export function progressPercentage(
  spec: ProgressSpec,
  percentage: number,
): ProgressSpec {
  assert(
    percentage >= 0 && percentage <= 100,
    "Percentage must be between 0 and 100",
  );
  return spec.progress(percentage).total(100);
}

// --------------------------------------
// Logging
// --------------------------------------

export interface LoggingSpec {
  message(message: string): LoggingSpec;

  logger(logger: string): LoggingSpec;

  level(level: LoggingLevel): LoggingSpec;

  meta(m: Record<string, unknown>): LoggingSpec;

  meta(k: string, v: unknown): LoggingSpec;
}
