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

import { firstValueFrom, of } from "rxjs";
import { toArray } from "rxjs/operators";
import { describe, expect, it } from "vitest";
import { ChatClientMessageAggregator } from "../chat-client-message-aggregator.js";
import { ChatClientResponse } from "../chat-client-response.js";
import { AssistantMessage } from "@nestjs-ai/model";
import { ChatResponse } from "@nestjs-ai/model";
import { Generation } from "@nestjs-ai/model";

describe("ChatClientMessageAggregator", () => {
  it("should wait for async completion handler", async () => {
    const aggregator = new ChatClientMessageAggregator();
    const chunk1 = ChatClientResponse.builder()
      .chatResponse(
        new ChatResponse({
          generations: [
            new Generation({
              assistantMessage: new AssistantMessage({
                content: "first",
                media: [],
              }),
            }),
          ],
        }),
      )
      .context("conversationId", "test-conversation")
      .build();
    const chunk2 = ChatClientResponse.builder()
      .chatResponse(
        new ChatResponse({
          generations: [
            new Generation({
              assistantMessage: new AssistantMessage({
                content: "second",
                media: [],
              }),
            }),
          ],
        }),
      )
      .context("conversationId", "test-conversation")
      .build();

    let aggregationCompleted = false;
    const result = await firstValueFrom(
      aggregator
        .aggregateChatClientResponse(of(chunk1, chunk2), async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          aggregationCompleted = true;
        })
        .pipe(toArray()),
    );

    expect(result).toHaveLength(2);
    expect(aggregationCompleted).toBe(true);
  });
});
