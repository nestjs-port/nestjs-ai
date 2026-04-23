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

import { type ChatResponse, MessageAggregator } from "@nestjs-ai/model";
import type { Observable } from "rxjs";
import { filter, map } from "rxjs";

import { ChatClientResponse } from "./chat-client-response.js";

/**
 * Helper that for streaming chat responses, aggregate the chat response messages into a
 * single AssistantMessage. Job is performed in parallel to the chat response processing.
 */
export class ChatClientMessageAggregator {
  aggregateChatClientResponse(
    chatClientResponses: Observable<ChatClientResponse>,
    aggregationHandler: (chatClientResponse: ChatClientResponse) => void,
  ): Observable<ChatClientResponse> {
    const context = new Map<string, unknown>();

    return new MessageAggregator()
      .aggregate(
        chatClientResponses.pipe(
          map((chatClientResponse) => {
            for (const [key, value] of chatClientResponse.context.entries()) {
              context.set(key, value);
            }
            return chatClientResponse.chatResponse;
          }),
          filter(
            (chatResponse: ChatResponse | null): chatResponse is ChatResponse =>
              chatResponse != null,
          ),
        ),
        (aggregatedChatResponse: ChatResponse) => {
          const aggregatedChatClientResponse = ChatClientResponse.builder()
            .chatResponse(aggregatedChatResponse)
            .context(new Map(context))
            .build();
          aggregationHandler(aggregatedChatClientResponse);
        },
      )
      .pipe(
        map((chatResponse) =>
          ChatClientResponse.builder()
            .chatResponse(chatResponse)
            .context(new Map(context))
            .build(),
        ),
      );
  }
}
