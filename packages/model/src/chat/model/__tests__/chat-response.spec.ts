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
import { AssistantMessage, type ToolCall } from "../../messages/index.js";
import {
  ChatGenerationMetadata,
  ChatResponseMetadata,
} from "../../metadata/index.js";
import { ChatResponse } from "../chat-response.js";
import { Generation } from "../generation.js";
import { MessageAggregator } from "../message-aggregator.js";

describe("ChatResponse", () => {
  it("when tool calls are present then return true", () => {
    const chatResponse = ChatResponse.builder()
      .generations([
        new Generation({
          assistantMessage: new AssistantMessage({
            content: "",
            toolCalls: [
              {
                id: "toolA",
                type: "function",
                name: "toolA",
                arguments: "{}",
              },
            ],
            media: [],
          }),
        }),
      ])
      .build();
    expect(chatResponse.hasToolCalls()).toBe(true);
  });

  it("when no tool calls are present then return false", () => {
    const chatResponse = ChatResponse.builder()
      .generations([
        new Generation({
          assistantMessage: new AssistantMessage({
            content: "Result",
            media: [],
          }),
        }),
      ])
      .build();
    expect(chatResponse.hasToolCalls()).toBe(false);
  });

  it("when finish reason is null then throw", () => {
    const chatResponse = ChatResponse.builder()
      .generations([
        new Generation({
          assistantMessage: new AssistantMessage({
            content: "Result",
            media: [],
          }),
          chatGenerationMetadata: ChatGenerationMetadata.builder()
            .finishReason("completed")
            .build(),
        }),
      ])
      .build();
    expect(() => {
      // @ts-expect-error - testing runtime validation
      chatResponse.hasFinishReasons(null);
    }).toThrow("finishReasons cannot be null");
  });

  it("when finish reason is present", () => {
    const chatResponse = ChatResponse.builder()
      .generations([
        new Generation({
          assistantMessage: new AssistantMessage({
            content: "Result",
            media: [],
          }),
          chatGenerationMetadata: ChatGenerationMetadata.builder()
            .finishReason("completed")
            .build(),
        }),
      ])
      .build();
    expect(chatResponse.hasFinishReasons("completed")).toBe(true);
  });

  it("when finish reason is not present", () => {
    const chatResponse = ChatResponse.builder()
      .generations([
        new Generation({
          assistantMessage: new AssistantMessage({
            content: "Result",
            media: [],
          }),
          chatGenerationMetadata: ChatGenerationMetadata.builder()
            .finishReason("failed")
            .build(),
        }),
      ])
      .build();
    expect(chatResponse.hasFinishReasons("completed")).toBe(false);
  });

  it("when empty generations list then return false", () => {
    const chatResponse = ChatResponse.builder().generations([]).build();
    expect(chatResponse.hasToolCalls()).toBe(false);
  });

  it("when multiple generations with tool calls then return true", () => {
    const chatResponse = ChatResponse.builder()
      .generations([
        new Generation({
          assistantMessage: new AssistantMessage({
            content: "First response",
            media: [],
          }),
        }),
        new Generation({
          assistantMessage: new AssistantMessage({
            content: null,
            toolCalls: [
              {
                id: "toolB",
                type: "function",
                name: "toolB",
                arguments: "{}",
              },
            ],
            media: [],
          }),
        }),
      ])
      .build();
    expect(chatResponse.hasToolCalls()).toBe(true);
  });

  it("message aggregator should correctly aggregate tool calls from stream", async () => {
    const aggregator = new MessageAggregator();

    const chunk1 = new ChatResponse({
      generations: [
        new Generation({
          assistantMessage: new AssistantMessage({
            content: "Thinking about the weather... ",
            media: [],
          }),
        }),
      ],
    });

    const weatherToolCall: ToolCall = {
      id: "tool-id-123",
      type: "function",
      name: "getCurrentWeather",
      arguments: '{"location": "Seoul"}',
    };

    const metadataWithToolCall = ChatResponseMetadata.builder()
      .keyValue("toolCalls", [weatherToolCall])
      .build();

    const chunk2 = new ChatResponse({
      generations: [
        new Generation({
          assistantMessage: new AssistantMessage({
            content: "",
            media: [],
          }),
        }),
      ],
      chatResponseMetadata: metadataWithToolCall,
    });

    const streamingResponse = of(chunk1, chunk2);

    let aggregatedResponse!: ChatResponse;

    await firstValueFrom(
      aggregator
        .aggregate(streamingResponse, (response) => {
          aggregatedResponse = response;
        })
        .pipe(toArray()),
    );

    const finalAssistantMessage = aggregatedResponse.result?.output;

    expect(finalAssistantMessage?.text).toBe("Thinking about the weather... ");
    expect(finalAssistantMessage?.hasToolCalls()).toBe(true);
    expect(finalAssistantMessage?.toolCalls).toHaveLength(1);

    const resultToolCall = finalAssistantMessage?.toolCalls[0];
    expect(resultToolCall?.id).toBe("tool-id-123");
    expect(resultToolCall?.name).toBe("getCurrentWeather");
    expect(resultToolCall?.arguments).toBe('{"location": "Seoul"}');
  });
});
