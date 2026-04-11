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
import { type ToolCallback, ToolUtils } from "../../tool";

/**
 * A set of options that can be used to configure the interaction with a chat model,
 * including tool calling.
 */
export interface ToolCallingChatOptions extends ChatOptions {
  readonly DEFAULT_TOOL_EXECUTION_ENABLED: true;

  /**
   * ToolCallbacks to be registered with the ChatModel.
   */
  get toolCallbacks(): ToolCallback[];

  setToolCallbacks(toolCallbacks: ToolCallback[]): void;

  /**
   * Names of the tools to register with the ChatModel.
   */
  get toolNames(): Set<string>;

  setToolNames(toolNames: Set<string>): void;

  /**
   * Whether the {@link ChatModel} is responsible for executing the tools requested by
   * the model or if the tools should be executed directly by the caller.
   */
  get internalToolExecutionEnabled(): boolean | null;

  setInternalToolExecutionEnabled(
    internalToolExecutionEnabled: boolean | null,
  ): void;

  /**
   * Get the configured tool context.
   * @returns the tool context map.
   */
  get toolContext(): Record<string, unknown>;

  setToolContext(toolContext: Record<string, unknown>): void;
}

export namespace ToolCallingChatOptions {
  export const DEFAULT_TOOL_EXECUTION_ENABLED = true;

  export function isInternalToolExecutionEnabled(
    chatOptions: ChatOptions,
  ): boolean {
    assert(chatOptions, "chatOptions cannot be null");
    let internalToolExecutionEnabled: boolean;
    if ("internalToolExecutionEnabled" in chatOptions) {
      const toolCallingChatOptions = chatOptions as ToolCallingChatOptions;
      const enabled = toolCallingChatOptions.internalToolExecutionEnabled;
      internalToolExecutionEnabled =
        enabled != null ? enabled : DEFAULT_TOOL_EXECUTION_ENABLED;
    } else {
      internalToolExecutionEnabled = DEFAULT_TOOL_EXECUTION_ENABLED;
    }
    return internalToolExecutionEnabled;
  }

  export function mergeToolNames(
    runtimeToolNames: Set<string>,
    defaultToolNames: Set<string>,
  ): Set<string> {
    assert(runtimeToolNames, "runtimeToolNames cannot be null");
    assert(defaultToolNames, "defaultToolNames cannot be null");
    if (runtimeToolNames.size === 0) {
      return new Set(defaultToolNames);
    }
    return new Set(runtimeToolNames);
  }

  export function mergeToolCallbacks(
    runtimeToolCallbacks: ToolCallback[],
    defaultToolCallbacks: ToolCallback[],
  ): ToolCallback[] {
    assert(runtimeToolCallbacks, "runtimeToolCallbacks cannot be null");
    assert(defaultToolCallbacks, "defaultToolCallbacks cannot be null");
    if (runtimeToolCallbacks.length === 0) {
      return [...defaultToolCallbacks];
    }
    return [...runtimeToolCallbacks];
  }

  export function mergeToolContext(
    runtimeToolContext: Record<string, unknown>,
    defaultToolContext: Record<string, unknown>,
  ): Record<string, unknown> {
    assert(runtimeToolContext, "runtimeToolContext cannot be null");
    assert(
      Object.keys(runtimeToolContext).every((key) => key != null),
      "runtimeToolContext keys cannot be null",
    );
    assert(defaultToolContext, "defaultToolContext cannot be null");
    assert(
      Object.keys(defaultToolContext).every((key) => key != null),
      "defaultToolContext keys cannot be null",
    );
    const mergedToolContext = { ...defaultToolContext };
    return { ...mergedToolContext, ...runtimeToolContext };
  }

  export function validateToolCallbacks(toolCallbacks: ToolCallback[]): void {
    const duplicateToolNames = ToolUtils.getDuplicateToolNames(toolCallbacks);
    if (duplicateToolNames.length > 0) {
      throw new Error(
        `Multiple tools with the same name (${duplicateToolNames.join(", ")}) found in ToolCallingChatOptions`,
      );
    }
  }

  /**
   * A builder to create a {@link ToolCallingChatOptions} instance.
   */
  export interface Builder extends ChatOptions.Builder {
    toolCallbacks(toolCallbacks: ToolCallback[] | null): this;

    toolCallbacks(...toolCallbacks: ToolCallback[]): this;

    toolNames(toolNames: Set<string> | null): this;

    toolNames(...toolNames: string[]): this;

    internalToolExecutionEnabled(
      internalToolExecutionEnabled: boolean | null,
    ): this;

    toolContext(context: Record<string, unknown> | null): this;

    toolContext(key: string, value: unknown): this;

    model(model: string | null): this;

    frequencyPenalty(frequencyPenalty: number | null): this;

    maxTokens(maxTokens: number | null): this;

    presencePenalty(presencePenalty: number | null): this;

    stopSequences(stopSequences: string[] | null): this;

    temperature(temperature: number | null): this;

    topK(topK: number | null): this;

    topP(topP: number | null): this;

    build(): ToolCallingChatOptions;
  }
}
