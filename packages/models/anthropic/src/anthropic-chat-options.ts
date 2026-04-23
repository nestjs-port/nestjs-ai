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
import type { ClientOptions as AnthropicClientOptions } from "@anthropic-ai/sdk";
import type {
  Metadata as AnthropicSdkMetadata,
  Model as AnthropicSdkModel,
  OutputConfig,
  ThinkingConfigAdaptive,
  ThinkingConfigEnabled,
  ThinkingConfigParam,
  ToolChoice,
} from "@anthropic-ai/sdk/resources/messages";
import {
  DefaultToolCallingChatOptions,
  type StructuredOutputChatOptions,
  type ToolCallback,
  type ToolCallingChatOptions,
} from "@nestjs-ai/model";
import type { Milliseconds } from "@nestjs-port/core";
import { StringUtils } from "@nestjs-port/core";

import { AbstractAnthropicOptions } from "./abstract-anthropic-options.js";
import { AnthropicCacheOptions } from "./anthropic-cache-options.js";
import { AnthropicCacheStrategy } from "./anthropic-cache-strategy.js";
import type { AnthropicCitationDocument } from "./anthropic-citation-document.js";
import type { AnthropicServiceTier } from "./anthropic-service-tier.js";
import { AnthropicSkill } from "./anthropic-skill.js";
import { AnthropicSkillContainer } from "./anthropic-skill-container.js";
import { AnthropicSkillRecord } from "./anthropic-skill-record.js";
import { AnthropicSkillType } from "./anthropic-skill-type.js";
import type { AnthropicWebSearchTool } from "./anthropic-web-search-tool.js";

export interface AnthropicChatOptionsProps {
  model?: string | null;
  baseUrl?: string | null;
  apiKey?: string | null;
  timeout?: Milliseconds | null;
  maxRetries?: number | null;
  fetch?: AnthropicClientOptions["fetch"] | null;
  fetchOptions?: AnthropicClientOptions["fetchOptions"] | null;
  customHeaders?: Record<string, string> | null;

  maxTokens?: number | null;
  metadata?: AnthropicSdkMetadata | null;
  stopSequences?: string[] | null;
  temperature?: number | null;
  topP?: number | null;
  topK?: number | null;
  toolChoice?: ToolChoice | null;
  thinking?: ThinkingConfigParam | null;
  disableParallelToolUse?: boolean | null;
  toolCallbacks?: ToolCallback[];
  toolNames?: Set<string>;
  internalToolExecutionEnabled?: boolean | null;
  toolContext?: Record<string, unknown>;
  citationDocuments?: AnthropicCitationDocument[];
  cacheOptions?: AnthropicCacheOptions;
  outputConfig?: OutputConfig | null;
  httpHeaders?: Record<string, string>;
  skillContainer?: AnthropicSkillContainer | null;
  inferenceGeo?: string | null;
  webSearchTool?: AnthropicWebSearchTool | null;
  serviceTier?: AnthropicServiceTier | null;
  outputSchema?: string | null;
}

/**
 * Chat options for {@link AnthropicChatModel}. Supports model selection, sampling
 * parameters (temperature, topP, topK), output control (maxTokens, stopSequences), and
 * tool calling configuration.
 *
 * Options can be set as defaults during model construction or overridden per-request via
 * the {@link Prompt}.
 *
 * @see AnthropicChatModel
 * @see {@link https://docs.anthropic.com/en/api/messages Anthropic Messages API}
 */
