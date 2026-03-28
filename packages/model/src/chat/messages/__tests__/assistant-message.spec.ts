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
