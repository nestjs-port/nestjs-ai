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
  StructuredOutputChatOptions,
  ToolCallback,
  ToolCallingChatOptions,
} from "@nestjs-ai/model";
import type {
  AudioParameters,
  FunctionTool,
  ResponseFormat,
  StreamOptions,
  WebSearchOptions,
} from "./api";

export class OpenAiChatOptions
  implements ToolCallingChatOptions, StructuredOutputChatOptions
{
  readonly DEFAULT_TOOL_EXECUTION_ENABLED = true as const;

  model?: string;

  frequencyPenalty?: number;

  logitBias?: Record<string, number>;

  logprobs?: boolean;

  topLogprobs?: number;

  maxTokens?: number;

  maxCompletionTokens?: number;

  n?: number;

  outputModalities?: string[];

  outputAudio?: AudioParameters;

  presencePenalty?: number;

  responseFormat?: ResponseFormat;

  streamOptions?: StreamOptions;

  seed?: number;

  stop?: string[];

  temperature?: number;

  topP?: number;

  topK?: number;

  tools?: FunctionTool[];

  toolChoice?: string | { type: string; function: { name: string } };

  user?: string;

  parallelToolCalls?: boolean;

  store?: boolean;

  metadata?: Record<string, string>;

  reasoningEffort?: string;

  verbosity?: string;

  webSearchOptions?: WebSearchOptions;

  serviceTier?: string;

  promptCacheKey?: string;

  safetyIdentifier?: string;

  extraBody?: Record<string, unknown>;

  toolCallbacks: ToolCallback[] = [];

  toolNames: Set<string> = new Set();

  internalToolExecutionEnabled: boolean | null = null;

  httpHeaders: Record<string, string> = {};

  toolContext: Record<string, unknown> = {};

  constructor(options?: Partial<OpenAiChatOptions>) {
    if (options) {
      if (options.model != null) this.model = options.model;
      if (options.frequencyPenalty != null)
        this.frequencyPenalty = options.frequencyPenalty;
      if (options.logitBias != null) this.logitBias = options.logitBias;
      if (options.logprobs != null) this.logprobs = options.logprobs;
      if (options.topLogprobs != null) this.topLogprobs = options.topLogprobs;
      if (options.maxTokens != null) this.maxTokens = options.maxTokens;
      if (options.maxCompletionTokens != null)
        this.maxCompletionTokens = options.maxCompletionTokens;
      if (options.n != null) this.n = options.n;
      if (options.outputModalities != null)
        this.outputModalities = [...options.outputModalities];
      if (options.outputAudio != null) this.outputAudio = options.outputAudio;
      if (options.presencePenalty != null)
        this.presencePenalty = options.presencePenalty;
      if (options.responseFormat != null)
        this.responseFormat = options.responseFormat;
      if (options.streamOptions != null)
        this.streamOptions = options.streamOptions;
      if (options.seed != null) this.seed = options.seed;
      if (options.stop != null) this.stop = [...options.stop];
      if (options.temperature != null) this.temperature = options.temperature;
      if (options.topP != null) this.topP = options.topP;
      if (options.topK != null) this.topK = options.topK;
      if (options.tools != null) this.tools = options.tools;
      if (options.toolChoice != null) this.toolChoice = options.toolChoice;
      if (options.user != null) this.user = options.user;
      if (options.parallelToolCalls != null)
        this.parallelToolCalls = options.parallelToolCalls;
      if (options.store != null) this.store = options.store;
      if (options.metadata != null) this.metadata = { ...options.metadata };
      if (options.reasoningEffort != null)
        this.reasoningEffort = options.reasoningEffort;
      if (options.verbosity != null) this.verbosity = options.verbosity;
      if (options.webSearchOptions != null)
        this.webSearchOptions = options.webSearchOptions;
      if (options.serviceTier != null) this.serviceTier = options.serviceTier;
      if (options.promptCacheKey != null)
        this.promptCacheKey = options.promptCacheKey;
      if (options.safetyIdentifier != null)
        this.safetyIdentifier = options.safetyIdentifier;
      if (options.extraBody != null) this.extraBody = { ...options.extraBody };
      if (options.toolCallbacks != null)
        this.toolCallbacks = [...options.toolCallbacks];
      if (options.toolNames != null)
        this.toolNames = new Set(options.toolNames);
      if (options.internalToolExecutionEnabled != null)
        this.internalToolExecutionEnabled =
          options.internalToolExecutionEnabled;
      if (options.httpHeaders != null)
        this.httpHeaders = { ...options.httpHeaders };
      if (options.toolContext != null)
        this.toolContext = { ...options.toolContext };
    }
  }

  get stopSequences(): string[] | undefined {
    return this.stop;
  }

  set stopSequences(stopSequences: string[] | undefined) {
    this.stop = stopSequences;
  }

  get streamUsage(): boolean {
    return this.streamOptions != null;
  }

  set streamUsage(enableStreamUsage: boolean) {
    this.streamOptions = enableStreamUsage
      ? { include_usage: true }
      : undefined;
  }

  get outputSchema(): string {
    return this.responseFormat?.json_schema
      ? JSON.stringify(this.responseFormat.json_schema)
      : "";
  }

  set outputSchema(outputSchema: string) {
    this.responseFormat = {
      type: "json_schema",
      json_schema: JSON.parse(outputSchema),
    };
  }

  copy(): OpenAiChatOptions {
    return new OpenAiChatOptions(this);
  }
}
