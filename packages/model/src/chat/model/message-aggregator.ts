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

import { type Logger, LoggerFactory } from "@nestjs-port/core";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import {
  AssistantMessage,
  type ToolCall,
} from "../messages/assistant-message.js";
import { ChatGenerationMetadata } from "../metadata/chat-generation-metadata.interface.js";
import { ChatResponseMetadata } from "../metadata/chat-response-metadata.js";
import { DefaultUsage } from "../metadata/default-usage.js";
import { EmptyRateLimit } from "../metadata/empty-rate-limit.js";
import { PromptMetadata } from "../metadata/prompt-metadata.js";
import type { RateLimit } from "../metadata/rate-limit.js";
import { ChatResponse } from "./chat-response.js";
import { Generation } from "./generation.js";

/**
 * Helper that for streaming chat responses, aggregate the chat response messages into a
 * single AssistantMessage. Job is performed in parallel to the chat response processing.
 */
export class MessageAggregator {
  private readonly logger: Logger = LoggerFactory.getLogger(
    MessageAggregator.name,
  );

  aggregate(
    fluxChatResponse: Observable<ChatResponse>,
    onAggregationComplete:
      | ((chatResponse: ChatResponse) => void)
      | ((chatResponse: ChatResponse) => Promise<void>),
  ): Observable<ChatResponse> {
    return new Observable<ChatResponse>((subscriber) => {
      let messageTextContentRef = "";
      let messageMetadataMapRef: Record<string, unknown> = {};
      let toolCallsRef: ToolCall[] = [];

      // ChatGeneration Metadata
      let generationMetadataRef: ChatGenerationMetadata =
        ChatGenerationMetadata.NULL;

      // Usage
      let metadataUsagePromptTokensRef = 0;
      let metadataUsageGenerationTokensRef = 0;
      let metadataUsageTotalTokensRef = 0;

      let metadataPromptMetadataRef: PromptMetadata = PromptMetadata.empty();
      let metadataRateLimitRef: RateLimit = new EmptyRateLimit();

      let metadataIdRef = "";
      let metadataModelRef = "";

      const subscription = fluxChatResponse
        .pipe(
          tap((chatResponse) => {
            if (chatResponse.result) {
              if (
                chatResponse.result.metadata &&
                chatResponse.result.metadata !== ChatGenerationMetadata.NULL
              ) {
                generationMetadataRef = chatResponse.result.metadata;
              }
              if (chatResponse.result.output.text) {
                messageTextContentRef += chatResponse.result.output.text;
              }
              if (chatResponse.result.output.metadata) {
                messageMetadataMapRef = {
                  ...messageMetadataMapRef,
                  ...chatResponse.result.output.metadata,
                };
              }
              const outputMessage = chatResponse.result.output;
              if (
                outputMessage.toolCalls &&
                outputMessage.toolCalls.length > 0
              ) {
                toolCallsRef = [...toolCallsRef, ...outputMessage.toolCalls];
              }
            }
            if (chatResponse.metadata) {
              if (chatResponse.metadata.usage) {
                const usage = chatResponse.metadata.usage;
                metadataUsagePromptTokensRef =
                  usage.promptTokens > 0
                    ? usage.promptTokens
                    : metadataUsagePromptTokensRef;
                metadataUsageGenerationTokensRef =
                  usage.completionTokens > 0
                    ? usage.completionTokens
                    : metadataUsageGenerationTokensRef;
                metadataUsageTotalTokensRef =
                  usage.totalTokens > 0
                    ? usage.totalTokens
                    : metadataUsageTotalTokensRef;
              }
              if (
                chatResponse.metadata.promptMetadata &&
                Array.from(chatResponse.metadata.promptMetadata).length > 0
              ) {
                metadataPromptMetadataRef =
                  chatResponse.metadata.promptMetadata;
              }
              if (
                chatResponse.metadata.rateLimit &&
                !(metadataRateLimitRef instanceof EmptyRateLimit)
              ) {
                metadataRateLimitRef = chatResponse.metadata.rateLimit;
              }
              if (chatResponse.metadata.id) {
                metadataIdRef = chatResponse.metadata.id;
              }
              if (chatResponse.metadata.model) {
                metadataModelRef = chatResponse.metadata.model;
              }
              const toolCallsFromMetadata =
                chatResponse.metadata.get("toolCalls");
              if (Array.isArray(toolCallsFromMetadata)) {
                const toolCallsList = toolCallsFromMetadata as ToolCall[];
                toolCallsRef = [...toolCallsRef, ...toolCallsList];
              }
            }
          }),
        )
        .subscribe({
          next: (chatResponse) => subscriber.next(chatResponse),
          error: (error) => {
            this.logger.error("Aggregation Error", error);
            subscriber.error(error);
          },
          complete: () => {
            void (async () => {
              const usage = new DefaultUsage({
                promptTokens: metadataUsagePromptTokensRef,
                completionTokens: metadataUsageGenerationTokensRef,
                totalTokens: metadataUsageTotalTokensRef,
              });

              const chatResponseMetadata = ChatResponseMetadata.builder()
                .id(metadataIdRef)
                .model(metadataModelRef)
                .rateLimit(metadataRateLimitRef)
                .usage(usage)
                .promptMetadata(metadataPromptMetadataRef)
                .build();

              let finalAssistantMessage: AssistantMessage;
              const collectedToolCalls = toolCallsRef;

              if (collectedToolCalls && collectedToolCalls.length > 0) {
                finalAssistantMessage = new AssistantMessage({
                  content: messageTextContentRef,
                  properties: messageMetadataMapRef,
                  toolCalls: collectedToolCalls,
                });
              } else {
                finalAssistantMessage = new AssistantMessage({
                  content: messageTextContentRef,
                  properties: messageMetadataMapRef,
                });
              }
              try {
                await onAggregationComplete(
                  new ChatResponse({
                    generations: [
                      new Generation({
                        assistantMessage: finalAssistantMessage,
                        chatGenerationMetadata: generationMetadataRef,
                      }),
                    ],
                    chatResponseMetadata,
                  }),
                );
                subscriber.complete();
              } catch (error) {
                subscriber.error(error);
              }
            })();
          },
        });

      return () => subscription.unsubscribe();
    });
  }
}
