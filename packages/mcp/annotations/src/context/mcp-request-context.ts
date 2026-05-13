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

import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";
import type {
  CreateMessageRequest,
  CreateMessageResult,
  ElicitRequest,
  ElicitResult,
  ListRootsResult,
  ProgressNotification,
} from "@modelcontextprotocol/server";
import type { McpServerExchange } from "@nestjs-ai/mcp-common";

import type {
  ElicitationSpec,
  LoggingSpec,
  McpRequestContextTypes,
  ProgressSpec,
  SamplingSpec,
} from "./mcp-request-context-types.js";
import type { StructuredElicitResult } from "./structured-elicit-result.js";

export type ElicitationSchema<T> = StandardSchemaV1<unknown, T> &
  StandardJSONSchemaV1;

export interface McpRequestContext extends McpRequestContextTypes<McpServerExchange> {
  // --------------------------------------
  // Roots
  // --------------------------------------
  rootsEnabled(): Promise<boolean>;

  roots(): Promise<ListRootsResult>;

  // --------------------------------------
  // Elicitation
  // --------------------------------------
  elicitEnabled(): Promise<boolean>;

  elicit<T>(schema: ElicitationSchema<T>): Promise<StructuredElicitResult<T>>;

  elicit<T>(
    spec: (params: ElicitationSpec) => void,
    schema: ElicitationSchema<T>,
  ): Promise<StructuredElicitResult<T>>;

  elicit(elicitRequest: ElicitRequest): Promise<ElicitResult>;

  // --------------------------------------
  // Sampling
  // --------------------------------------
  sampleEnabled(): Promise<boolean>;

  sample(...messages: string[]): Promise<CreateMessageResult>;

  sample(
    samplingSpec: (spec: SamplingSpec) => void,
  ): Promise<CreateMessageResult>;

  sample(
    createMessageRequest: CreateMessageRequest,
  ): Promise<CreateMessageResult>;

  // --------------------------------------
  // Progress
  // --------------------------------------
  progress(percentage: number): Promise<void>;

  progress(progressSpec: (spec: ProgressSpec) => void): Promise<void>;

  progress(progressNotification: ProgressNotification): Promise<void>;

  // --------------------------------------
  // Ping
  // --------------------------------------
  ping(): Promise<unknown>;

  // --------------------------------------
  // Logging
  // --------------------------------------
  log(logSpec: (spec: LoggingSpec) => void): Promise<void>;

  debug(message: string): Promise<void>;

  info(message: string): Promise<void>;

  warn(message: string): Promise<void>;

  error(message: string): Promise<void>;
}
