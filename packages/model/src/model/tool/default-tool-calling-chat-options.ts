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
    assert(
      toolCallbacks.every((toolCallback) => toolCallback != null),
      "toolCallbacks cannot contain null elements",
    );
    this._toolCallbacks = [...toolCallbacks];
  }

  get toolNames(): Set<string> {
    return this._toolNames != null ? new Set(this._toolNames) : new Set();
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

  get toolContext(): Record<string, unknown> {
    return this._toolContext != null ? { ...this._toolContext } : {};
  }

  setToolContext(toolContext: Record<string, unknown>): void {
    assert(toolContext, "toolContext cannot be null");
    assert(
      Object.keys(toolContext).every((key) => key != null),
      "toolContext cannot contain null keys",
    );
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

  setModel(model: string | null): void {
    this._model = model;
  }

  get frequencyPenalty(): number | null {
    return this._frequencyPenalty;
  }

  setFrequencyPenalty(frequencyPenalty: number | null): void {
    this._frequencyPenalty = frequencyPenalty;
  }

  get maxTokens(): number | null {
    return this._maxTokens;
  }

  setMaxTokens(maxTokens: number | null): void {
    this._maxTokens = maxTokens;
  }

  get presencePenalty(): number | null {
    return this._presencePenalty;
  }

  setPresencePenalty(presencePenalty: number | null): void {
    this._presencePenalty = presencePenalty;
  }

  get stopSequences(): string[] | null {
    return this._stopSequences;
  }

  setStopSequences(stopSequences: string[] | null): void {
    this._stopSequences = stopSequences;
  }

  get temperature(): number | null {
    return this._temperature;
  }

  setTemperature(temperature: number | null): void {
    this._temperature = temperature;
  }

  get topK(): number | null {
    return this._topK;
  }

  setTopK(topK: number | null): void {
    this._topK = topK;
  }

  get topP(): number | null {
    return this._topP;
  }

  setTopP(topP: number | null): void {
    this._topP = topP;
  }

  copy(): ChatOptions {
    return this.mutate().build();
  }

  mutate(): DefaultToolCallingChatOptions.Builder {
    return DefaultToolCallingChatOptions.builder()
      .model(this.model)
      .frequencyPenalty(this.frequencyPenalty)
      .maxTokens(this.maxTokens)
      .presencePenalty(this.presencePenalty)
      .stopSequences(this.stopSequences ? [...this.stopSequences] : null)
      .temperature(this.temperature)
      .topK(this.topK)
      .topP(this.topP)
      .toolCallbacks(this.toolCallbacks)
      .toolNames(this.toolNames)
      .toolContext(this.toolContext)
      .internalToolExecutionEnabled(this.internalToolExecutionEnabled);
  }

  static builder(): DefaultToolCallingChatOptions.Builder {
    return new DefaultToolCallingChatOptions.Builder();
  }
}

export namespace DefaultToolCallingChatOptions {
  export class Builder implements ToolCallingChatOptions.Builder {
    protected _model: string | null = null;
    protected _frequencyPenalty: number | null = null;
    protected _maxTokens: number | null = null;
    protected _presencePenalty: number | null = null;
    protected _stopSequences: string[] | null = null;
    protected _temperature: number | null = null;
    protected _topK: number | null = null;
    protected _topP: number | null = null;
    protected _toolCallbacks: ToolCallback[] | null = null;
    protected _toolNames: Set<string> | null = null;
    protected _toolContext: Record<string, unknown> | null = null;
    protected _internalToolExecutionEnabled: boolean | null = null;

    clone(): this {
      const copy = Object.assign(
        Object.create(Object.getPrototypeOf(this)),
        this,
      ) as this;
      if (this._stopSequences != null) {
        copy._stopSequences = [...this._stopSequences];
      }
      if (this._toolCallbacks != null) {
        copy._toolCallbacks = [...this._toolCallbacks];
      }
      if (this._toolNames != null) {
        copy._toolNames = new Set(this._toolNames);
      }
      if (this._toolContext != null) {
        copy._toolContext = { ...this._toolContext };
      }
      return copy;
    }

    protected self(): this {
      return this;
    }

    model(model: string | null): this {
      this._model = model;
      return this.self();
    }

    frequencyPenalty(frequencyPenalty: number | null): this {
      this._frequencyPenalty = frequencyPenalty;
      return this.self();
    }

    maxTokens(maxTokens: number | null): this {
      this._maxTokens = maxTokens;
      return this.self();
    }

    presencePenalty(presencePenalty: number | null): this {
      this._presencePenalty = presencePenalty;
      return this.self();
    }

    stopSequences(stopSequences: string[] | null): this {
      this._stopSequences = stopSequences != null ? [...stopSequences] : null;
      return this.self();
    }

    temperature(temperature: number | null): this {
      this._temperature = temperature;
      return this.self();
    }

    topK(topK: number | null): this {
      this._topK = topK;
      return this.self();
    }

    topP(topP: number | null): this {
      this._topP = topP;
      return this.self();
    }

    combineWith(other: this): this {
      if (other instanceof Builder) {
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
        if (other._model != null) {
          this._model = other._model;
        }
        if (other._frequencyPenalty != null) {
          this._frequencyPenalty = other._frequencyPenalty;
        }
        if (other._maxTokens != null) {
          this._maxTokens = other._maxTokens;
        }
        if (other._presencePenalty != null) {
          this._presencePenalty = other._presencePenalty;
        }
        if (other._stopSequences != null) {
          this._stopSequences = [...other._stopSequences];
        }
        if (other._temperature != null) {
          this._temperature = other._temperature;
        }
        if (other._topK != null) {
          this._topK = other._topK;
        }
        if (other._topP != null) {
          this._topP = other._topP;
        }
        if (other._internalToolExecutionEnabled != null) {
          this._internalToolExecutionEnabled =
            other._internalToolExecutionEnabled;
        }
      }
      return this.self();
    }

    toolCallbacks(toolCallbacks: ToolCallback[] | null): this;
    toolCallbacks(...toolCallbacks: ToolCallback[]): this;
    toolCallbacks(...toolCallbacks: unknown[]): this {
      if (toolCallbacks.length === 1) {
        const [singleValue] = toolCallbacks;
        if (singleValue == null) {
          this._toolCallbacks = null;
          return this.self();
        }
        if (Array.isArray(singleValue)) {
          this._toolCallbacks = [...singleValue];
          return this.self();
        }
      }
      this._toolCallbacks = [...(toolCallbacks as ToolCallback[])];
      return this.self();
    }

    toolNames(toolNames: Set<string> | null): this;
    toolNames(...toolNames: string[]): this;
    toolNames(...toolNames: unknown[]): this {
      if (toolNames.length === 1) {
        const [singleValue] = toolNames;
        if (singleValue == null) {
          this._toolNames = null;
          return this.self();
        }
        if (singleValue instanceof Set) {
          this._toolNames = new Set(singleValue);
          return this.self();
        }
      }
      this._toolNames = new Set(toolNames as string[]);
      return this.self();
    }

    internalToolExecutionEnabled(
      internalToolExecutionEnabled: boolean | null,
    ): this {
      this._internalToolExecutionEnabled = internalToolExecutionEnabled;
      return this.self();
    }

    toolContext(context: Record<string, unknown> | null): this;
    toolContext(key: string, value: unknown): this;
    toolContext(...args: unknown[]): this {
      if (args.length === 1) {
        const [singleValue] = args;
        if (singleValue == null) {
          this._toolContext = null;
          return this.self();
        }
        if (this._toolContext == null) {
          this._toolContext = {};
        }
        this._toolContext = {
          ...this._toolContext,
          ...(singleValue as Record<string, unknown>),
        };
        return this.self();
      }

      if (args.length === 2) {
        const [keyOrContext, value] = args;
        assert(
          typeof keyOrContext === "string" && keyOrContext.trim().length > 0,
          "key cannot be null",
        );
        assert(value != null, "value cannot be null");
        const updatedContext = { ...this._toolContext };
        updatedContext[keyOrContext as string] = value;
        this._toolContext = updatedContext;
        return this.self();
      }

      this._toolContext = {};
      return this.self();
    }

    build(): ToolCallingChatOptions {
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
      options.setInternalToolExecutionEnabled(
        this._internalToolExecutionEnabled,
      );
      options.setModel(this._model);
      options.setFrequencyPenalty(this._frequencyPenalty);
      options.setMaxTokens(this._maxTokens);
      options.setPresencePenalty(this._presencePenalty);
      options.setStopSequences(this._stopSequences);
      options.setTemperature(this._temperature);
      options.setTopK(this._topK);
      options.setTopP(this._topP);
      return options;
    }
  }
}
