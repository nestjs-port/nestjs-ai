import {
  AiObservationAttributes,
  KeyValue,
  ObservationContext,
  SpringAiKind,
} from "@nestjs-ai/commons";
import {
  ChatMemory,
  DefaultToolCallingChatOptions,
  DefaultToolDefinition,
  Prompt,
  ToolCallback,
} from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";

import type { Advisor } from "../../advisor";
import { ChatClientRequest } from "../../chat-client-request";
import { ChatClientObservationContext } from "../chat-client-observation-context";
import { DefaultChatClientObservationConvention } from "../default-chat-client-observation-convention";

function createAdvisor(name: string): Advisor {
  return {
    get order() {
      return 0;
    },
    get name() {
      return name;
    },
  };
}

function createToolCallback(name: string): ToolCallback {
  return new (class extends ToolCallback {
    override get toolDefinition() {
      return DefaultToolDefinition.builder()
        .name(name)
        .inputSchema("{}")
        .build();
    }

    override async call(_toolInput: string): Promise<string> {
      return "";
    }
  })();
}

describe("DefaultChatClientObservationConvention", () => {
  const observationConvention = new DefaultChatClientObservationConvention();

  it("should have name", () => {
    expect(observationConvention.getName()).toBe(
      DefaultChatClientObservationConvention.DEFAULT_NAME,
    );
  });

  it("contextual name", () => {
    const context = ChatClientObservationContext.builder()
      .request(ChatClientRequest.builder().prompt(new Prompt("Hello")).build())
      .stream(true)
      .build();

    expect(observationConvention.getContextualName(context)).toBe(
      "spring_ai chat_client",
    );
  });

  it("supports only chat client observation context", () => {
    const context = ChatClientObservationContext.builder()
      .request(ChatClientRequest.builder().prompt(new Prompt("Hello")).build())
      .stream(true)
      .build();

    expect(observationConvention.supportsContext(context)).toBe(true);
    expect(
      observationConvention.supportsContext(new ObservationContext()),
    ).toBe(false);
  });

  it("should have required key values", () => {
    const context = ChatClientObservationContext.builder()
      .request(ChatClientRequest.builder().prompt(new Prompt("Hello")).build())
      .stream(true)
      .build();

    const keyValues = observationConvention
      .getLowCardinalityKeyValues(context)
      .toArray();

    expect(keyValues).toContainEqual(
      KeyValue.of("spring.ai.kind", SpringAiKind.CHAT_CLIENT.value),
    );
    expect(keyValues).toContainEqual(
      KeyValue.of("spring.ai.chat.client.stream", "true"),
    );
    expect(keyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.AI_OPERATION_TYPE.value, "framework"),
    );
    expect(keyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.AI_PROVIDER.value, "spring_ai"),
    );
  });

  it("should have optional key values", () => {
    const options = DefaultToolCallingChatOptions.builder()
      .toolNames("tool1", "tool2")
      .toolCallbacks(
        createToolCallback("toolCallback1"),
        createToolCallback("toolCallback2"),
      )
      .build();
    const request = ChatClientRequest.builder()
      .prompt(new Prompt("Hello", options))
      .context(ChatMemory.CONVERSATION_ID, "007")
      .build();
    const context = ChatClientObservationContext.builder()
      .request(request)
      .advisors([createAdvisor("advisor1"), createAdvisor("advisor2")])
      .stream(true)
      .build();

    const keyValues = observationConvention
      .getHighCardinalityKeyValues(context)
      .toArray();

    expect(keyValues).toContainEqual(
      KeyValue.of("spring.ai.chat.client.advisors", '["advisor1", "advisor2"]'),
    );
    expect(keyValues).toContainEqual(
      KeyValue.of("spring.ai.chat.client.conversation.id", "007"),
    );
    expect(keyValues).toContainEqual(
      KeyValue.of(
        "spring.ai.chat.client.tool.names",
        '["tool1", "tool2", "toolCallback1", "toolCallback2"]',
      ),
    );
  });
});
