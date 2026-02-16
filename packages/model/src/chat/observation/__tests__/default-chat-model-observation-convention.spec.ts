import {
  AiObservationAttributes,
  KeyValue,
  ObservationContext,
} from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { DefaultToolCallingChatOptions } from "../../../model";
import {
  DefaultToolDefinition,
  ToolCallback,
  type ToolDefinition,
  ToolMetadata,
} from "../../../tool";
import { AssistantMessage } from "../../messages";
import {
  ChatGenerationMetadata,
  ChatResponseMetadata,
  DefaultUsage,
} from "../../metadata";
import { ChatResponse, Generation } from "../../model";
import { type ChatOptions, DefaultChatOptions, Prompt } from "../../prompt";
import { ChatModelObservationContext } from "../chat-model-observation-context";
import { DefaultChatModelObservationConvention } from "../default-chat-model-observation-convention";

describe("DefaultChatModelObservationConvention", () => {
  const observationConvention = new DefaultChatModelObservationConvention();

  it("should have name", () => {
    expect(observationConvention.getName()).toBe(
      DefaultChatModelObservationConvention.DEFAULT_NAME,
    );
  });

  it("contextual name when model is defined", () => {
    const observationContext = new ChatModelObservationContext(
      generatePrompt(new DefaultChatOptions({ model: "mistral" })),
      "superprovider",
    );

    expect(observationConvention.getContextualName(observationContext)).toBe(
      "chat mistral",
    );
  });

  it("contextual name when model is not defined", () => {
    const observationContext = new ChatModelObservationContext(
      generatePrompt(new DefaultChatOptions()),
      "superprovider",
    );

    expect(observationConvention.getContextualName(observationContext)).toBe(
      "chat",
    );
  });

  it("supports only chat model observation context", () => {
    const observationContext = new ChatModelObservationContext(
      generatePrompt(new DefaultChatOptions({ model: "mistral" })),
      "superprovider",
    );

    expect(observationConvention.supportsContext(observationContext)).toBe(
      true,
    );
    expect(
      observationConvention.supportsContext(new ObservationContext()),
    ).toBe(false);
  });

  it("should have low cardinality key values when defined", () => {
    const observationContext = new ChatModelObservationContext(
      generatePrompt(new DefaultChatOptions({ model: "mistral" })),
      "superprovider",
    );

    const keyValues =
      observationConvention.getLowCardinalityKeyValues(observationContext);

    expect(keyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.AI_OPERATION_TYPE.value, "chat"),
    );
    expect(keyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.AI_PROVIDER.value, "superprovider"),
    );
    expect(keyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.REQUEST_MODEL.value, "mistral"),
    );
  });

  it("should have key values when defined and response", () => {
    const observationContext = new ChatModelObservationContext(
      generatePrompt(
        new DefaultChatOptions({
          model: "mistral",
          frequencyPenalty: 0.8,
          maxTokens: 200,
          presencePenalty: 1.0,
          stopSequences: ["addio", "bye"],
          temperature: 0.5,
          topK: 1,
          topP: 0.9,
        }),
      ),
      "superprovider",
    );

    observationContext.response = new ChatResponse({
      generations: [
        new Generation({
          assistantMessage: AssistantMessage.of("response"),
          chatGenerationMetadata: ChatGenerationMetadata.builder()
            .finishReason("this-is-the-end")
            .build(),
        }),
      ],
      chatResponseMetadata: ChatResponseMetadata.builder()
        .id("say33")
        .model("mistral-42")
        .usage(
          new DefaultUsage({
            promptTokens: 1000,
            completionTokens: 500,
            totalTokens: 1500,
            nativeUsage: {
              promptTokens: 1000,
              completionTokens: 500,
              totalTokens: 1500,
            },
          }),
        )
        .build(),
    });

    const lowCardinalityKeyValues =
      observationConvention.getLowCardinalityKeyValues(observationContext);
    const highCardinalityKeyValues =
      observationConvention.getHighCardinalityKeyValues(observationContext);

    expect(lowCardinalityKeyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.RESPONSE_MODEL.value, "mistral-42"),
    );
    expect(highCardinalityKeyValues).toContainEqual(
      KeyValue.of(
        AiObservationAttributes.REQUEST_FREQUENCY_PENALTY.value,
        "0.8",
      ),
    );
    expect(highCardinalityKeyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.REQUEST_MAX_TOKENS.value, "200"),
    );
    expect(highCardinalityKeyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.REQUEST_PRESENCE_PENALTY.value, "1"),
    );
    expect(highCardinalityKeyValues).toContainEqual(
      KeyValue.of(
        AiObservationAttributes.REQUEST_STOP_SEQUENCES.value,
        '["addio", "bye"]',
      ),
    );
    expect(highCardinalityKeyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.REQUEST_TEMPERATURE.value, "0.5"),
    );
    expect(highCardinalityKeyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.REQUEST_TOP_K.value, "1"),
    );
    expect(highCardinalityKeyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.REQUEST_TOP_P.value, "0.9"),
    );
    expect(highCardinalityKeyValues).toContainEqual(
      KeyValue.of(
        AiObservationAttributes.RESPONSE_FINISH_REASONS.value,
        '["this-is-the-end"]',
      ),
    );
    expect(highCardinalityKeyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.RESPONSE_ID.value, "say33"),
    );
    expect(highCardinalityKeyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.USAGE_INPUT_TOKENS.value, "1000"),
    );
    expect(highCardinalityKeyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.USAGE_OUTPUT_TOKENS.value, "500"),
    );
    expect(highCardinalityKeyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.USAGE_TOTAL_TOKENS.value, "1500"),
    );
  });

  it("should not have key values when missing", () => {
    const observationContext = new ChatModelObservationContext(
      generatePrompt(new DefaultChatOptions()),
      "superprovider",
    );

    const lowCardinalityKeyValues =
      observationConvention.getLowCardinalityKeyValues(observationContext);
    const highCardinalityKeys = observationConvention
      .getHighCardinalityKeyValues(observationContext)
      .map((keyValue) => keyValue.key);

    expect(lowCardinalityKeyValues).toContainEqual(
      KeyValue.of(
        AiObservationAttributes.REQUEST_MODEL.value,
        KeyValue.NONE_VALUE,
      ),
    );
    expect(lowCardinalityKeyValues).toContainEqual(
      KeyValue.of(
        AiObservationAttributes.RESPONSE_MODEL.value,
        KeyValue.NONE_VALUE,
      ),
    );
    expect(highCardinalityKeys).not.toContain(
      AiObservationAttributes.REQUEST_FREQUENCY_PENALTY.value,
    );
    expect(highCardinalityKeys).not.toContain(
      AiObservationAttributes.REQUEST_MAX_TOKENS.value,
    );
    expect(highCardinalityKeys).not.toContain(
      AiObservationAttributes.REQUEST_PRESENCE_PENALTY.value,
    );
    expect(highCardinalityKeys).not.toContain(
      AiObservationAttributes.REQUEST_STOP_SEQUENCES.value,
    );
    expect(highCardinalityKeys).not.toContain(
      AiObservationAttributes.REQUEST_TEMPERATURE.value,
    );
    expect(highCardinalityKeys).not.toContain(
      AiObservationAttributes.REQUEST_TOOL_NAMES.value,
    );
    expect(highCardinalityKeys).not.toContain(
      AiObservationAttributes.REQUEST_TOP_K.value,
    );
    expect(highCardinalityKeys).not.toContain(
      AiObservationAttributes.REQUEST_TOP_P.value,
    );
    expect(highCardinalityKeys).not.toContain(
      AiObservationAttributes.RESPONSE_FINISH_REASONS.value,
    );
    expect(highCardinalityKeys).not.toContain(
      AiObservationAttributes.RESPONSE_ID.value,
    );
    expect(highCardinalityKeys).not.toContain(
      AiObservationAttributes.USAGE_INPUT_TOKENS.value,
    );
    expect(highCardinalityKeys).not.toContain(
      AiObservationAttributes.USAGE_OUTPUT_TOKENS.value,
    );
    expect(highCardinalityKeys).not.toContain(
      AiObservationAttributes.USAGE_TOTAL_TOKENS.value,
    );
  });

  it("should not have key values when empty values", () => {
    const observationContext = new ChatModelObservationContext(
      generatePrompt(new DefaultChatOptions({ stopSequences: [] })),
      "superprovider",
    );

    observationContext.response = new ChatResponse({
      generations: [
        new Generation({
          assistantMessage: AssistantMessage.of("response"),
          chatGenerationMetadata: ChatGenerationMetadata.builder()
            .finishReason("")
            .build(),
        }),
      ],
      chatResponseMetadata: ChatResponseMetadata.builder().id("").build(),
    });

    const highCardinalityKeys = observationConvention
      .getHighCardinalityKeyValues(observationContext)
      .map((keyValue) => keyValue.key);

    expect(highCardinalityKeys).not.toContain(
      AiObservationAttributes.REQUEST_STOP_SEQUENCES.value,
    );
    expect(highCardinalityKeys).not.toContain(
      AiObservationAttributes.RESPONSE_FINISH_REASONS.value,
    );
    expect(highCardinalityKeys).not.toContain(
      AiObservationAttributes.RESPONSE_ID.value,
    );
  });

  it("should have key values when tools", () => {
    const observationContext = new ChatModelObservationContext(
      generatePrompt(
        DefaultToolCallingChatOptions.builder()
          .model("mistral")
          .toolNames("toolA", "toolB")
          .toolCallbacks(
            new TestToolCallback("tool1", true),
            new TestToolCallback("tool2", false),
            new TestToolCallback("toolB"),
          )
          .build(),
      ),
      "superprovider",
    );

    const toolNamesKeyValue =
      observationConvention
        .getHighCardinalityKeyValues(observationContext)
        .find(
          (keyValue) =>
            keyValue.key === AiObservationAttributes.REQUEST_TOOL_NAMES.value,
        ) ?? null;

    expect(toolNamesKeyValue).not.toBeNull();
    expect(toolNamesKeyValue?.value).toContain("toolA");
    expect(toolNamesKeyValue?.value).toContain("toolB");
    expect(toolNamesKeyValue?.value).toContain("tool1");
    expect(toolNamesKeyValue?.value).toContain("tool2");
  });
});

function generatePrompt(chatOptions: ChatOptions): Prompt {
  return new Prompt("Who let the dogs out?", chatOptions);
}

class TestToolCallback extends ToolCallback {
  private readonly _toolDefinition: ToolDefinition;
  private readonly _toolMetadata: ToolMetadata;

  constructor(name: string, returnDirect = false) {
    super();
    this._toolDefinition = DefaultToolDefinition.builder()
      .name(name)
      .inputSchema("{}")
      .build();
    this._toolMetadata = ToolMetadata.create({ returnDirect });
  }

  get toolDefinition(): ToolDefinition {
    return this._toolDefinition;
  }

  override get toolMetadata(): ToolMetadata {
    return this._toolMetadata;
  }

  call(_toolInput: string): string {
    return "Mission accomplished!";
  }
}
