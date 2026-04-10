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
import type { ChatOptions } from "../../chat";
import type { ToolCallback } from "../../tool";
import type { ToolCallingChatOptions } from "./tool-calling-chat-options.interface";

export class DefaultToolCallingChatOptions implements ToolCallingChatOptions {
  readonly DEFAULT_TOOL_EXECUTION_ENABLED = true as const;

  private _toolCallbacks: ToolCallback[] | null = null;
  private _toolNames: Set<string> | null = null;
  private _toolContext: Record<string, unknown> | null = null;
  private _internalToolExecutionEnabled: boolean | null = null;
  private _model: string | null = null;
  private _frequencyPenalty: number | null = null;
  private _maxTokens: number | null = null;
  private _presencePenalty: number | null = null;
  private _stopSequences: string[] | null = null;
  private _temperature: number | null = null;
  private _topK: number | null = null;
  private _topP: number | null = null;

  get toolCallbacks(): ToolCallback[] {
    return this._toolCallbacks != null ? [...this._toolCallbacks] : [];
  }

  setToolCallbacks(toolCallbacks: ToolCallback[]): void {
    assert(toolCallbacks, "toolCallbacks cannot be null");
    this._toolCallbacks = [...toolCallbacks];
  }

  get toolNames(): Set<string> {
    return this._toolNames != null ? new Set(this._toolNames) : new Set();
  }

  setToolNames(toolNames: Set<string>): void {
    assert(toolNames, "toolNames cannot be null");
    this._toolNames = new Set(toolNames);
  }

  get toolContext(): Record<string, unknown> {
    return this._toolContext != null ? { ...this._toolContext } : {};
  }

  setToolContext(toolContext: Record<string, unknown>): void {
    assert(toolContext, "toolContext cannot be null");
    this._toolContext = { ...toolContext };
  }

  get internalToolExecutionEnabled(): boolean | null {
    return this._internalToolExecutionEnabled;
  }

  setInternalToolExecutionEnabled(
    internalToolExecutionEnabled: boolean | null,
  ): void {
    this._internalToolExecutionEnabled = internalToolExecutionEnabled;
  }

  get model(): string | null {
    return this._model;
  }

  set model(model: string | null) {
    this._model = model;
  }

  get frequencyPenalty(): number | null {
    return this._frequencyPenalty;
  }

  set frequencyPenalty(frequencyPenalty: number | null) {
    this._frequencyPenalty = frequencyPenalty;
  }

  get maxTokens(): number | null {
    return this._maxTokens;
  }

  set maxTokens(maxTokens: number | null) {
    this._maxTokens = maxTokens;
  }

  get presencePenalty(): number | null {
    return this._presencePenalty;
  }

  set presencePenalty(presencePenalty: number | null) {
    this._presencePenalty = presencePenalty;
  }

  get stopSequences(): string[] | null {
    return this._stopSequences;
  }

  set stopSequences(stopSequences: string[] | null) {
    this._stopSequences = stopSequences;
  }

  get temperature(): number | null {
    return this._temperature;
  }

  set temperature(temperature: number | null) {
    this._temperature = temperature;
  }

  get topK(): number | null {
    return this._topK;
  }

  set topK(topK: number | null) {
    this._topK = topK;
  }

  get topP(): number | null {
    return this._topP;
  }

  set topP(topP: number | null) {
    this._topP = topP;
  }

  copy(): ChatOptions {
    const options = new DefaultToolCallingChatOptions();
    if (this._toolCallbacks != null) {
      options.setToolCallbacks(this._toolCallbacks);
    }
    if (this._toolNames != null) {
      options.setToolNames(this._toolNames);
    }
    if (this._toolContext != null) {
      options.setToolContext(this._toolContext);
    }
    options.setInternalToolExecutionEnabled(this.internalToolExecutionEnabled);
    options.model = this.model;
    options.frequencyPenalty = this.frequencyPenalty;
    options.maxTokens = this.maxTokens;
    options.presencePenalty = this.presencePenalty;
    options.stopSequences = this.stopSequences;
    options.temperature = this.temperature;
    options.topK = this.topK;
    options.topP = this.topP;
    return options;
  }

  static builder(): DefaultToolCallingChatOptionsBuilder {
    return new DefaultToolCallingChatOptionsBuilder();
  }
}

