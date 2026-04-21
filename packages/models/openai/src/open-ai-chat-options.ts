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
import {
  type ChatOptions,
  DefaultToolCallingChatOptions,
  type StructuredOutputChatOptions,
  type ToolCallback,
  type ToolCallingChatOptions,
} from "@nestjs-ai/model";
import type { Milliseconds } from "@nestjs-port/core";
import { LoggerFactory } from "@nestjs-port/core";
import type { ClientOptions } from "openai";
import type {
  ChatCompletionAudioParam,
  ChatCompletionStreamOptions,
} from "openai/resources/chat/completions";
import type {
  ChatCompletionCreateParamsBase,
  ChatCompletionToolChoiceOption,
} from "openai/resources/chat/completions/completions";
import type {
  ReasoningEffort,
  ResponseFormatJSONObject,
  ResponseFormatJSONSchema,
  ResponseFormatText,
} from "openai/resources/shared";
import {
  AbstractOpenAiOptions,
  type AbstractOpenAiOptionsProps,
} from "./abstract-open-ai-options";

type OpenAiResponseFormat =
  | ResponseFormatText
  | ResponseFormatJSONObject
  | ResponseFormatJSONSchema;

function cloneResponseFormat(
  responseFormat: OpenAiResponseFormat,
): OpenAiResponseFormat {
  if (responseFormat.type === "json_schema") {
    return {
      type: "json_schema",
      json_schema: {
        ...responseFormat.json_schema,
        schema:
          responseFormat.json_schema.schema != null
            ? { ...responseFormat.json_schema.schema }
            : undefined,
      },
    };
  }

  return { ...responseFormat };
}

function createJsonSchemaResponseFormat(
  outputSchema: string,
): ResponseFormatJSONSchema {
  return {
    type: "json_schema",
    json_schema: {
      name: "json_schema",
      strict: true,
      schema: JSON.parse(outputSchema) as Record<string, unknown>,
    },
  };
}

type StructuredOutputChatOptionsBuilder = ChatOptions.Builder & {
  outputSchema(outputSchema: string | null): ChatOptions.Builder;
};

export interface OpenAiChatOptionsProps extends AbstractOpenAiOptionsProps {
  frequencyPenalty?: number | null;
  logitBias?: Record<string, number> | null;
  logprobs?: boolean | null;
  topLogprobs?: number | null;
  maxTokens?: number | null;
  maxCompletionTokens?: number | null;
  n?: number | null;
  outputModalities?: ChatCompletionCreateParamsBase["modalities"] | null;
  outputAudio?: ChatCompletionAudioParam | null;
  presencePenalty?: number | null;
  responseFormat?: OpenAiResponseFormat | null;
  streamOptions?: ChatCompletionStreamOptions | null;
  seed?: number | null;
  stop?: string[] | null;
  temperature?: number | null;
  topP?: number | null;
  toolChoice?: ChatCompletionToolChoiceOption | null;
  user?: string | null;
  parallelToolCalls?: boolean | null;
  store?: boolean | null;
  metadata?: Record<string, string> | null;
  reasoningEffort?: ReasoningEffort | null;
  verbosity?: ChatCompletionCreateParamsBase["verbosity"] | null;
  serviceTier?: ChatCompletionCreateParamsBase["service_tier"] | null;
  extraBody?: Record<string, unknown> | null;
  toolCallbacks?: ToolCallback[] | null;
  toolNames?: Set<string> | null;
  internalToolExecutionEnabled?: boolean | null;
  toolContext?: Record<string, unknown> | null;
}

/**
 * Configuration information for the Chat Model implementation using the OpenAI Java SDK.
 */