export class AnthropicChatOptions
  extends AbstractAnthropicOptions
  implements ToolCallingChatOptions, StructuredOutputChatOptions
{
  /**
   * Default model to use for chat completions.
   */
  static readonly DEFAULT_MODEL: AnthropicSdkModel = "claude-haiku-4-5";

  /**
   * Default max tokens for chat completions.
   */
  static readonly DEFAULT_MAX_TOKENS = 4096;

  readonly DEFAULT_TOOL_EXECUTION_ENABLED = true as const;

  maxTokens: number | null = null;

  metadata: AnthropicSdkMetadata | null = null;

  stopSequences: string[] | null = null;

  temperature: number | null = null;

  topP: number | null = null;

  topK: number | null = null;

  toolChoice: ToolChoice | null = null;

  thinking: ThinkingConfigParam | null = null;

  disableParallelToolUse: boolean | null = null;

  toolCallbacks: ToolCallback[] = [];

  toolNames: Set<string> = new Set();

  internalToolExecutionEnabled: boolean | null = null;

  toolContext: Record<string, unknown> = {};

  citationDocuments: AnthropicCitationDocument[] = [];

  cacheOptions: AnthropicCacheOptions = AnthropicCacheOptions.disabled();

  outputConfig: OutputConfig | null = null;

  httpHeaders: Record<string, string> = {};

  skillContainer: AnthropicSkillContainer | null = null;

  inferenceGeo: string | null = null;

  webSearchTool: AnthropicWebSearchTool | null = null;

  serviceTier: AnthropicServiceTier | null = null;

  constructor(options: AnthropicChatOptionsProps = {}) {
    super();
    const {
      model,
      baseUrl,
      apiKey,
      timeout,
      maxRetries,
      fetch,
      fetchOptions,
      customHeaders,
      maxTokens,
      metadata,
      stopSequences,
      temperature,
      topP,
      topK,
      toolChoice,
      thinking,
      disableParallelToolUse,
      toolCallbacks,
      toolNames,
      internalToolExecutionEnabled,
      toolContext,
      citationDocuments,
      cacheOptions,
      outputConfig,
      httpHeaders,
      skillContainer,
      inferenceGeo,
      webSearchTool,
      serviceTier,
      outputSchema,
    } = options;

    if (model != null) this.setModel(model);
    if (baseUrl != null) this.setBaseUrl(baseUrl);
    if (apiKey != null) this.setApiKey(apiKey);
    if (timeout != null) this.setTimeout(timeout);
    if (maxRetries != null) this.setMaxRetries(maxRetries);
    if (fetch != null) this.setFetch(fetch);
    if (fetchOptions != null) this.setFetchOptions(fetchOptions);
    if (customHeaders != null) this.setCustomHeaders(customHeaders);

    if (maxTokens != null) this.maxTokens = maxTokens;
    if (metadata != null) this.metadata = metadata;
    if (stopSequences != null) this.stopSequences = [...stopSequences];
    if (temperature != null) this.temperature = temperature;
    if (topP != null) this.topP = topP;
    if (topK != null) this.topK = topK;
    if (toolChoice != null) this.toolChoice = toolChoice;
    if (thinking != null) this.thinking = thinking;
    if (disableParallelToolUse != null)
      this.disableParallelToolUse = disableParallelToolUse;
    if (toolCallbacks != null) this.toolCallbacks = [...toolCallbacks];
    if (toolNames != null) this.toolNames = new Set(toolNames);
    if (internalToolExecutionEnabled != null)
      this.internalToolExecutionEnabled = internalToolExecutionEnabled;
    if (toolContext != null) this.toolContext = { ...toolContext };
    if (citationDocuments != null)
      this.citationDocuments = [...citationDocuments];
    if (cacheOptions != null) this.cacheOptions = cacheOptions;
    if (outputConfig != null) this.outputConfig = outputConfig;
    if (httpHeaders != null) this.httpHeaders = { ...httpHeaders };
    if (skillContainer != null) this.skillContainer = skillContainer;
    if (inferenceGeo != null) this.inferenceGeo = inferenceGeo;
    if (webSearchTool != null) this.webSearchTool = webSearchTool;
    if (serviceTier != null) this.serviceTier = serviceTier;
    if (outputSchema != null) this.setOutputSchema(outputSchema);

    this.validateCitationConsistency();
  }

  /**
   * Creates a new builder for AnthropicChatOptions.
   */
  static builder(): AnthropicChatOptionsBuilder {
    return new AnthropicChatOptionsBuilder();
  }

  get frequencyPenalty(): number | null {
    return null;
  }

  get presencePenalty(): number | null {
    return null;
  }

  setToolCallbacks(toolCallbacks: ToolCallback[]): void {
    assert(toolCallbacks, "toolCallbacks cannot be null");
    assert(
      toolCallbacks.every((toolCallback) => toolCallback != null),
      "toolCallbacks cannot contain null elements",
    );
    this.toolCallbacks = toolCallbacks;
  }

  setToolNames(toolNames: Set<string>): void {
    assert(toolNames, "toolNames cannot be null");
    assert(
      [...toolNames].every((toolName) => toolName != null),
      "toolNames cannot contain null elements",
    );
    for (const toolName of toolNames) {
      assert(
        StringUtils.hasText(toolName),
        "toolNames cannot contain empty elements",
      );
    }
    this.toolNames = toolNames;
  }

  setInternalToolExecutionEnabled(
    internalToolExecutionEnabled: boolean | null,
  ): void {
    this.internalToolExecutionEnabled = internalToolExecutionEnabled;
  }

  setToolContext(toolContext: Record<string, unknown>): void {
    this.toolContext = toolContext;
  }

  setCitationDocuments(citationDocuments: AnthropicCitationDocument[]): void {
    assert(citationDocuments != null, "citationDocuments cannot be null");
    this.citationDocuments = citationDocuments;
  }

  setCacheOptions(cacheOptions: AnthropicCacheOptions): void {
    assert(cacheOptions != null, "cacheOptions cannot be null");
    this.cacheOptions = cacheOptions;
  }

  /**
   * Validate that all citation documents have consistent citation settings. Anthropic
   * requires all documents to have citations enabled if any do.
   */
  validateCitationConsistency(): void {
    if (this.citationDocuments.length === 0) {
      return;
    }

    const hasEnabledCitations = this.citationDocuments.some((doc) =>
      doc.isCitationsEnabled(),
    );
    const hasDisabledCitations = this.citationDocuments.some(
      (doc) => !doc.isCitationsEnabled(),
    );

    if (hasEnabledCitations && hasDisabledCitations) {
      throw new Error(
        "Anthropic Citations API requires all documents to have consistent citation settings. " +
          "Either enable citations for all documents or disable for all documents.",
      );
    }
  }

  get outputSchema(): string | null {
    if (this.outputConfig == null || this.outputConfig.format == null) {
      return null;
    }
    return JSON.stringify(this.outputConfig.format.schema);
  }

  setOutputSchema(outputSchema: string | null): void {
    if (outputSchema == null) {
      this.outputConfig = null;
      return;
    }
    const parsed = JSON.parse(outputSchema) as Record<string, unknown>;
    const schema: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed)) {
      // Strip JSON Schema meta-fields not supported by the Anthropic API
      if (key === "$schema" || key === "$defs") {
        continue;
      }
      schema[key] = value;
    }
    this.outputConfig = {
      ...this.outputConfig,
      format: { type: "json_schema", schema },
    };
  }

  copy(): AnthropicChatOptions {
    return new AnthropicChatOptions(this);
  }

  mutate(): AnthropicChatOptionsBuilder {
    return (
      AnthropicChatOptions.builder()
        // AbstractAnthropicOptions
        .model(this.model)
        .baseUrl(this.baseUrl)
        .apiKey(this.apiKey)
        .timeout(this.timeout)
        .maxRetries(this.maxRetries)
        .fetch(this.fetch)
        .fetchOptions(this.fetchOptions)
        .customHeaders(this.customHeaders)
        // ChatOptions
        .frequencyPenalty(this.frequencyPenalty)
        .maxTokens(this.maxTokens)
        .presencePenalty(this.presencePenalty)
        .stopSequences(
          this.stopSequences != null ? [...this.stopSequences] : null,
        )
        .temperature(this.temperature)
        .topK(this.topK)
        .topP(this.topP)
        // ToolCallingChatOptions
        .toolCallbacks(this.toolCallbacks)
        .toolNames(this.toolNames)
        .toolContext(this.toolContext)
        .internalToolExecutionEnabled(this.internalToolExecutionEnabled)
        // Anthropic Specific
        .metadata(this.metadata)
        .toolChoice(this.toolChoice)
        .thinking(this.thinking)
        .disableParallelToolUse(this.disableParallelToolUse)
        .citationDocuments(this.citationDocuments)
        .cacheOptions(this.cacheOptions)
        .outputConfig(this.outputConfig)
        .httpHeaders(this.httpHeaders)
        .skillContainer(this.skillContainer)
        .inferenceGeo(this.inferenceGeo)
        .webSearchTool(this.webSearchTool)
        .serviceTier(this.serviceTier)
    );
  }
}

