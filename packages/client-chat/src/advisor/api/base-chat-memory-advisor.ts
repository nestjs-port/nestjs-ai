import assert from "node:assert/strict";
import { StringUtils } from "@nestjs-ai/commons";
import { ChatMemory } from "@nestjs-ai/model";
import { BaseAdvisor } from "./base-advisor";

export abstract class BaseChatMemoryAdvisor extends BaseAdvisor {
  getConversationId(
    context: Map<string, unknown>,
    defaultConversationId: string,
  ): string {
    assert(context != null, "context cannot be null");
    for (const key of context.keys()) {
      assert(key != null, "context cannot contain null keys");
    }
    assert(
      StringUtils.hasText(defaultConversationId),
      "defaultConversationId cannot be null or empty",
    );

    return context.has(ChatMemory.CONVERSATION_ID)
      ? String(context.get(ChatMemory.CONVERSATION_ID))
      : defaultConversationId;
  }
}