export class OpenAiChatOptions
  extends AbstractOpenAiOptions
  implements ToolCallingChatOptions, StructuredOutputChatOptions
{
  static readonly DEFAULT_CHAT_MODEL = "gpt-5-mini";
  readonly DEFAULT_TOOL_EXECUTION_ENABLED = true as const;

  private _frequencyPenalty: number | null = null;
  private _logitBias: Record<string, number> | null = null;
  private _logprobs: boolean | null = null;
  private _topLogprobs: number | null = null;
  private _maxTokens: number | null = null;
  private _maxCompletionTokens: number | null = null;
  private _n: number | null = null;
  private _outputModalities:
    | ChatCompletionCreateParamsBase["modalities"]
    | null = null;
  private _outputAudio: ChatCompletionAudioParam | null = null;
  private _presencePenalty: number | null = null;
  private _responseFormat: OpenAiResponseFormat | null = null;
  private _streamOptions: ChatCompletionStreamOptions | null = null;
  private _seed: number | null = null;
  private _stop: string[] | null = null;
  private _temperature: number | null = null;
  private _topP: number | null = null;
  private _toolChoice: ChatCompletionToolChoiceOption | null = null;
  private _user: string | null = null;
  private _parallelToolCalls: boolean | null = null;
  private _store: boolean | null = null;
  private _metadata: Record<string, string> | null = null;
  private _reasoningEffort: ReasoningEffort | null = null;
  private _verbosity: ChatCompletionCreateParamsBase["verbosity"] | null = null;
  private _serviceTier: ChatCompletionCreateParamsBase["service_tier"] | null =
    null;
  private _extraBody: Record<string, unknown> | null = null;
  private _toolCallbacks: ToolCallback[] = [];
  private _toolNames: Set<string> = new Set();
  private _internalToolExecutionEnabled: boolean | null = null;
  private _toolContext: Record<string, unknown> = {};

  constructor(props: OpenAiChatOptionsProps = {}) {
    super(props);
    this.setFrequencyPenalty(props.frequencyPenalty ?? null);
    this.setLogitBias(props.logitBias ?? null);
    this.setLogprobs(props.logprobs ?? null);
    this.setTopLogprobs(props.topLogprobs ?? null);
    this.setMaxTokens(props.maxTokens ?? null);
    this.setMaxCompletionTokens(props.maxCompletionTokens ?? null);
    this.setN(props.n ?? null);
    this.setOutputModalities(props.outputModalities ?? null);
    this.setOutputAudio(props.outputAudio ?? null);
    this.setPresencePenalty(props.presencePenalty ?? null);
    this.setResponseFormat(props.responseFormat ?? null);
    this.setStreamOptions(props.streamOptions ?? null);
    this.setSeed(props.seed ?? null);
    this.setStop(props.stop ?? null);
    this.setTemperature(props.temperature ?? null);
    this.setTopP(props.topP ?? null);
    this.setToolChoice(props.toolChoice ?? null);
    this.setUser(props.user ?? null);
    this.setParallelToolCalls(props.parallelToolCalls ?? null);
    this.setStore(props.store ?? null);
    this.setMetadata(props.metadata ?? null);
    this.setReasoningEffort(props.reasoningEffort ?? null);
    this.setVerbosity(props.verbosity ?? null);
    this.setServiceTier(props.serviceTier ?? null);
    this.setExtraBody(props.extraBody ?? null);
    if (props.toolCallbacks != null) {
      this.setToolCallbacks(props.toolCallbacks);
    }
    if (props.toolNames != null) {
      this.setToolNames(props.toolNames);
    }
    this.setInternalToolExecutionEnabled(
      props.internalToolExecutionEnabled ?? null,
    );
    if (props.toolContext != null) {
      this.setToolContext(props.toolContext);
    }
  }

  get frequencyPenalty(): number | null {
    return this._frequencyPenalty;
  }

  setFrequencyPenalty(frequencyPenalty: number | null): void {
    this._frequencyPenalty = frequencyPenalty ?? null;
  }

  get logitBias(): Record<string, number> | null {
    return this._logitBias != null ? { ...this._logitBias } : null;
  }

  setLogitBias(logitBias: Record<string, number> | null): void {
    this._logitBias = logitBias != null ? { ...logitBias } : null;
  }

  get logprobs(): boolean | null {
    return this._logprobs;
  }

  setLogprobs(logprobs: boolean | null): void {
    this._logprobs = logprobs ?? null;
  }

  get topLogprobs(): number | null {
    return this._topLogprobs;
  }

  setTopLogprobs(topLogprobs: number | null): void {
    this._topLogprobs = topLogprobs ?? null;
  }

  get maxTokens(): number | null {
    return this._maxTokens;
  }

  setMaxTokens(maxTokens: number | null): void {
    this._maxTokens = maxTokens ?? null;
  }

  get maxCompletionTokens(): number | null {
    return this._maxCompletionTokens;
  }

  setMaxCompletionTokens(maxCompletionTokens: number | null): void {
    this._maxCompletionTokens = maxCompletionTokens ?? null;
  }

  get n(): number | null {
    return this._n;
  }

  setN(n: number | null): void {
    this._n = n ?? null;
  }

  get outputModalities(): ChatCompletionCreateParamsBase["modalities"] | null {
    return this._outputModalities != null ? [...this._outputModalities] : null;
  }

  setOutputModalities(
    outputModalities: ChatCompletionCreateParamsBase["modalities"] | null,
  ): void {
    this._outputModalities =
      outputModalities != null ? [...outputModalities] : null;
  }

  get outputAudio(): ChatCompletionAudioParam | null {
    return this._outputAudio != null ? { ...this._outputAudio } : null;
  }

  setOutputAudio(outputAudio: ChatCompletionAudioParam | null): void {
    this._outputAudio = outputAudio != null ? { ...outputAudio } : null;
  }

  get presencePenalty(): number | null {
    return this._presencePenalty;
  }

  setPresencePenalty(presencePenalty: number | null): void {
    this._presencePenalty = presencePenalty ?? null;
  }

  get responseFormat(): OpenAiResponseFormat | null {
    return this._responseFormat != null
      ? cloneResponseFormat(this._responseFormat)
      : null;
  }

  setResponseFormat(responseFormat: OpenAiResponseFormat | null): void {
    this._responseFormat =
      responseFormat != null ? cloneResponseFormat(responseFormat) : null;
  }

  get streamOptions(): ChatCompletionStreamOptions | null {
    return this._streamOptions != null ? { ...this._streamOptions } : null;
  }

  setStreamOptions(streamOptions: ChatCompletionStreamOptions | null): void {
    this._streamOptions = streamOptions != null ? { ...streamOptions } : null;
  }

  get seed(): number | null {
    return this._seed;
  }

  setSeed(seed: number | null): void {
    this._seed = seed ?? null;
  }

  get stop(): string[] | null {
    return this._stop != null ? [...this._stop] : null;
  }

  setStop(stop: string[] | null): void {
    this._stop = stop != null ? [...stop] : null;
  }

  get stopSequences(): string[] | null {
    return this.stop;
  }

  setStopSequences(stopSequences: string[] | null): void {
    this.setStop(stopSequences);
  }

  get temperature(): number | null {
    return this._temperature;
  }

  setTemperature(temperature: number | null): void {
    this._temperature = temperature ?? null;
  }

  get topP(): number | null {
    return this._topP;
  }

  setTopP(topP: number | null): void {
    this._topP = topP ?? null;
  }

  get toolChoice(): ChatCompletionToolChoiceOption | null {
    return this._toolChoice;
  }

  setToolChoice(toolChoice: ChatCompletionToolChoiceOption | null): void {
    this._toolChoice = toolChoice ?? null;
  }

  get user(): string | null {
    return this._user;
  }

  setUser(user: string | null): void {
    this._user = user ?? null;
  }

  get parallelToolCalls(): boolean | null {
    return this._parallelToolCalls;
  }

  setParallelToolCalls(parallelToolCalls: boolean | null): void {
    this._parallelToolCalls = parallelToolCalls ?? null;
  }

  get store(): boolean | null {
    return this._store;
  }

  setStore(store: boolean | null): void {
    this._store = store ?? null;
  }

  get metadata(): Record<string, string> | null {
    return this._metadata != null ? { ...this._metadata } : null;
  }

  setMetadata(metadata: Record<string, string> | null): void {
    this._metadata = metadata != null ? { ...metadata } : null;
  }

  get reasoningEffort(): ReasoningEffort | null {
    return this._reasoningEffort;
  }

  setReasoningEffort(reasoningEffort: ReasoningEffort | null): void {
    this._reasoningEffort = reasoningEffort ?? null;
  }

  get verbosity(): ChatCompletionCreateParamsBase["verbosity"] | null {
    return this._verbosity;
  }

  setVerbosity(
    verbosity: ChatCompletionCreateParamsBase["verbosity"] | null,
  ): void {
    this._verbosity = verbosity ?? null;
  }

  get serviceTier(): ChatCompletionCreateParamsBase["service_tier"] | null {
    return this._serviceTier;
  }

  setServiceTier(
    serviceTier: ChatCompletionCreateParamsBase["service_tier"] | null,
  ): void {
    this._serviceTier = serviceTier ?? null;
  }

  get extraBody(): Record<string, unknown> | null {
    return this._extraBody != null ? { ...this._extraBody } : null;
  }

  setExtraBody(extraBody: Record<string, unknown> | null): void {
    this._extraBody = extraBody != null ? { ...extraBody } : null;
  }

  get toolCallbacks(): ToolCallback[] {
    return [...this._toolCallbacks];
  }

  setToolCallbacks(toolCallbacks: ToolCallback[]): void {
    assert(toolCallbacks, "toolCallbacks cannot be null");
    assert(
      toolCallbacks.every((toolCallback) => toolCallback != null),
      "toolCallbacks cannot contain null elements",
    );
    this._toolCallbacks = [...toolCallbacks];
  }

  get toolNames(): Set<string> {
    return new Set(this._toolNames);
  }

  setToolNames(toolNames: Set<string>): void {
    assert(toolNames, "toolNames cannot be null");
    assert(
      [...toolNames].every((toolName) => toolName != null),
      "toolNames cannot contain null elements",
    );
    for (const toolName of toolNames) {
      assert(
        typeof toolName === "string" && toolName.trim().length > 0,
        "toolNames cannot contain empty elements",
      );
    }
    this._toolNames = new Set(toolNames);
  }

  get internalToolExecutionEnabled(): boolean | null {
    return this._internalToolExecutionEnabled;
  }

  setInternalToolExecutionEnabled(
    internalToolExecutionEnabled: boolean | null,
  ): void {
    this._internalToolExecutionEnabled = internalToolExecutionEnabled;
  }

  get toolContext(): Record<string, unknown> {
    return this._toolContext;
  }

  setToolContext(toolContext: Record<string, unknown>): void {
    assert(toolContext, "toolContext cannot be null");
    this._toolContext = toolContext;
  }

  get topK(): null {
    return null;
  }

  get outputSchema(): string | null {
    if (this._responseFormat?.type !== "json_schema") {
      return null;
    }
    return this._responseFormat.json_schema.schema != null
      ? JSON.stringify(this._responseFormat.json_schema.schema)
      : null;
  }

  setOutputSchema(outputSchema: string | null): void {
    if (outputSchema != null) {
      this.setResponseFormat(createJsonSchemaResponseFormat(outputSchema));
      return;
    }

    this.setResponseFormat(null);
  }

  toString(): string {
    return (
      "OpenAiChatOptions{" +
      `model='${this.model}', ` +
      `temperature=${this.temperature}, ` +
      `topP=${this.topP}, ` +
      `maxTokens=${this.maxTokens}, ` +
      `maxCompletionTokens=${this.maxCompletionTokens}, ` +
      `frequencyPenalty=${this.frequencyPenalty}, ` +
      `presencePenalty=${this.presencePenalty}, ` +
      `extraBody=${JSON.stringify(this.extraBody)}, ` +
      `toolCallbacks=${this.toolCallbacks.length}, ` +
      `toolNames=${this.toolNames.size}` +
      "}"
    );
  }

  static builder(): OpenAiChatOptions.Builder {
    return new OpenAiChatOptions.Builder();
  }

  copy(): OpenAiChatOptions {
    return this.mutate().build();
  }

  /**
   * Create a builder pre-populated with the current option values.
   */
  mutate(): OpenAiChatOptions.Builder {
    return (
      OpenAiChatOptions.builder()
        // AbstractOpenAiOptions
        .baseUrl(this.baseUrl)
        .apiKey(this.apiKey)
        .azureADTokenProvider(this.azureADTokenProvider)
        .model(this.model)
        .deploymentName(this.deploymentName)
        .azureOpenAIServiceVersion(this.microsoftFoundryServiceVersion)
        .organizationId(this.organizationId)
        .azure(this.microsoftFoundry)
        .gitHubModels(this.gitHubModels)
        .timeout(this.timeout)
        .maxRetries(this.maxRetries)
        .fetchOptions(this.fetchOptions)
        .customHeaders(this.customHeaders)
        // ChatOptions
        .frequencyPenalty(this.frequencyPenalty)
        .maxTokens(this.maxTokens)
        .presencePenalty(this.presencePenalty)
        .stop(this.stop)
        .temperature(this.temperature)
        .topP(this.topP)
        // ToolCallingChatOptions
        .toolCallbacks(this.toolCallbacks)
        .toolNames(this.toolNames)
        .toolContext(this.toolContext)
        .internalToolExecutionEnabled(this.internalToolExecutionEnabled)
        // OpenAI SDK specific
        .logitBias(this.logitBias)
        .logprobs(this.logprobs)
        .topLogprobs(this.topLogprobs)
        .maxCompletionTokens(this.maxCompletionTokens)
        .N(this.n)
        .outputModalities(this.outputModalities)
        .outputAudio(this.outputAudio)
        .responseFormat(this.responseFormat)
        .streamOptions(this.streamOptions)
        .seed(this.seed)
        .toolChoice(this.toolChoice)
        .user(this.user)
        .parallelToolCalls(this.parallelToolCalls)
        .store(this.store)
        .metadata(this.metadata)
        .reasoningEffort(this.reasoningEffort)
        .verbosity(this.verbosity)
        .serviceTier(this.serviceTier)
        .extraBody(this.extraBody)
    );
  }
}

