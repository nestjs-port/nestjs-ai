import type { ChatModel } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";

import { ChatModelStreamAdvisor } from "../chat-model-stream-advisor";

describe("ChatModelStreamAdvisor", () => {
  it("when chat model is null then throw", () => {
    expect(() => {
      new ChatModelStreamAdvisor(null as unknown as ChatModel);
    }).toThrow("chatModel cannot be null");
  });
});
