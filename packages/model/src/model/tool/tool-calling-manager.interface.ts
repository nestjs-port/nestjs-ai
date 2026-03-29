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

import type { ChatResponse, Prompt } from "../../chat";
import type { ToolDefinition } from "../../tool";
import type { ToolCallingChatOptions } from "./tool-calling-chat-options.interface";
import type { ToolExecutionResult } from "./tool-execution-result";

/**
 * Service responsible for managing the tool calling process for a chat model.
 */
export interface ToolCallingManager {
  /**
   * Resolve the tool definitions from the model's tool calling options.
   */
  resolveToolDefinitions(chatOptions: ToolCallingChatOptions): ToolDefinition[];

  /**
   * Execute the tool calls requested by the model.
   */
  executeToolCalls(
    prompt: Prompt,
    chatResponse: ChatResponse,
  ): Promise<ToolExecutionResult>;
}
