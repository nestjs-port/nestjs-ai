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
import { StringUtils } from "@nestjs-ai/commons";
import {
  DefaultToolCallingChatOptions,
  type StructuredOutputChatOptions,
  type ToolCallback,
  type ToolCallingChatOptions,
} from "@nestjs-ai/model";
import type {
  GoogleGenAiSafetySetting,
  GoogleGenAiThinkingLevel,
} from "./common";

export class GoogleGenAiChatOptions
  implements ToolCallingChatOptions, StructuredOutputChatOptions
{
  readonly DEFAULT_TOOL_EXECUTION_ENABLED = true as const;

  stopSequences?: string[];

  temperature?: number;

  topP?: number;

  topK?: number;

  candidateCount?: number;

  maxOutputTokens?: number;

  model?: string;

  responseMimeType?: string;

  responseSchema?: string;

  frequencyPenalty?: number;

  presencePenalty?: number;

  thinkingBudget?: number;

  includeThoughts?: boolean;

  thinkingLevel?: GoogleGenAiThinkingLevel;

  includeExtendedUsageMetadata?: boolean;

  cachedContentName?: string;

  useCachedContent?: boolean;

  autoCacheThreshold?: number;

  autoCacheTtl?: string;

  toolCallbacks: ToolCallback[] = [];

  toolNames: Set<string> = new Set();

  internalToolExecutionEnabled: boolean | null = null;

  toolContext: Record<string, unknown> = {};

  googleSearchRetrieval = false;

  includeServerSideToolInvocations = false;

  safetySettings: GoogleGenAiSafetySetting[] = [];

  labels: Record<string, string> = {};

  constructor(options?: Partial<GoogleGenAiChatOptions>) {
    if (options) {
      if (options.stopSequences !== undefined)
        this.stopSequences = options.stopSequences;
      if (options.temperature !== undefined)
        this.temperature = options.temperature;
      if (options.topP !== undefined) this.topP = options.topP;
      if (options.topK !== undefined) this.topK = options.topK;
      if (options.candidateCount !== undefined)
        this.candidateCount = options.candidateCount;
      if (options.maxOutputTokens !== undefined)
        this.maxOutputTokens = options.maxOutputTokens;
      if (options.model !== undefined) this.model = options.model;
      if (options.responseMimeType !== undefined)
        this.responseMimeType = options.responseMimeType;
      if (options.responseSchema !== undefined)
        this.responseSchema = options.responseSchema;
      if (options.frequencyPenalty !== undefined)
        this.frequencyPenalty = options.frequencyPenalty;
      if (options.presencePenalty !== undefined)
        this.presencePenalty = options.presencePenalty;
      if (options.thinkingBudget !== undefined)
        this.thinkingBudget = options.thinkingBudget;
      if (options.includeThoughts !== undefined)
        this.includeThoughts = options.includeThoughts;
      if (options.thinkingLevel !== undefined)
        this.thinkingLevel = options.thinkingLevel;
      if (options.includeExtendedUsageMetadata !== undefined)
        this.includeExtendedUsageMetadata =
          options.includeExtendedUsageMetadata;
      if (options.cachedContentName !== undefined)
        this.cachedContentName = options.cachedContentName;
      if (options.useCachedContent !== undefined)
        this.useCachedContent = options.useCachedContent;
      if (options.autoCacheThreshold !== undefined)
        this.autoCacheThreshold = options.autoCacheThreshold;
      if (options.autoCacheTtl !== undefined)
        this.autoCacheTtl = options.autoCacheTtl;
      if (options.toolCallbacks !== undefined)
        this.toolCallbacks = [...options.toolCallbacks];
      if (options.toolNames !== undefined)
        this.toolNames = new Set(options.toolNames);
      if (options.internalToolExecutionEnabled !== undefined)
        this.internalToolExecutionEnabled =
          options.internalToolExecutionEnabled;
      if (options.toolContext !== undefined)
        this.toolContext = { ...options.toolContext };
      if (options.googleSearchRetrieval !== undefined)
        this.googleSearchRetrieval = options.googleSearchRetrieval;
      if (options.includeServerSideToolInvocations !== undefined)
        this.includeServerSideToolInvocations =
          options.includeServerSideToolInvocations;
      if (options.safetySettings !== undefined)
        this.safetySettings = [...options.safetySettings];
      if (options.labels !== undefined) this.labels = { ...options.labels };
    }
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

  get maxTokens(): number | undefined {
    return this.maxOutputTokens;
  }

  setMaxTokens(maxTokens: number | undefined): void {
    this.maxOutputTokens = maxTokens;
  }

  get outputSchema(): string {
    return this.responseSchema ?? "";
  }

  setOutputSchema(jsonSchemaText: string): void {
    this.responseSchema = jsonSchemaText;
    this.responseMimeType = "application/json";
  }

  mutate(): GoogleGenAiChatOptions.Builder {
    return GoogleGenAiChatOptions.builder()
      .model(this.model ?? null)
      .frequencyPenalty(this.frequencyPenalty ?? null)
      .maxOutputTokens(this.maxTokens ?? null)
      .presencePenalty(this.presencePenalty ?? null)
      .stopSequences(
        this.stopSequences != null ? [...this.stopSequences] : null,
      )
      .temperature(this.temperature ?? null)
      .topK(this.topK ?? null)
      .topP(this.topP ?? null)
      .toolCallbacks(this.toolCallbacks)
      .toolNames(this.toolNames)
      .toolContext(this.toolContext)
      .internalToolExecutionEnabled(this.internalToolExecutionEnabled)
      .candidateCount(this.candidateCount ?? null)
      .responseMimeType(this.responseMimeType ?? null)
      .responseSchema(this.responseSchema ?? null)
      .thinkingBudget(this.thinkingBudget ?? null)
      .includeThoughts(this.includeThoughts ?? null)
      .thinkingLevel(this.thinkingLevel ?? null)
      .includeExtendedUsageMetadata(this.includeExtendedUsageMetadata ?? null)
      .cachedContentName(this.cachedContentName ?? null)
      .useCachedContent(this.useCachedContent ?? null)
      .autoCacheThreshold(this.autoCacheThreshold ?? null)
      .autoCacheTtl(this.autoCacheTtl ?? null)
      .googleSearchRetrieval(this.googleSearchRetrieval)
      .includeServerSideToolInvocations(this.includeServerSideToolInvocations)
      .safetySettings(this.safetySettings)
      .labels(this.labels);
  }

  copy(): GoogleGenAiChatOptions {
    return this.mutate().build();
  }

  static fromOptions(
    fromOptions: GoogleGenAiChatOptions,
  ): GoogleGenAiChatOptions {
    return fromOptions.copy();
  }

  static builder(): GoogleGenAiChatOptions.Builder {
    return new GoogleGenAiChatOptions.Builder();
  }

  toString(): string {
    const labels = Object.entries(this.labels)
      .map(([key, value]) => `${key}=${value}`)
      .join(", ");
    return (
      "GoogleGenAiChatOptions{" +
      `stopSequences=${this.stopSequences ? `[${this.stopSequences.join(", ")}]` : null}, ` +
      `temperature=${this.temperature}, ` +
      `topP=${this.topP}, ` +
      `topK=${this.topK}, ` +
      `frequencyPenalty=${this.frequencyPenalty}, ` +
      `presencePenalty=${this.presencePenalty}, ` +
      `thinkingBudget=${this.thinkingBudget}, ` +
      `includeThoughts=${this.includeThoughts}, ` +
      `thinkingLevel=${this.thinkingLevel}, ` +
      `candidateCount=${this.candidateCount}, ` +
      `maxOutputTokens=${this.maxOutputTokens}, ` +
      `model='${this.model}', ` +
      `responseMimeType='${this.responseMimeType}', ` +
      `toolCallbacks=${this.toolCallbacks}, ` +
      `toolNames=${this.toolNames}, ` +
      `googleSearchRetrieval=${this.googleSearchRetrieval}, ` +
      `includeServerSideToolInvocations=${this.includeServerSideToolInvocations}, ` +
      `safetySettings=${this.safetySettings}, ` +
      `labels={${labels}}` +
      "}"
    );
  }
}

export namespace GoogleGenAiChatOptions {
  export class Builder extends DefaultToolCallingChatOptions.Builder {
    protected _candidateCount: number | null = null;
    protected _responseMimeType: string | null = null;
    protected _responseSchema: string | null = null;
    protected _thinkingBudget: number | null = null;
    protected _includeThoughts: boolean | null = null;
    protected _thinkingLevel: GoogleGenAiThinkingLevel | null = null;
    protected _includeExtendedUsageMetadata: boolean | null = null;
    protected _cachedContentName: string | null = null;
    protected _useCachedContent: boolean | null = null;
    protected _autoCacheThreshold: number | null = null;
    protected _autoCacheTtl: string | null = null;
    protected _googleSearchRetrieval: boolean | null = null;
    protected _includeServerSideToolInvocations: boolean | null = null;
    protected _safetySettings: GoogleGenAiSafetySetting[] | null = null;
    protected _labels: Record<string, string> | null = null;

    clone(): this {
      const copy = super.clone() as this;
      if (this._safetySettings != null) {
        copy._safetySettings = [...this._safetySettings];
      }
      if (this._labels != null) {
        copy._labels = { ...this._labels };
      }
      return copy;
    }

    combineWith(other: this): this {
      super.combineWith(other);
      if (other instanceof Builder) {
        if (other._candidateCount != null) {
          this._candidateCount = other._candidateCount;
        }
        if (other._responseMimeType != null) {
          this._responseMimeType = other._responseMimeType;
        }
        if (other._responseSchema != null) {
          this._responseSchema = other._responseSchema;
        }
        if (other._thinkingBudget != null) {
          this._thinkingBudget = other._thinkingBudget;
        }
        if (other._includeThoughts != null) {
          this._includeThoughts = other._includeThoughts;
        }
        if (other._thinkingLevel != null) {
          this._thinkingLevel = other._thinkingLevel;
        }
        if (other._includeExtendedUsageMetadata != null) {
          this._includeExtendedUsageMetadata =
            other._includeExtendedUsageMetadata;
        }
        if (other._cachedContentName != null) {
          this._cachedContentName = other._cachedContentName;
        }
        if (other._useCachedContent != null) {
          this._useCachedContent = other._useCachedContent;
        }
        if (other._autoCacheThreshold != null) {
          this._autoCacheThreshold = other._autoCacheThreshold;
        }
        if (other._autoCacheTtl != null) {
          this._autoCacheTtl = other._autoCacheTtl;
        }
        if (other._googleSearchRetrieval != null) {
          this._googleSearchRetrieval = other._googleSearchRetrieval;
        }
        if (other._includeServerSideToolInvocations != null) {
          this._includeServerSideToolInvocations =
            other._includeServerSideToolInvocations;
        }
        if (other._safetySettings != null) {
          this._safetySettings = [...other._safetySettings];
        }
        if (other._labels != null) {
          this._labels = { ...other._labels };
        }
      }
      return this;
    }

    maxOutputTokens(maxOutputTokens: number | null): this {
      return this.maxTokens(maxOutputTokens);
    }

    candidateCount(candidateCount: number | null): this {
      this._candidateCount = candidateCount;
      return this;
    }

    responseMimeType(responseMimeType: string | null): this {
      this._responseMimeType = responseMimeType;
      return this;
    }

    responseSchema(responseSchema: string | null): this {
      this._responseSchema = responseSchema;
      return this;
    }

    outputSchema(jsonSchema: string | null): this {
      this._responseSchema = jsonSchema;
      this._responseMimeType = jsonSchema != null ? "application/json" : null;
      return this;
    }

    thinkingBudget(thinkingBudget: number | null): this {
      this._thinkingBudget = thinkingBudget;
      return this;
    }

    includeThoughts(includeThoughts: boolean | null): this {
      this._includeThoughts = includeThoughts;
      return this;
    }

    thinkingLevel(thinkingLevel: GoogleGenAiThinkingLevel | null): this {
      this._thinkingLevel = thinkingLevel;
      return this;
    }

    includeExtendedUsageMetadata(
      includeExtendedUsageMetadata: boolean | null,
    ): this {
      this._includeExtendedUsageMetadata = includeExtendedUsageMetadata;
      return this;
    }

    cachedContentName(cachedContentName: string | null): this {
      this._cachedContentName = cachedContentName;
      return this;
    }

    useCachedContent(useCachedContent: boolean | null): this {
      this._useCachedContent = useCachedContent;
      return this;
    }

    autoCacheThreshold(autoCacheThreshold: number | null): this {
      this._autoCacheThreshold = autoCacheThreshold;
      return this;
    }

    autoCacheTtl(autoCacheTtl: string | null): this {
      this._autoCacheTtl = autoCacheTtl;
      return this;
    }

    googleSearchRetrieval(googleSearchRetrieval: boolean | null): this {
      this._googleSearchRetrieval = googleSearchRetrieval;
      return this;
    }

    includeServerSideToolInvocations(
      includeServerSideToolInvocations: boolean | null,
    ): this {
      this._includeServerSideToolInvocations = includeServerSideToolInvocations;
      return this;
    }

    safetySettings(safetySettings: GoogleGenAiSafetySetting[] | null): this {
      assert(safetySettings, "safetySettings cannot be null");
      this._safetySettings = [...safetySettings];
      return this;
    }

    labels(labels: Record<string, string> | null): this {
      assert(labels, "labels cannot be null");
      this._labels = { ...labels };
      return this;
    }

    build(): GoogleGenAiChatOptions {
      const options = new GoogleGenAiChatOptions();
      if (this._stopSequences != null) {
        options.stopSequences = [...this._stopSequences];
      }
      if (this._temperature != null) {
        options.temperature = this._temperature;
      }
      if (this._topP != null) {
        options.topP = this._topP;
      }
      if (this._topK != null) {
        options.topK = this._topK;
      }
      if (this._candidateCount != null) {
        options.candidateCount = this._candidateCount;
      }
      if (this._maxTokens != null) {
        options.maxOutputTokens = this._maxTokens;
      }
      if (this._model != null) {
        options.model = this._model;
      }
      if (this._responseSchema != null) {
        options.responseSchema = this._responseSchema;
      }
      if (this._responseMimeType != null) {
        options.responseMimeType = this._responseMimeType;
      }
      if (this._frequencyPenalty != null) {
        options.frequencyPenalty = this._frequencyPenalty;
      }
      if (this._presencePenalty != null) {
        options.presencePenalty = this._presencePenalty;
      }
      if (this._thinkingBudget != null) {
        options.thinkingBudget = this._thinkingBudget;
      }
      if (this._includeThoughts != null) {
        options.includeThoughts = this._includeThoughts;
      }
      if (this._thinkingLevel != null) {
        options.thinkingLevel = this._thinkingLevel;
      }
      if (this._includeExtendedUsageMetadata != null) {
        options.includeExtendedUsageMetadata =
          this._includeExtendedUsageMetadata;
      }
      if (this._cachedContentName != null) {
        options.cachedContentName = this._cachedContentName;
      }
      if (this._useCachedContent != null) {
        options.useCachedContent = this._useCachedContent;
      }
      if (this._autoCacheThreshold != null) {
        options.autoCacheThreshold = this._autoCacheThreshold;
      }
      if (this._autoCacheTtl != null) {
        options.autoCacheTtl = this._autoCacheTtl;
      }
      if (this._toolCallbacks != null) {
        options.setToolCallbacks(this._toolCallbacks);
      }
      if (this._toolNames != null) {
        options.setToolNames(this._toolNames);
      }
      if (this._toolContext != null) {
        options.setToolContext(this._toolContext);
      }
      options.setInternalToolExecutionEnabled(
        this._internalToolExecutionEnabled,
      );
      if (this._googleSearchRetrieval != null) {
        options.googleSearchRetrieval = this._googleSearchRetrieval;
      }
      if (this._includeServerSideToolInvocations != null) {
        options.includeServerSideToolInvocations =
          this._includeServerSideToolInvocations;
      }
      if (this._safetySettings != null) {
        options.safetySettings = [...this._safetySettings];
      }
      if (this._labels != null) {
        options.labels = { ...this._labels };
      }
      return options;
    }
  }
}
