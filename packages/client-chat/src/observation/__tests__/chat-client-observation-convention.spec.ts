import { type KeyValue, ObservationContext } from "@nestjs-ai/commons";
import { Prompt } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";

import { ChatClientRequest } from "../../chat-client-request";
import { ChatClientObservationContext } from "../chat-client-observation-context";
import { ChatClientObservationConvention } from "../chat-client-observation-convention";

class TestChatClientObservationConvention extends ChatClientObservationConvention {
  override getName(): string {
    return "test.chat.client";
  }

  override getContextualName(_context: ChatClientObservationContext): string {
    return "test chat client";
  }

  override getLowCardinalityKeyValues(
    _context: ChatClientObservationContext,
  ): KeyValue[] {
    return [];
  }

  override getHighCardinalityKeyValues(
    _context: ChatClientObservationContext,
  ): KeyValue[] {
    return [];
  }
}

describe("ChatClientObservationConvention", () => {
  it("supports chat client observation context", () => {
    const convention = new TestChatClientObservationConvention();
    const context = ChatClientObservationContext.builder()
      .request(ChatClientRequest.builder().prompt(new Prompt("Hello")).build())
      .build();

    expect(convention.supportsContext(context)).toBe(true);
    expect(convention.supportsContext(new ObservationContext())).toBe(false);
  });
});
