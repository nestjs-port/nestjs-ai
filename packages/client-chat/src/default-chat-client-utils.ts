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
  DefaultToolCallingChatOptions,
  type Message,
  Prompt,
  PromptTemplate,
  SystemMessage,
  ToolCallingChatOptions,
  UserMessage,
} from "@nestjs-ai/model";
import { StringUtils } from "@nestjs-port/core";
import { ChatClientRequest } from "./chat-client-request.js";
import type { DefaultChatClient } from "./default-chat-client.js";

export abstract class DefaultChatClientUtils {
  static toChatClientRequest(
    inputRequest: DefaultChatClient.DefaultChatClientRequestSpec,
  ): ChatClientRequest {
    assert(inputRequest, "inputRequest cannot be null");

    /*
     * ==========* MESSAGES * ==========
     */
    const processedMessages: Message[] = [];

    // System Text => First in the list
    let processedSystemText = inputRequest.systemText;
    if (StringUtils.hasText(processedSystemText)) {
      if (Object.keys(inputRequest.systemParams).length > 0) {
        processedSystemText = PromptTemplate.builder()
          .template(processedSystemText)
          .variables(inputRequest.systemParams)
          .renderer(inputRequest.getTemplateRenderer())
          .build()
          .render();
      }
      processedMessages.push(
        new SystemMessage({
          content: processedSystemText,
          properties: inputRequest.systemMetadata,
        }),
      );
    }

    // Messages => In the middle of the list
    if (inputRequest.getMessages().length > 0) {
      processedMessages.push(...inputRequest.getMessages());
    }

    // User Text => Last in the list
    let processedUserText = inputRequest.userText;
    if (StringUtils.hasText(processedUserText)) {
      if (Object.keys(inputRequest.userParams).length > 0) {
        processedUserText = PromptTemplate.builder()
          .template(processedUserText)
          .variables(inputRequest.userParams)
          .renderer(inputRequest.getTemplateRenderer())
          .build()
          .render();
      }
      processedMessages.push(
        new UserMessage({
          content: processedUserText,
          media: [...inputRequest.media],
          properties: inputRequest.userMetadata,
        }),
      );
    }

    /*
     * ==========* OPTIONS * ==========
     */
    let builder = inputRequest.chatModel.defaultOptions.mutate();
    if (inputRequest.chatOptionsCustomizer != null) {
      builder = builder.combineWith(inputRequest.chatOptionsCustomizer);
    }

    if (builder instanceof DefaultToolCallingChatOptions.Builder) {
      if (inputRequest.getToolNames().length > 0) {
        builder.toolNames(new Set(inputRequest.getToolNames()));
      }

      const allToolCallbacks = [...inputRequest.getToolCallbacks()];
      for (const provider of inputRequest.toolCallbackProviders) {
        allToolCallbacks.push(...provider.toolCallbacks);
      }

      if (allToolCallbacks.length > 0) {
        ToolCallingChatOptions.validateToolCallbacks(allToolCallbacks);
        builder.toolCallbacks(allToolCallbacks);
      }

      if (Object.keys(inputRequest.getToolContext()).length > 0) {
        builder.toolContext(inputRequest.getToolContext());
      }
    }

    const processedChatOptions = builder.build();

    /*
     * ==========* REQUEST * ==========
     */
    const promptBuilder = Prompt.builder()
      .messages(processedMessages)
      .chatOptions(processedChatOptions);
    return ChatClientRequest.builder()
      .prompt(promptBuilder.build())
      .context(new Map(Object.entries(inputRequest.advisorParams)))
      .build();
  }
}
