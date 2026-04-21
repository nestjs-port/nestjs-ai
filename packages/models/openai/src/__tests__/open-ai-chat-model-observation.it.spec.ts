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
import { TestObservationRegistry } from "@nestjs-port/testing";
import { firstValueFrom } from "rxjs";
import { toArray } from "rxjs/operators";
import { beforeEach, describe, expect, it } from "vitest";
import { OpenAiChatModel } from "../open-ai-chat-model";
import { OpenAiChatOptions } from "../open-ai-chat-options";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)("OpenAiChatModelObservationIT", () => {
  let observationRegistry: TestObservationRegistry;
  let chatModel: OpenAiChatModel;

  beforeEach(() => {
    observationRegistry = TestObservationRegistry.create();
    chatModel = new OpenAiChatModel({
      options: new OpenAiChatOptions({
        apiKey: OPENAI_API_KEY,
        model: OpenAiChatOptions.DEFAULT_CHAT_MODEL,
      }),
      observationRegistry: observationRegistry as never,
    });

    observationRegistry.clear();
  });

  it("observation for chat operation", async () => {
    const options = OpenAiChatOptions.builder()
      .model(OpenAiChatOptions.DEFAULT_CHAT_MODEL)
      .build();

    const prompt = new Prompt("Why does a raven look like a desk?", options);

    const chatResponse = await chatModel.call(prompt);
    expect((chatResponse.result?.output.text ?? "").length).toBeGreaterThan(0);

    const responseMetadata = chatResponse.metadata;
    expect(responseMetadata).toBeDefined();
    if (responseMetadata == null) {
      throw new Error("Expected response metadata to be present");
    }

    await validate(observationRegistry, responseMetadata);
  });

  it("observation for streaming chat operation", async () => {
    const options = OpenAiChatOptions.builder()
      .model(OpenAiChatOptions.DEFAULT_CHAT_MODEL)
      .streamOptions({ include_usage: true })
      .build();

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
    expect(responseMetadata).toBeDefined();
    if (responseMetadata == null) {
      throw new Error("Expected response metadata to be present");
    }

    await validate(observationRegistry, responseMetadata);
  });
});

async function validate(
  observationRegistry: TestObservationRegistry,
  responseMetadata: ChatResponseMetadata,
): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 100)); // Wait for observation to be recorded

  expect(observationRegistry.currentObservation).toBeNull();

  const observation = observationRegistry.contexts.find(
    (entry) =>
      entry.context.name === DefaultChatModelObservationConvention.DEFAULT_NAME,
  );
  expect(observation).toBeDefined();
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
    AiProvider.OPENAI.value,
  );
  expect(low.get(AiObservationAttributes.REQUEST_MODEL.value)).toBe(
    OpenAiChatOptions.DEFAULT_CHAT_MODEL,
  );
  expect(low.get(AiObservationAttributes.RESPONSE_MODEL.value)).toBe(
    responseMetadata.model,
  );
  expect(high.get(AiObservationAttributes.RESPONSE_ID.value)).toBe(
    responseMetadata.id,
  );
  expect(
    high.get(AiObservationAttributes.RESPONSE_FINISH_REASONS.value) ?? "",
  ).toContain("stop");
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
