/*
 * Copyright 2026-present the original author or authors.
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
  AiObservationAttributes,
  AiOperationType,
  AiProvider,
} from "@nestjs-ai/commons";
import {
  type ChatResponseMetadata,
  DefaultChatModelObservationConvention,
  Prompt,
} from "@nestjs-ai/model";
import { TestObservationRegistry } from "@nestjs-port/testing";
import { firstValueFrom } from "rxjs";
import { toArray } from "rxjs/operators";
import { assert, beforeEach, describe, expect, it } from "vitest";

import { AnthropicChatModel, AnthropicChatOptions } from "../index.js";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const TEST_MODEL = AnthropicChatOptions.DEFAULT_MODEL;

describe.skipIf(!ANTHROPIC_API_KEY)("AnthropicChatModelObservationIT", () => {
  let observationRegistry: TestObservationRegistry;
  let chatModel: AnthropicChatModel;

  beforeEach(() => {
    observationRegistry = TestObservationRegistry.create();
    chatModel = new AnthropicChatModel({
      observationRegistry: observationRegistry as never,
    });

    observationRegistry.clear();
  });

  it("observation for chat operation", async () => {
    const options = AnthropicChatOptions.builder()
      .model(TEST_MODEL)
      .maxTokens(2048)
      .stopSequences(["this-is-the-end"])
      .temperature(0.7)
      .topK(1)
      .build();

    const prompt = new Prompt("Why does a raven look like a desk?", options);

    const chatResponse = await chatModel.call(prompt);
    expect((chatResponse.result?.output.text ?? "").length).toBeGreaterThan(0);

    const responseMetadata = chatResponse.metadata;
    assert.exists(responseMetadata);
    if (responseMetadata == null) {
      throw new Error("Expected response metadata to be present");
    }

    validate(observationRegistry, responseMetadata);
  });

  it("observation for streaming chat operation", async () => {
    const options = AnthropicChatOptions.builder()
      .model(TEST_MODEL)
      .maxTokens(2048)
      .stopSequences(["this-is-the-end"])
      .temperature(0.7)
      .topK(1)
      .build();

    const prompt = new Prompt("Why does a raven look like a desk?", options);

    const responses = await firstValueFrom(
      chatModel.stream(prompt).pipe(toArray()),
    );
    expect(responses).not.toHaveLength(0);
    expect(responses.length).toBeGreaterThan(3);

    const aggregatedResponse = responses
      .slice(0, responses.length - 1)
      .map((response) => response.result?.output.text ?? "")
      .join("");
    expect(aggregatedResponse).not.toHaveLength(0);

    const lastChatResponse = responses[responses.length - 1];
    const responseMetadata = lastChatResponse.metadata;
    assert.exists(responseMetadata);
    if (responseMetadata == null) {
      throw new Error("Expected response metadata to be present");
    }

    validate(observationRegistry, responseMetadata);
  });
});

function validate(
  observationRegistry: TestObservationRegistry,
  responseMetadata: ChatResponseMetadata,
): void {
  expect(observationRegistry.currentObservation).toBeNull();

  const observation = observationRegistry.contexts.find(
    (entry) =>
      entry.context.name === DefaultChatModelObservationConvention.DEFAULT_NAME,
  );
  assert.exists(observation);
  if (observation == null) {
    throw new Error("Expected observation context to be present");
  }

  const context = observation.context;
  const low = context.lowCardinalityKeyValues;
  const high = context.highCardinalityKeyValues;

  expect(low.get(AiObservationAttributes.AI_OPERATION_TYPE.value)).toBe(
    AiOperationType.CHAT.value,
  );
  expect(low.get(AiObservationAttributes.AI_PROVIDER.value)).toBe(
    AiProvider.ANTHROPIC.value,
  );
  expect(low.get(AiObservationAttributes.REQUEST_MODEL.value)).toBe(TEST_MODEL);
  expect(low.get(AiObservationAttributes.RESPONSE_MODEL.value)).toBe(
    responseMetadata.model,
  );
  expect(
    high.has(AiObservationAttributes.REQUEST_FREQUENCY_PENALTY.value),
  ).toBe(false);
  expect(high.get(AiObservationAttributes.REQUEST_MAX_TOKENS.value)).toBe(
    "2048",
  );
  expect(high.has(AiObservationAttributes.REQUEST_PRESENCE_PENALTY.value)).toBe(
    false,
  );
  expect(high.get(AiObservationAttributes.REQUEST_STOP_SEQUENCES.value)).toBe(
    '["this-is-the-end"]',
  );
  expect(high.get(AiObservationAttributes.REQUEST_TEMPERATURE.value)).toBe(
    "0.7",
  );
  expect(high.get(AiObservationAttributes.REQUEST_TOP_K.value)).toBe("1");
  expect(high.get(AiObservationAttributes.RESPONSE_ID.value)).toBe(
    responseMetadata.id,
  );
  expect(high.get(AiObservationAttributes.USAGE_INPUT_TOKENS.value)).toBe(
    String(responseMetadata.usage.promptTokens),
  );
  expect(high.get(AiObservationAttributes.USAGE_OUTPUT_TOKENS.value)).toBe(
    String(responseMetadata.usage.completionTokens),
  );
  expect(high.get(AiObservationAttributes.USAGE_TOTAL_TOKENS.value)).toBe(
    String(responseMetadata.usage.totalTokens),
  );

  expect(observation.isObservationStarted).toBe(true);
  expect(observation.isObservationStopped).toBe(true);
}
