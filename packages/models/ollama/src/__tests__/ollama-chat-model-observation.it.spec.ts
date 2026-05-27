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
  AiObservationAttributes,
  AiOperationType,
  AiProvider,
} from "@nestjs-ai/commons";
import {
  type ChatResponseMetadata,
  DefaultChatModelObservationConvention,
  Prompt,
} from "@nestjs-ai/model";
import { RetryUtils } from "@nestjs-ai/retry";
import { TestObservationRegistry } from "@nestjs-port/testing";
import {
  afterAll,
  assert,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { firstValueFrom } from "rxjs";
import { toArray } from "rxjs/operators";

import { OllamaChatOptions } from "../api/ollama-chat-options.js";
import { OllamaModel } from "../api/ollama-model.js";
import { OllamaChatModel } from "../ollama-chat-model.js";
import {
  OLLAMA_TESTS_ENABLED,
  OllamaTestContext,
} from "./ollama-test-context.js";

const TEST_TIMEOUT = 600_000;
const MODEL = OllamaModel.QWEN_2_5_3B.name;

/**
 * Integration tests for observation instrumentation in {@link OllamaChatModel}.
 */
describe.skipIf(!OLLAMA_TESTS_ENABLED)("OllamaChatModelObservationIT", () => {
  let context: OllamaTestContext;
  let observationRegistry: TestObservationRegistry;
  let chatModel: OllamaChatModel;

  beforeAll(async () => {
    context = await OllamaTestContext.initializeOllama([MODEL]);
    observationRegistry = TestObservationRegistry.create();
    chatModel = new OllamaChatModel({
      ollamaApi: context.api,
      observationRegistry: observationRegistry as never,
      retryTemplate: RetryUtils.DEFAULT_RETRY_TEMPLATE,
    });
  }, TEST_TIMEOUT);

  beforeEach(() => {
    observationRegistry.clear();
  });

  afterAll(async () => {
    await context?.stop();
  }, TEST_TIMEOUT);

  it(
    "observation for chat operation",
    async () => {
      const options = observationOptions();

      const prompt = new Prompt("Why does a raven look like a desk?", options);

      const chatResponse = await chatModel.call(prompt);
      expect(chatResponse.result?.output.text ?? "").not.toHaveLength(0);

      const responseMetadata = chatResponse.metadata;
      expect(responseMetadata).not.toBeNull();

      await validate(observationRegistry, responseMetadata);
    },
    TEST_TIMEOUT,
  );

  it(
    "observation for streaming chat operation",
    async () => {
      const options = observationOptions();

      const prompt = new Prompt("Why does a raven look like a desk?", options);

      const responses = await firstValueFrom(
        chatModel.stream(prompt).pipe(toArray()),
      );
      expect(responses).not.toHaveLength(0);
      expect(responses.length).toBeGreaterThan(10);

      const aggregatedResponse = responses
        .slice(0, responses.length - 1)
        .map((response) => response.result?.output.text ?? "")
        .join("");
      expect(aggregatedResponse).not.toHaveLength(0);

      const lastChatResponse = responses[responses.length - 1];

      const responseMetadata = lastChatResponse.metadata;
      expect(responseMetadata).not.toBeNull();

      await validate(observationRegistry, responseMetadata);
    },
    TEST_TIMEOUT,
  );
});

function observationOptions(): OllamaChatOptions {
  return OllamaChatOptions.builder()
    .model(MODEL)
    .frequencyPenalty(0.0)
    .numPredict(2048)
    .presencePenalty(0.0)
    .stop(["this-is-the-end"])
    .temperature(0.7)
    .topK(1)
    .topP(1.0)
    .build();
}

async function validate(
  observationRegistry: TestObservationRegistry,
  responseMetadata: ChatResponseMetadata,
): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 100));

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

  expect(context.contextualName).toBe(`chat ${MODEL}`);
  expect(low.get(AiObservationAttributes.AI_OPERATION_TYPE.value)).toBe(
    AiOperationType.CHAT.value,
  );
  expect(low.get(AiObservationAttributes.AI_PROVIDER.value)).toBe(
    AiProvider.OLLAMA.value,
  );
  expect(low.get(AiObservationAttributes.REQUEST_MODEL.value)).toBe(MODEL);
  expect(low.get(AiObservationAttributes.RESPONSE_MODEL.value)).toBe(
    responseMetadata.model,
  );
  expect(
    high.get(AiObservationAttributes.REQUEST_FREQUENCY_PENALTY.value),
  ).toBe("0");
  expect(high.get(AiObservationAttributes.REQUEST_MAX_TOKENS.value)).toBe(
    "2048",
  );
  expect(high.get(AiObservationAttributes.REQUEST_PRESENCE_PENALTY.value)).toBe(
    "0",
  );
  expect(high.get(AiObservationAttributes.REQUEST_STOP_SEQUENCES.value)).toBe(
    '["this-is-the-end"]',
  );
  expect(high.get(AiObservationAttributes.REQUEST_TEMPERATURE.value)).toBe(
    "0.7",
  );
  expect(high.get(AiObservationAttributes.REQUEST_TOP_K.value)).toBe("1");
  expect(high.get(AiObservationAttributes.REQUEST_TOP_P.value)).toBe("1");
  expect(high.get(AiObservationAttributes.RESPONSE_ID.value)).toBeUndefined();
  expect(high.get(AiObservationAttributes.RESPONSE_FINISH_REASONS.value)).toBe(
    '["stop"]',
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