export class DefaultToolCallingChatOptionsBuilder
  implements
    ToolCallingChatOptions.Builder<DefaultToolCallingChatOptionsBuilder>
{
  private readonly _options = new DefaultToolCallingChatOptions();
  private _toolCallbacks: ToolCallback[] | null = null;
  private _toolNames: Set<string> | null = null;
  private _toolContext: Record<string, unknown> | null = null;

  clone(): DefaultToolCallingChatOptionsBuilder {
    const copy = new DefaultToolCallingChatOptionsBuilder();
    copy._options.model = this._options.model;
    copy._options.frequencyPenalty = this._options.frequencyPenalty;
    copy._options.maxTokens = this._options.maxTokens;
    copy._options.presencePenalty = this._options.presencePenalty;
    copy._options.stopSequences = this._options.stopSequences
      ? [...this._options.stopSequences]
      : null;
    copy._options.temperature = this._options.temperature;
    copy._options.topK = this._options.topK;
    copy._options.topP = this._options.topP;
    copy._options.setInternalToolExecutionEnabled(
      this._options.internalToolExecutionEnabled,
    );
    copy._toolCallbacks = this._toolCallbacks ? [...this._toolCallbacks] : null;
    copy._toolNames = this._toolNames ? new Set(this._toolNames) : null;
    copy._toolContext = this._toolContext ? { ...this._toolContext } : null;
    return copy;
  }

  combineWith(
    other: ChatOptions.BuilderType,
  ): DefaultToolCallingChatOptionsBuilder {
    if (other instanceof DefaultToolCallingChatOptionsBuilder) {
      if (other._toolCallbacks != null) {
        this._toolCallbacks = [...other._toolCallbacks];
      }
      if (other._toolNames != null) {
        this._toolNames = new Set(other._toolNames);
      }
      if (other._toolContext != null) {
        if (this._toolContext == null) {
          this._toolContext = {};
        }
        this._toolContext = {
          ...this._toolContext,
          ...other._toolContext,
        };
      }
      if (other._options.model != null) {
        this._options.model = other._options.model;
      }
      if (other._options.frequencyPenalty != null) {
        this._options.frequencyPenalty = other._options.frequencyPenalty;
      }
      if (other._options.maxTokens != null) {
        this._options.maxTokens = other._options.maxTokens;
      }
      if (other._options.presencePenalty != null) {
        this._options.presencePenalty = other._options.presencePenalty;
      }
      if (other._options.stopSequences != null) {
        this._options.stopSequences = [...other._options.stopSequences];
      }
      if (other._options.temperature != null) {
        this._options.temperature = other._options.temperature;
      }
      if (other._options.topK != null) {
        this._options.topK = other._options.topK;
      }
      if (other._options.topP != null) {
        this._options.topP = other._options.topP;
      }
      if (other._options.internalToolExecutionEnabled != null) {
        this._options.setInternalToolExecutionEnabled(
          other._options.internalToolExecutionEnabled,
        );
      }
    }
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
    this._toolCallbacks = [...(toolCallbacks as ToolCallback[])];
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

  internalToolExecutionEnabled(
    internalToolExecutionEnabled: boolean | null,
  ): this {
    this._options.setInternalToolExecutionEnabled(internalToolExecutionEnabled);
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
      const [keyOrContext, value] = args;
      assert(keyOrContext, "key cannot be null");
      assert(value != null, "value cannot be null");
      const updatedContext = { ...(this._toolContext ?? {}) };
      updatedContext[keyOrContext as string] = value;
      this._toolContext = updatedContext;
      return this;
    }

    this._toolContext = {};
    return this;
  }

  model(model: string | null): this {
    this._options.model = model;
    return this;
  }

  frequencyPenalty(frequencyPenalty: number | null): this {
    this._options.frequencyPenalty = frequencyPenalty;
    return this;
  }

  maxTokens(maxTokens: number | null): this {
    this._options.maxTokens = maxTokens;
    return this;
  }

  presencePenalty(presencePenalty: number | null): this {
    this._options.presencePenalty = presencePenalty;
    return this;
  }

  stopSequences(stopSequences: string[] | null): this {
    this._options.stopSequences = stopSequences;
    return this;
  }

  temperature(temperature: number | null): this {
    this._options.temperature = temperature;
    return this;
  }

  topK(topK: number | null): this {
    this._options.topK = topK;
    return this;
  }

  topP(topP: number | null): this {
    this._options.topP = topP;
    return this;
  }

  build(): ToolCallingChatOptions {
    if (this._toolCallbacks != null) {
      this._options.setToolCallbacks(this._toolCallbacks);
    }
    if (this._toolNames != null) {
      this._options.setToolNames(this._toolNames);
    }
    if (this._toolContext != null) {
      this._options.setToolContext(this._toolContext);
    }
    return this._options;
  }
}
