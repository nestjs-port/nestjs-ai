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

import {
  AssistantMessage,
  ChatGenerationMetadata,
  Generation,
  type Message,
  ToolResponseMessage,
} from "../../chat";

/**
 * The result of a tool execution.
 */
export abstract class ToolExecutionResult {
  static readonly FINISH_REASON = "returnDirect" as const;
  static readonly METADATA_TOOL_ID = "toolId" as const;
  static readonly METADATA_TOOL_NAME = "toolName" as const;

  readonly FINISH_REASON = "returnDirect" as const;
  readonly METADATA_TOOL_ID = "toolId" as const;
  readonly METADATA_TOOL_NAME = "toolName" as const;

  /**
   * The history of messages exchanged during the conversation, including the tool
   * execution result.
   */
  abstract conversationHistory(): Message[];

  /**
   * Whether the tool execution result should be returned directly or passed back to the
   * model.
   */
  returnDirect(): boolean {
    return false;
  }

  /**
   * Build a list of {@link Generation} from the tool execution result, useful for
   * sending the tool execution result to the client directly.
   */
  static buildGenerations(
    toolExecutionResult: ToolExecutionResult,
  ): Generation[] {
    const conversationHistory = toolExecutionResult.conversationHistory();
    const generations: Generation[] = [];
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    if (lastMessage instanceof ToolResponseMessage) {
      for (const response of lastMessage.responses) {
        const assistantMessage = new AssistantMessage({
          content: response.responseData,
        });
        const generation = new Generation({
          assistantMessage,
          chatGenerationMetadata: ChatGenerationMetadata.builder()
            .metadata(ToolExecutionResult.METADATA_TOOL_ID, response.id)
            .metadata(ToolExecutionResult.METADATA_TOOL_NAME, response.name)
            .finishReason(ToolExecutionResult.FINISH_REASON)
            .build(),
        });
        generations.push(generation);
      }
    }
    return generations;
  }
}
