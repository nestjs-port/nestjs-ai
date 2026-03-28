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
import { EOL } from "node:os";
import { LOWEST_PRECEDENCE, StringUtils } from "@nestjs-ai/commons";
import type { ChatModel, StructuredOutputChatOptions } from "@nestjs-ai/model";
import { UserMessage } from "@nestjs-ai/model";

import { ChatClientAttributes } from "../chat-client-attributes";
import { ChatClientRequest } from "../chat-client-request";
import { ChatClientResponse } from "../chat-client-response";
import type { CallAdvisor, CallAdvisorChain } from "./api";

function isStructuredOutputChatOptions(
  chatOptions: unknown,
): chatOptions is StructuredOutputChatOptions {
  return (
    chatOptions != null &&
    typeof chatOptions === "object" &&
    "outputSchema" in chatOptions
  );
}

export class ChatModelCallAdvisor implements CallAdvisor {
  private readonly _chatModel: ChatModel;

  constructor(chatModel: ChatModel) {
    assert(chatModel, "chatModel cannot be null");
    this._chatModel = chatModel;
  }

  async adviseCall(
    chatClientRequest: ChatClientRequest,
    _callAdvisorChain: CallAdvisorChain,
  ): Promise<ChatClientResponse> {
    assert(chatClientRequest, "the chatClientRequest cannot be null");

    const formattedChatClientRequest =
      ChatModelCallAdvisor.augmentWithFormatInstructions(chatClientRequest);
    const chatResponse = await this._chatModel.call(
      formattedChatClientRequest.prompt,
    );

    return ChatClientResponse.builder()
      .chatResponse(chatResponse)
      .context(new Map(formattedChatClientRequest.context))
      .build();
  }

  get name(): string {
    return "call";
  }

  get order(): number {
    return LOWEST_PRECEDENCE;
  }

  private static augmentWithFormatInstructions(
    chatClientRequest: ChatClientRequest,
  ): ChatClientRequest {
    const outputFormat = chatClientRequest.context.get(
      ChatClientAttributes.OUTPUT_FORMAT.key,
    );
    const outputSchema = chatClientRequest.context.get(
      ChatClientAttributes.STRUCTURED_OUTPUT_SCHEMA.key,
    );

    if (
      !StringUtils.hasText(outputFormat) &&
      !StringUtils.hasText(outputSchema)
    ) {
      return chatClientRequest;
    }

    if (
      chatClientRequest.context.has(
        ChatClientAttributes.STRUCTURED_OUTPUT_NATIVE.key,
      ) &&
      StringUtils.hasText(outputSchema) &&
      isStructuredOutputChatOptions(chatClientRequest.prompt.options)
    ) {
      chatClientRequest.prompt.options.outputSchema = outputSchema;
      return chatClientRequest;
    }

    const augmentedPrompt = chatClientRequest.prompt.augmentUserMessage(
      (userMessage: UserMessage) =>
        ChatModelCallAdvisor.withAugmentedUserText(userMessage, outputFormat),
    );

    return ChatClientRequest.builder()
      .prompt(augmentedPrompt)
      .context(new Map(chatClientRequest.context))
      .build();
  }

  private static withAugmentedUserText(
    userMessage: UserMessage,
    outputFormat: unknown,
  ): UserMessage {
    const text = userMessage.text ?? "";
    const appendedText = StringUtils.hasText(outputFormat)
      ? `${text}${EOL}${outputFormat}`
      : text;

    return new UserMessage({
      content: appendedText,
      properties: { ...userMessage.metadata },
      media: [...userMessage.media],
    });
  }
}