export namespace OpenAiChatOptions {
  export class Builder
    extends DefaultToolCallingChatOptions.Builder
    implements StructuredOutputChatOptionsBuilder
  {
    private static readonly logger = LoggerFactory.getLogger(
      OpenAiChatOptions.name,
    );

    private _baseUrl: string | null = null;
    private _apiKey: string | null = null;
    private _azureADTokenProvider: (() => Promise<string>) | null = null;
    private _deploymentName: string | null = null;
    private _microsoftFoundryServiceVersion: unknown = null;
    private _organizationId: string | null = null;
    private _microsoftFoundry: boolean | null = null;
    private _gitHubModels: boolean | null = null;
    private _timeout: Milliseconds | null = null;
    private _maxRetries: number | null = null;
    private _fetchOptions: ClientOptions["fetchOptions"] | null = null;
    private _customHeaders: Record<string, string> = {};

    private _logitBias: Record<string, number> | null = null;
    private _logprobs: boolean | null = null;
    private _topLogprobs: number | null = null;
    private _maxCompletionTokens: number | null = null;
    private _n: number | null = null;
    private _outputModalities:
      | ChatCompletionCreateParamsBase["modalities"]
      | null = null;
    private _outputAudio: ChatCompletionAudioParam | null = null;
    private _responseFormat: OpenAiResponseFormat | null = null;
    private _streamOptions: ChatCompletionStreamOptions | null = null;
    private _seed: number | null = null;
    private _toolChoice: ChatCompletionToolChoiceOption | null = null;
    private _user: string | null = null;
    private _parallelToolCalls: boolean | null = null;
    private _store: boolean | null = null;
    private _metadata: Record<string, string> | null = null;
    private _reasoningEffort: ReasoningEffort | null = null;
    private _verbosity: ChatCompletionCreateParamsBase["verbosity"] | null =
      null;
    private _serviceTier:
      | ChatCompletionCreateParamsBase["service_tier"]
      | null = null;
    private _extraBody: Record<string, unknown> | null = null;

    baseUrl(baseUrl: string | null): this {
      this._baseUrl = baseUrl;
      return this;
    }

    apiKey(apiKey: string | null): this {
      this._apiKey = apiKey;
      return this;
    }

    azureADTokenProvider(
      azureADTokenProvider: (() => Promise<string>) | null,
    ): this {
      this._azureADTokenProvider = azureADTokenProvider;
      return this;
    }

    azureOpenAIServiceVersion(azureOpenAIServiceVersion: unknown): this {
      this._microsoftFoundryServiceVersion = azureOpenAIServiceVersion;
      return this;
    }

    organizationId(organizationId: string | null): this {
      this._organizationId = organizationId;
      return this;
    }

    deploymentName(deploymentName: string | null): this {
      this._deploymentName = deploymentName;
      return this;
    }

    combineWith(other: this): this {
      super.combineWith(other);
      if (other instanceof Builder) {
        if (other._baseUrl != null) {
          this._baseUrl = other._baseUrl;
        }
        if (other._apiKey != null) {
          this._apiKey = other._apiKey;
        }
        if (other._azureADTokenProvider != null) {
          this._azureADTokenProvider = other._azureADTokenProvider;
        }
        if (other._deploymentName != null) {
          this._deploymentName = other._deploymentName;
        }
        if (other._microsoftFoundryServiceVersion != null) {
          this._microsoftFoundryServiceVersion =
            other._microsoftFoundryServiceVersion;
        }
        if (other._organizationId != null) {
          this._organizationId = other._organizationId;
        }
        if (other._microsoftFoundry != null) {
          this._microsoftFoundry = other._microsoftFoundry;
        }
        if (other._gitHubModels != null) {
          this._gitHubModels = other._gitHubModels;
        }
        if (other._timeout != null) {
          this._timeout = other._timeout;
        }
        if (other._maxRetries != null) {
          this._maxRetries = other._maxRetries;
        }
        if (other._fetchOptions != null) {
          this._fetchOptions = other._fetchOptions;
        }
        if (Object.keys(other._customHeaders).length > 0) {
          this._customHeaders = { ...other._customHeaders };
        }
        if (other._logitBias != null) {
          this._logitBias = { ...other._logitBias };
        }
        if (other._logprobs != null) {
          this._logprobs = other._logprobs;
        }
        if (other._topLogprobs != null) {
          this._topLogprobs = other._topLogprobs;
        }
        if (other._maxTokens != null) {
          this._maxTokens = other._maxTokens;
        }
        if (other._maxCompletionTokens != null) {
          this._maxCompletionTokens = other._maxCompletionTokens;
        }
        if (other._n != null) {
          this._n = other._n;
        }
        if (other._outputModalities != null) {
          this._outputModalities = [...other._outputModalities];
        }
        if (other._outputAudio != null) {
          this._outputAudio = { ...other._outputAudio };
        }
        if (other._presencePenalty != null) {
          this._presencePenalty = other._presencePenalty;
        }
        if (other._responseFormat != null) {
          this._responseFormat = cloneResponseFormat(other._responseFormat);
        }
        if (other._streamOptions != null) {
          this._streamOptions = { ...other._streamOptions };
        }
        if (other._seed != null) {
          this._seed = other._seed;
        }
        if (other._stopSequences != null) {
          this._stopSequences = [...other._stopSequences];
        }
        if (other._temperature != null) {
          this._temperature = other._temperature;
        }
        if (other._topP != null) {
          this._topP = other._topP;
        }
        if (other._toolChoice != null) {
          this._toolChoice = other._toolChoice;
        }
        if (other._user != null) {
          this._user = other._user;
        }
        if (other._parallelToolCalls != null) {
          this._parallelToolCalls = other._parallelToolCalls;
        }
        if (other._store != null) {
          this._store = other._store;
        }
        if (other._metadata != null) {
          this._metadata = { ...other._metadata };
        }
        if (other._reasoningEffort != null) {
          this._reasoningEffort = other._reasoningEffort;
        }
        if (other._verbosity != null) {
          this._verbosity = other._verbosity;
        }
        if (other._serviceTier != null) {
          this._serviceTier = other._serviceTier;
        }
        if (other._extraBody != null) {
          this._extraBody = {
            ...this._extraBody,
            ...other._extraBody,
          };
        }
      }
      return this;
    }

    azure(azure: boolean): this {
      this._microsoftFoundry = azure;
      return this;
    }

    gitHubModels(gitHubModels: boolean): this {
      this._gitHubModels = gitHubModels;
      return this;
    }

    timeout(timeout: Milliseconds | null): this {
      this._timeout = timeout;
      return this;
    }

    maxRetries(maxRetries: number | null): this {
      this._maxRetries = maxRetries;
      return this;
    }

    fetchOptions(fetchOptions: ClientOptions["fetchOptions"] | null): this {
      this._fetchOptions = fetchOptions;
      return this;
    }

    customHeaders(customHeaders: Record<string, string> | null): this {
      this._customHeaders = customHeaders != null ? { ...customHeaders } : {};
      return this;
    }

    logitBias(logitBias: Record<string, number> | null): this {
      this._logitBias = logitBias != null ? { ...logitBias } : null;
      return this;
    }

    logprobs(logprobs: boolean | null): this {
      this._logprobs = logprobs;
      return this;
    }

    topLogprobs(topLogprobs: number | null): this {
      this._topLogprobs = topLogprobs;
      return this;
    }

    maxTokens(maxTokens: number | null): this {
      if (maxTokens != null && this._maxCompletionTokens != null) {
        Builder.logger.warn(
          "Both maxTokens and maxCompletionTokens are set. OpenAI API does not support setting both parameters simultaneously. As maxToken is deprecated, we will ignore it and use maxCompletionToken ({}).",
          this._maxCompletionTokens,
        );
        return this;
      }
      this._maxTokens = maxTokens;
      return this;
    }

    maxCompletionTokens(maxCompletionTokens: number | null): this {
      if (maxCompletionTokens != null && this._maxTokens != null) {
        Builder.logger.warn(
          "Both maxTokens and maxCompletionTokens are set. OpenAI API does not support setting both parameters simultaneously. As maxToken is deprecated, we will use maxCompletionToken ({}).",
          maxCompletionTokens,
        );
        this._maxTokens = null;
      }
      this._maxCompletionTokens = maxCompletionTokens;
      return this;
    }

    N(n: number | null): this {
      this._n = n;
      return this;
    }

    outputModalities(
      outputModalities: ChatCompletionCreateParamsBase["modalities"] | null,
    ): this {
      this._outputModalities =
        outputModalities != null ? [...outputModalities] : null;
      return this;
    }

    outputAudio(audio: ChatCompletionAudioParam | null): this {
      this._outputAudio = audio;
      return this;
    }

    presencePenalty(presencePenalty: number | null): this {
      this._presencePenalty = presencePenalty;
      return this;
    }

    responseFormat(responseFormat: OpenAiResponseFormat | null): this {
      this._responseFormat =
        responseFormat != null ? cloneResponseFormat(responseFormat) : null;
      return this;
    }

    outputSchema(outputSchema: string | null): this {
      if (outputSchema != null) {
        this._responseFormat = createJsonSchemaResponseFormat(outputSchema);
        return this;
      }
      this._responseFormat = null;
      return this;
    }

    streamOptions(streamOptions: ChatCompletionStreamOptions | null): this {
      this._streamOptions = streamOptions != null ? { ...streamOptions } : null;
      return this;
    }

    streamUsage(streamUsage: boolean): this {
      this._streamOptions = {
        ...this._streamOptions,
        include_usage: streamUsage,
      };
      return this;
    }

    toolCallbacks(toolCallbacks: ToolCallback[] | null): this;
    toolCallbacks(...toolCallbacks: ToolCallback[]): this;
    toolCallbacks(...toolCallbacks: unknown[]): this {
      if (toolCallbacks.length === 1) {
        const [singleValue] = toolCallbacks;
        if (singleValue == null) {
          this._toolCallbacks = null;
          return this;
        }
        if (Array.isArray(singleValue)) {
          this._toolCallbacks = [...singleValue];
          return this;
        }
      }
      this._toolCallbacks = toolCallbacks as ToolCallback[];
      return this;
    }

    toolNames(toolNames: Set<string> | null): this;
    toolNames(...toolNames: string[]): this;
    toolNames(...toolNames: unknown[]): this {
      if (toolNames.length === 1) {
        const [singleValue] = toolNames;
        if (singleValue == null) {
          this._toolNames = null;
          return this;
        }
        if (singleValue instanceof Set) {
          this._toolNames = new Set(singleValue);
          return this;
        }
      }
      this._toolNames = new Set(toolNames as string[]);
      return this;
    }

    toolContext(context: Record<string, unknown> | null): this;
    toolContext(key: string, value: unknown): this;
    toolContext(...args: unknown[]): this {
      if (args.length === 1) {
        const [singleValue] = args;
        if (singleValue == null) {
          this._toolContext = null;
          return this;
        }
        this._toolContext = { ...(singleValue as Record<string, unknown>) };
        return this;
      }

      if (args.length === 2) {
        const [key, value] = args;
        assert(
          typeof key === "string" && key.trim().length > 0,
          "key cannot be null",
        );
        assert(value != null, "value cannot be null");
        this._toolContext = {
          ...this._toolContext,
          [key]: value,
        };
        return this;
      }

      this._toolContext = {};
      return this;
    }

    seed(seed: number | null): this {
      this._seed = seed;
      return this;
    }

    stop(stop: string[] | null): this {
      this._stopSequences = stop != null ? [...stop] : null;
      return this;
    }

    temperature(temperature: number | null): this {
      this._temperature = temperature;
      return this;
    }

    topP(topP: number | null): this {
      this._topP = topP;
      return this;
    }

    toolChoice(toolChoice: ChatCompletionToolChoiceOption | null): this {
      this._toolChoice = toolChoice;
      return this;
    }

    user(user: string | null): this {
      this._user = user;
      return this;
    }

    parallelToolCalls(parallelToolCalls: boolean | null): this {
      this._parallelToolCalls = parallelToolCalls;
      return this;
    }

    store(store: boolean | null): this {
      this._store = store;
      return this;
    }

    metadata(metadata: Record<string, string> | null): this {
      this._metadata = metadata != null ? { ...metadata } : null;
      return this;
    }

    reasoningEffort(reasoningEffort: ReasoningEffort | null): this {
      this._reasoningEffort = reasoningEffort;
      return this;
    }

    verbosity(
      verbosity: ChatCompletionCreateParamsBase["verbosity"] | null,
    ): this {
      this._verbosity = verbosity;
      return this;
    }

    serviceTier(
      serviceTier: ChatCompletionCreateParamsBase["service_tier"] | null,
    ): this {
      this._serviceTier = serviceTier;
      return this;
    }

    extraBody(extraBody: Record<string, unknown> | null): this {
      this._extraBody = extraBody != null ? { ...extraBody } : null;
      return this;
    }

    build(): OpenAiChatOptions {
      return new OpenAiChatOptions({
        baseUrl: this._baseUrl,
        apiKey: this._apiKey,
        azureADTokenProvider: this._azureADTokenProvider,
        model: this._model,
        deploymentName: this._deploymentName,
        microsoftFoundryServiceVersion: this._microsoftFoundryServiceVersion,
        organizationId: this._organizationId,
        microsoftFoundry: this._microsoftFoundry ?? false,
        gitHubModels: this._gitHubModels ?? false,
        timeout: this._timeout ?? AbstractOpenAiOptions.DEFAULT_TIMEOUT,
        maxRetries:
          this._maxRetries ?? AbstractOpenAiOptions.DEFAULT_MAX_RETRIES,
        fetchOptions: this._fetchOptions,
        customHeaders: { ...this._customHeaders },
        frequencyPenalty: this._frequencyPenalty,
        logitBias: this._logitBias != null ? { ...this._logitBias } : null,
        logprobs: this._logprobs,
        topLogprobs: this._topLogprobs,
        maxTokens: this._maxTokens,
        maxCompletionTokens: this._maxCompletionTokens,
        n: this._n,
        outputModalities:
          this._outputModalities != null ? [...this._outputModalities] : null,
        outputAudio: this._outputAudio,
        presencePenalty: this._presencePenalty,
        responseFormat:
          this._responseFormat != null
            ? cloneResponseFormat(this._responseFormat)
            : null,
        streamOptions: this._streamOptions,
        seed: this._seed,
        stop: this._stopSequences != null ? [...this._stopSequences] : null,
        temperature: this._temperature,
        topP: this._topP,
        toolChoice: this._toolChoice,
        user: this._user,
        parallelToolCalls: this._parallelToolCalls,
        store: this._store,
        metadata: this._metadata != null ? { ...this._metadata } : null,
        reasoningEffort: this._reasoningEffort,
        verbosity: this._verbosity,
        serviceTier: this._serviceTier,
        extraBody: this._extraBody != null ? { ...this._extraBody } : null,
        toolCallbacks:
          this._toolCallbacks != null ? [...this._toolCallbacks] : null,
        toolNames: this._toolNames != null ? new Set(this._toolNames) : null,
        internalToolExecutionEnabled: this._internalToolExecutionEnabled,
        toolContext:
          this._toolContext != null ? { ...this._toolContext } : null,
      });
    }
  }
}
