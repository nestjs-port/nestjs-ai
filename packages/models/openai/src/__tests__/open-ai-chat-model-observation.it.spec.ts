import {
  AiObservationAttributes,
  AiOperationType,
  AiProvider,
  type ObservationScope,
} from "@nestjs-ai/commons";
import {
  type ChatResponseMetadata,
  DefaultChatModelObservationConvention,
  Prompt,
} from "@nestjs-ai/model";
import { TestObservationRegistry } from "@nestjs-ai/testing";
import { firstValueFrom } from "rxjs";
import { toArray } from "rxjs/operators";
import { beforeEach, describe, expect, it } from "vitest";
import { ChatModel, OpenAiApi } from "../api";
import { OpenAiChatModel } from "../open-ai-chat-model";
import { OpenAiChatOptions } from "../open-ai-chat-options";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)("OpenAiChatModelObservationIT", () => {
  let observationRegistry: TestObservationRegistry;
  let chatModel: OpenAiChatModel;

  beforeEach(() => {
    observationRegistry = TestObservationRegistry.create();

    const openAiApi = OpenAiApi.builder()
      .apiKey(OPENAI_API_KEY ?? "")
      .build();
    chatModel = new OpenAiChatModel({
      openAiApi,
      defaultOptions: new OpenAiChatOptions(),
      observationRegistry,
    });

    observationRegistry.clear();
  });

  it("observation for chat operation", async () => {
    const options = new OpenAiChatOptions({
      model: ChatModel.GPT_4_O_MINI,
      frequencyPenalty: 0.0,
      maxTokens: 2048,
      presencePenalty: 0.0,
      stop: ["this-is-the-end"],
      temperature: 0.7,
      topP: 1.0,
    });

    const prompt = new Prompt("Why does a raven look like a desk?", options);

    const chatResponse = await chatModel.call(prompt);
    expect((chatResponse.result?.output.text ?? "").length).toBeGreaterThan(0);

    const responseMetadata = chatResponse.metadata;
    expect(responseMetadata).toBeDefined();

    validate(observationRegistry, responseMetadata);
  });

  it("observation for streaming chat operation", async () => {
    const options = new OpenAiChatOptions({
      model: ChatModel.GPT_4_O_MINI,
      frequencyPenalty: 0.0,
      maxTokens: 2048,
      presencePenalty: 0.0,
      stop: ["this-is-the-end"],
      temperature: 0.7,
      topP: 1.0,
    });
    options.streamUsage = true;

    const prompt = new Prompt("Why does a raven look like a desk?", options);

    const responses = await firstValueFrom(
      chatModel.stream(prompt).pipe(toArray()),
    );
    expect(responses.length).toBeGreaterThan(0);
    expect(responses.length).toBeGreaterThan(10);

    const aggregatedResponse = responses
      .slice(0, responses.length - 1)
      .map((response) => response.result?.output.text ?? "")
      .join("");
    expect(aggregatedResponse.length).toBeGreaterThan(0);

    const lastChatResponse = responses[responses.length - 1];
    const responseMetadata = lastChatResponse.metadata;
    expect(responseMetadata).toBeDefined();

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
    ChatModel.GPT_4_O_MINI,
  );
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
  expect(high.has(AiObservationAttributes.REQUEST_TOP_K.value)).toBe(false);
  expect(high.get(AiObservationAttributes.REQUEST_TOP_P.value)).toBe("1");
  expect(high.get(AiObservationAttributes.RESPONSE_ID.value)).toBe(
    responseMetadata.id,
  );

  const finishReasons =
    high.get(AiObservationAttributes.RESPONSE_FINISH_REASONS.value) ?? "";
  expect(finishReasons.toLowerCase()).toContain("stop");

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
