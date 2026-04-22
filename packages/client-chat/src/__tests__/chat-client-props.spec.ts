/*
 * Copyright 2026-present the original author or authors.
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

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Media, MediaFormat } from "@nestjs-ai/commons";
import {
  AssistantMessage,
  type ChatModel,
  ChatResponse,
  DefaultToolCallingChatOptions,
  FunctionToolCallback,
  Generation,
  type Message,
  MessageType,
  type Prompt,
  SystemMessage,
  type ToolCallingChatOptions,
  UserMessage,
} from "@nestjs-ai/model";
import { lastValueFrom, type Observable, of, reduce } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ChatClient } from "../chat-client";

describe("ChatClient prompt(props) API", () => {
  const ToolInputSchema = z.object({
    input: z.string(),
  });

  const mockFunction = ({ input }: z.infer<typeof ToolInputSchema>) => input;

  it("accepts string user and system shortcuts", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const content = await ChatClient.builder(chatModel)
      .build()
      .prompt({ user: "my question", system: "be helpful" })
      .call()
      .content();

    expect(content).toBe("response");

    expect(captured.value.instructions).toHaveLength(2);
    const systemMessage = captured.value.instructions[0] as Message;
    expect(systemMessage.text).toBe("be helpful");
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);

    const userMessage = captured.value.instructions[1] as Message;
    expect(userMessage.text).toBe("my question");
    expect(userMessage.messageType).toBe(MessageType.USER);
  });

  it("expands nested user props with params, media and metadata", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);
    const tabbyCatResource = readFileSync(
      resolve(__dirname, "./tabby-cat.png"),
    );

    const content = await ChatClient.builder(chatModel)
      .build()
      .prompt({
        system: {
          text: "System text {topic}",
          params: { topic: "ai" },
          metadata: { smetadata1: "svalue1" },
        },
        user: {
          text: "User text {music}",
          params: { music: "Rock" },
          metadata: new Map([["umetadata1", "udata1"]]),
          media: [
            new Media({
              mimeType: MediaFormat.IMAGE_JPEG,
              data: tabbyCatResource,
            }),
          ],
        },
      })
      .call()
      .content();

    expect(content).toBe("response");
    const systemMessage = captured.value.instructions[0] as Message;
    expect(systemMessage.text).toBe("System text ai");
    expect(systemMessage.metadata.smetadata1).toBe("svalue1");

    const userMessage = captured.value.instructions[1] as UserMessage;
    expect(userMessage.text).toBe("User text Rock");
    expect(userMessage.media).toHaveLength(1);
    expect(userMessage.media[0]?.mimeType).toBe(MediaFormat.IMAGE_JPEG);
    expect(userMessage.metadata.umetadata1).toBe("udata1");
  });

  it("prepends explicit messages before user text", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const content = await ChatClient.builder(chatModel)
      .build()
      .prompt({
        messages: [
          new SystemMessage({ content: "history instructions" }),
          new UserMessage({ content: "earlier question" }),
          new AssistantMessage({ content: "earlier answer" }),
        ],
        user: "follow up",
      })
      .call()
      .content();

    expect(content).toBe("response");
    expect(captured.value.instructions).toHaveLength(4);
    expect((captured.value.instructions[3] as Message).text).toBe("follow up");
  });

  it("applies tool callbacks, tool names and tool context", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(
      captured,
      new DefaultToolCallingChatOptions(),
    );

    const callback = FunctionToolCallback.builder("fun3", mockFunction)
      .description("fun3description")
      .inputType(ToolInputSchema)
      .build();

    await ChatClient.builder(chatModel)
      .build()
      .prompt({
        user: "use tools",
        toolNames: ["fun1", "fun2"],
        toolCallbacks: [callback],
        toolContext: { sessionId: "abc" },
      })
      .call()
      .content();

    const runtimeOptions = captured.value.options as ToolCallingChatOptions;
    expect(Array.from(runtimeOptions.toolNames)).toEqual(
      expect.arrayContaining(["fun1", "fun2"]),
    );
    expect(runtimeOptions.toolCallbacks[0]?.toolDefinition.name).toBe("fun3");
    expect(runtimeOptions.toolContext).toEqual(
      expect.objectContaining({ sessionId: "abc" }),
    );
  });

  it("streams aggregated content via prompt(props).stream()", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const content = await join(
      ChatClient.builder(chatModel)
        .build()
        .prompt({ user: "ping", system: "pong" })
        .stream()
        .content(),
    );

    expect(content).toBe("response");
    const systemMessage = captured.value.instructions[0] as Message;
    expect(systemMessage.text).toBe("pong");
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);
    const userMessage = captured.value.instructions[1] as Message;
    expect(userMessage.text).toBe("ping");
    expect(userMessage.messageType).toBe(MessageType.USER);
  });

  it("respects builder defaults and overrides them when props are set", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const chatClient = ChatClient.builder(chatModel)
      .defaultSystem("default system")
      .defaultUser("default user")
      .build();

    // Defaults apply when props omit user/system
    await chatClient.prompt({}).call().content();
    expect((captured.value.instructions[0] as Message).text).toBe(
      "default system",
    );
    expect((captured.value.instructions[1] as Message).text).toBe(
      "default user",
    );

    // Props override defaults when specified
    await chatClient
      .prompt({ user: "override user", system: "override system" })
      .call()
      .content();
    expect((captured.value.instructions[0] as Message).text).toBe(
      "override system",
    );
    expect((captured.value.instructions[1] as Message).text).toBe(
      "override user",
    );
  });

  it("lets callers chain fluent setters after prompt(props)", async () => {
    const captured = createCapturedPrompt();
    const chatModel = createChatModel(captured);

    const content = await ChatClient.builder(chatModel)
      .build()
      .prompt({ user: "original", system: "props system" })
      .user("overridden via fluent")
      .call()
      .content();

    expect(content).toBe("response");
    const systemMessage = captured.value.instructions[0] as Message;
    expect(systemMessage.text).toBe("props system");
    const userMessage = captured.value.instructions[1] as Message;
    expect(userMessage.text).toBe("overridden via fluent");
  });
});

function createCapturedPrompt(): { value: Prompt } {
  return { value: {} as Prompt };
}

function createChatModel(
  captured: { value: Prompt },
  options?: ToolCallingChatOptions,
): ChatModel {
  return {
    call: vi.fn(async (prompt: Prompt) => {
      captured.value = prompt;
      return createResponse("response");
    }),
    stream: vi.fn((prompt: Prompt) => {
      captured.value = prompt;
      return of(createResponse("response"));
    }),
    get defaultOptions() {
      return options ?? new DefaultToolCallingChatOptions();
    },
  } as unknown as ChatModel;
}

function createResponse(content: string): ChatResponse {
  return new ChatResponse({
    generations: [
      new Generation({
        assistantMessage: new AssistantMessage({ content }),
      }),
    ],
  });
}

function join(content$: Observable<string>): Promise<string> {
  return lastValueFrom(content$.pipe(reduce((acc, value) => acc + value, "")));
}