/**
 * Builder for creating {@link AnthropicChatOptions} instances.
 */
export class AnthropicChatOptionsBuilder
  extends DefaultToolCallingChatOptions.Builder
  implements StructuredOutputChatOptions.Builder
{
  // AbstractAnthropicOptions fields
  private _baseUrl: string | null = null;
  private _apiKey: string | null = null;
  private _timeout: Milliseconds | null = null;
  private _maxRetries: number | null = null;
  private _customHeaders: Record<string, string> = {};
  private _fetch: AnthropicClientOptions["fetch"] | null = null;
  private _fetchOptions: AnthropicClientOptions["fetchOptions"] | null = null;

  // Anthropic-specific fields
  private _metadata: AnthropicSdkMetadata | null = null;
  private _toolChoice: ToolChoice | null = null;
  private _thinking: ThinkingConfigParam | null = null;
  private _disableParallelToolUse: boolean | null = null;
  private _citationDocuments: AnthropicCitationDocument[] = [];
  private _cacheOptions: AnthropicCacheOptions =
    AnthropicCacheOptions.disabled();
  private _outputConfig: OutputConfig | null = null;
  private _httpHeaders: Record<string, string> = {};
  private _skillContainer: AnthropicSkillContainer | null = null;
  private _inferenceGeo: string | null = null;
  private _webSearchTool: AnthropicWebSearchTool | null = null;
  private _serviceTier: AnthropicServiceTier | null = null;

  clone(): this {
    const copy = super.clone() as this;
    if (Object.keys(this._customHeaders).length > 0) {
      copy._customHeaders = { ...this._customHeaders };
    }
    if (this._citationDocuments.length > 0) {
      copy._citationDocuments = [...this._citationDocuments];
    }
    if (Object.keys(this._httpHeaders).length > 0) {
      copy._httpHeaders = { ...this._httpHeaders };
    }
    return copy;
  }

  combineWith(other: this): this {
    super.combineWith(other);
    if (other instanceof AnthropicChatOptionsBuilder) {
      if (other._baseUrl != null) {
        this._baseUrl = other._baseUrl;
      }
      if (other._apiKey != null) {
        this._apiKey = other._apiKey;
      }
      if (other._timeout != null) {
        this._timeout = other._timeout;
      }
      if (other._maxRetries != null) {
        this._maxRetries = other._maxRetries;
      }
      if (other._fetch != null) {
        this._fetch = other._fetch;
      }
      if (other._fetchOptions != null) {
        this._fetchOptions = other._fetchOptions;
      }
      if (Object.keys(other._customHeaders).length > 0) {
        this._customHeaders = { ...other._customHeaders };
      }
      if (other._metadata != null) {
        this._metadata = other._metadata;
      }
      if (other._toolChoice != null) {
        this._toolChoice = other._toolChoice;
      }
      if (other._thinking != null) {
        this._thinking = other._thinking;
      }
      if (other._disableParallelToolUse != null) {
        this._disableParallelToolUse = other._disableParallelToolUse;
      }
      if (other._citationDocuments.length > 0) {
        this._citationDocuments = [...other._citationDocuments];
      }
      if (other._cacheOptions.strategy !== AnthropicCacheStrategy.NONE) {
        this._cacheOptions = other._cacheOptions;
      }
      if (other._outputConfig != null) {
        this._outputConfig = { ...other._outputConfig };
      }
      if (Object.keys(other._httpHeaders).length > 0) {
        this._httpHeaders = { ...other._httpHeaders };
      }
      if (other._skillContainer != null) {
        this._skillContainer = other._skillContainer;
      }
      if (other._inferenceGeo != null) {
        this._inferenceGeo = other._inferenceGeo;
      }
      if (other._webSearchTool != null) {
        this._webSearchTool = other._webSearchTool;
      }
      if (other._serviceTier != null) {
        this._serviceTier = other._serviceTier;
      }
    }
    return this;
  }

  baseUrl(baseUrl: string | null): this {
    this._baseUrl = baseUrl ?? null;
    return this;
  }

  apiKey(apiKey: string | null): this {
    this._apiKey = apiKey ?? null;
    return this;
  }

  timeout(timeout: Milliseconds | null): this {
    this._timeout = timeout ?? null;
    return this;
  }

  maxRetries(maxRetries: number | null): this {
    this._maxRetries = maxRetries ?? null;
    return this;
  }

  fetch(fetch: AnthropicChatOptions["fetch"]): this {
    this._fetch = fetch ?? null;
    return this;
  }

  fetchOptions(fetchOptions: AnthropicChatOptions["fetchOptions"]): this {
    this._fetchOptions = fetchOptions ?? null;
    return this;
  }

  customHeaders(customHeaders: Record<string, string> | null): this {
    this._customHeaders = customHeaders != null ? { ...customHeaders } : {};
    return this;
  }

  metadata(metadata: AnthropicSdkMetadata | null): this {
    this._metadata = metadata;
    return this;
  }

  toolChoice(toolChoice: ToolChoice | null): this {
    this._toolChoice = toolChoice;
    return this;
  }

  thinking(thinking: ThinkingConfigParam | null): this {
    this._thinking = thinking;
    return this;
  }

  /**
   * Convenience method to enable thinking with a specific budget in tokens.
   */
  thinkingEnabled(
    budgetTokens: number,
    display?: ThinkingConfigEnabled["display"],
  ): this {
    const config: ThinkingConfigEnabled = {
      type: "enabled",
      budget_tokens: budgetTokens,
    };
    if (display != null) {
      config.display = display;
    }
    return this.thinking(config);
  }

  /**
   * Convenience method to let Claude adaptively decide whether to think.
   */
  thinkingAdaptive(display?: ThinkingConfigAdaptive["display"]): this {
    const config: ThinkingConfigAdaptive = { type: "adaptive" };
    if (display != null) {
      config.display = display;
    }
    return this.thinking(config);
  }

  /**
   * Convenience method to explicitly disable thinking.
   */
  thinkingDisabled(): this {
    return this.thinking({ type: "disabled" });
  }

  disableParallelToolUse(disableParallelToolUse: boolean | null): this {
    this._disableParallelToolUse = disableParallelToolUse;
    return this;
  }

  citationDocuments(citationDocuments: AnthropicCitationDocument[]): this {
    assert(citationDocuments != null, "citationDocuments cannot be null");
    this._citationDocuments = [...citationDocuments];
    return this;
  }

  addCitationDocument(citationDocument: AnthropicCitationDocument): this {
    assert(citationDocument != null, "citationDocument cannot be null");
    this._citationDocuments.push(citationDocument);
    return this;
  }

  cacheOptions(cacheOptions: AnthropicCacheOptions): this {
    assert(cacheOptions != null, "cacheOptions cannot be null");
    this._cacheOptions = cacheOptions;
    return this;
  }

  outputConfig(outputConfig: OutputConfig | null): this {
    this._outputConfig = outputConfig;
    return this;
  }

  effort(effort: NonNullable<OutputConfig["effort"]>): this {
    this._outputConfig = {
      ...this._outputConfig,
      effort,
    };
    return this;
  }

  outputSchema(outputSchema: string | null): this {
    if (outputSchema == null) {
      this._outputConfig = null;
      return this;
    }
    const parsed = JSON.parse(outputSchema) as Record<string, unknown>;
    const schema: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (key === "$schema" || key === "$defs") {
        continue;
      }
      schema[key] = value;
    }
    this._outputConfig = {
      ...this._outputConfig,
      format: { type: "json_schema", schema },
    };
    return this;
  }

  httpHeaders(httpHeaders: Record<string, string>): this {
    this._httpHeaders = { ...httpHeaders };
    return this;
  }

  skillContainer(skillContainer: AnthropicSkillContainer | null): this {
    this._skillContainer = skillContainer;
    return this;
  }

  /**
   * Enables Anthropic's built-in web search tool with the given configuration.
   */
  webSearchTool(webSearchTool: AnthropicWebSearchTool | null): this {
    this._webSearchTool = webSearchTool;
    return this;
  }

  /**
   * Sets the service tier for capacity routing.
   */
  serviceTier(serviceTier: AnthropicServiceTier | null): this {
    this._serviceTier = serviceTier;
    return this;
  }

  skill(
    skillIdOrName: string | AnthropicSkill | AnthropicSkillRecord,
    version?: string,
  ): this {
    let record: AnthropicSkillRecord;
    if (skillIdOrName instanceof AnthropicSkillRecord) {
      record = skillIdOrName;
    } else if (skillIdOrName instanceof AnthropicSkill) {
      record =
        version != null
          ? skillIdOrName.toSkill(version)
          : skillIdOrName.toSkill();
    } else {
      assert(
        StringUtils.hasText(skillIdOrName),
        "Skill ID or name cannot be empty",
      );
      const prebuilt = AnthropicSkill.fromId(skillIdOrName);
      if (prebuilt != null) {
        record =
          version != null ? prebuilt.toSkill(version) : prebuilt.toSkill();
      } else {
        record =
          version != null
            ? new AnthropicSkillRecord({
                type: AnthropicSkillType.CUSTOM,
                skillId: skillIdOrName,
                version,
              })
            : new AnthropicSkillRecord({
                type: AnthropicSkillType.CUSTOM,
                skillId: skillIdOrName,
              });
      }
    }

    if (this._skillContainer == null) {
      this._skillContainer = AnthropicSkillContainer.builder()
        .skill(record)
        .build();
    } else {
      this._skillContainer = new AnthropicSkillContainer([
        ...this._skillContainer.skills,
        record,
      ]);
    }
    return this;
  }

  skills(skillIds: string[]): this {
    assert(skillIds.length > 0, "Skill IDs cannot be empty");
    for (const skillId of skillIds) {
      this.skill(skillId);
    }
    return this;
  }

  inferenceGeo(inferenceGeo: string | null): this {
    this._inferenceGeo = inferenceGeo;
    return this;
  }

  build(): AnthropicChatOptions {
    return new AnthropicChatOptions({
      model: this._model,
      baseUrl: this._baseUrl,
      apiKey: this._apiKey,
      timeout: this._timeout,
      maxRetries: this._maxRetries,
      fetch: this._fetch,
      fetchOptions: this._fetchOptions,
      customHeaders: this._customHeaders,
      maxTokens: this._maxTokens,
      metadata: this._metadata,
      stopSequences: this._stopSequences,
      temperature: this._temperature,
      topP: this._topP,
      topK: this._topK,
      toolChoice: this._toolChoice,
      thinking: this._thinking,
      disableParallelToolUse: this._disableParallelToolUse,
      toolCallbacks: this._toolCallbacks ?? undefined,
      toolNames: this._toolNames ?? undefined,
      internalToolExecutionEnabled: this._internalToolExecutionEnabled,
      toolContext: this._toolContext ?? undefined,
      citationDocuments: this._citationDocuments,
      cacheOptions: this._cacheOptions,
      outputConfig: this._outputConfig,
      httpHeaders: this._httpHeaders,
      skillContainer: this._skillContainer,
      inferenceGeo: this._inferenceGeo,
      webSearchTool: this._webSearchTool,
      serviceTier: this._serviceTier,
    });
  }
}
