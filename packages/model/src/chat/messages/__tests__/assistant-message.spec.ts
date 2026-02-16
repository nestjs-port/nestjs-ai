import { describe, expect, it } from "vitest";
import { AssistantMessage } from "../assistant-message";
import { MessageType } from "../message-type";

describe("AssistantMessage", () => {
  it("when media is null then set default empty array", () => {
    const message = new AssistantMessage({ media: null as unknown as [] });
    expect(message.media).toEqual([]);
    expect(message.media).toHaveLength(0);
  });

  it("when metadata is null then set default object", () => {
    const message = new AssistantMessage({
      properties: null as unknown as Record<string, unknown>,
    });
    expect(message.metadata).toStrictEqual({
      messageType: MessageType.ASSISTANT,
    });
  });

  it("when tool calls is null then set default empty array", () => {
    const message = new AssistantMessage({ toolCalls: null as unknown as [] });
    expect(message.toolCalls).toEqual([]);
    expect(message.toolCalls).toHaveLength(0);
    expect(message.hasToolCalls()).toBe(false);
  });
});
