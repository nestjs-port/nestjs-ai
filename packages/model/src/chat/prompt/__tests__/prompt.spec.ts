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

import { assert, describe, expect, it } from "vitest";
import { AssistantMessage } from "../../messages/index.js";
import { SystemMessage } from "../../messages/index.js";
import { ToolResponseMessage } from "../../messages/index.js";
import { UserMessage } from "../../messages/index.js";
import { DefaultChatOptions } from "../default-chat-options.js";
import { Prompt } from "../prompt.js";

describe("Prompt", () => {
  it("when content is null then throw", () => {
    expect(() => new Prompt(null as unknown as string)).toThrow(
      "content or messages cannot be null",
    );

    expect(
      () => new Prompt(null as unknown as string, new DefaultChatOptions()),
    ).toThrow("content or messages cannot be null");
  });

  it("when content is empty then return", () => {
    const prompt = new Prompt("");
    assert.exists(prompt);

    const prompt2 = new Prompt("", new DefaultChatOptions());
    assert.exists(prompt2);
  });

  it("when message is null then throw", () => {
    expect(() => new Prompt(null as unknown as UserMessage)).toThrow(
      "content or messages cannot be null",
    );
  });

  it("when message list is null then throw", () => {
    expect(() => new Prompt(null as unknown as UserMessage[])).toThrow(
      "messages cannot be null",
    );

    expect(
      () =>
        new Prompt(null as unknown as UserMessage[], new DefaultChatOptions()),
    ).toThrow("messages cannot be null");
  });

  it("get user message when single", () => {
    const prompt = Prompt.builder()
      .messages(new UserMessage({ content: "Hello" }))
      .build();

    assert.exists(prompt.userMessage);
    expect(prompt.userMessage.text).toBe("Hello");
  });

  it("get user message when multiple", () => {
    const prompt = Prompt.builder()
      .messages(
        new UserMessage({ content: "Hello" }),
        new UserMessage({ content: "How are you?" }),
      )
      .build();

    assert.exists(prompt.userMessage);
    expect(prompt.userMessage.text).toBe("How are you?");
  });

  it("get user message when none", () => {
    const prompt = Prompt.builder()
      .messages(new SystemMessage({ content: "You'll be back!" }))
      .build();

    assert.exists(prompt.userMessage);
    expect(prompt.userMessage.text).toBe("");

    const prompt2 = Prompt.builder().messages([]).build();

    assert.exists(prompt2.userMessage);
    expect(prompt2.userMessage.text).toBe("");
  });

  it("augment user message when single", () => {
    const prompt = Prompt.builder()
      .messages(new UserMessage({ content: "Hello" }))
      .build();

    assert.exists(prompt.userMessage);
    expect(prompt.userMessage.text).toBe("Hello");

    const copy = prompt.augmentUserMessage((message) => {
      return new UserMessage({
        content: "How are you?",
        properties: message.metadata,
        media: message.media,
      });
    });

    assert.exists(copy.userMessage);
    expect(copy.userMessage.text).toBe("How are you?");
    assert.exists(prompt.userMessage);
    expect(prompt.userMessage.text).toBe("Hello");
  });

  it("augment user message when multiple", () => {
    const prompt = Prompt.builder()
      .messages(
        new UserMessage({ content: "Hello" }),
        new UserMessage({ content: "How are you?" }),
      )
      .build();

    assert.exists(prompt.userMessage);
    expect(prompt.userMessage.text).toBe("How are you?");

    const copy = prompt.augmentUserMessage((message) => {
      return new UserMessage({
        content: "What about you?",
        properties: message.metadata,
        media: message.media,
      });
    });

    assert.exists(copy.userMessage);
    expect(copy.userMessage.text).toBe("What about you?");
    assert.exists(prompt.userMessage);
    expect(prompt.userMessage.text).toBe("How are you?");
  });

  it("augment user message when none", () => {
    const prompt = Prompt.builder()
      .messages(new SystemMessage({ content: "You'll be back!" }))
      .build();

    assert.exists(prompt.userMessage);
    expect(prompt.userMessage.text).toBe("");

    const copy = prompt.augmentUserMessage((message) => {
      return new UserMessage({
        content: "How are you?",
        properties: message.metadata,
        media: message.media,
      });
    });

    expect(copy.instructions[copy.instructions.length - 1]).toBeInstanceOf(
      UserMessage,
    );
    assert.exists(copy.userMessage);
    expect(copy.userMessage.text).toBe("How are you?");
    assert.exists(prompt.userMessage);
    expect(prompt.userMessage.text).toBe("");
  });

  it("get system message when single", () => {
    const prompt = Prompt.builder()
      .messages(new SystemMessage({ content: "Hello" }))
      .build();

    assert.exists(prompt.systemMessage);
    expect(prompt.systemMessage.text).toBe("Hello");
  });

  it("get system message when multiple", () => {
    const prompt = Prompt.builder()
      .messages(
        new SystemMessage({ content: "Hello" }),
        new SystemMessage({ content: "How are you?" }),
      )
      .build();

    assert.exists(prompt.systemMessage);
    expect(prompt.systemMessage.text).toBe("Hello");
  });

  it("get system message when none", () => {
    const prompt = Prompt.builder()
      .messages(new UserMessage({ content: "You'll be back!" }))
      .build();

    assert.exists(prompt.systemMessage);
    expect(prompt.systemMessage.text).toBe("");

    const prompt2 = Prompt.builder().messages([]).build();

    assert.exists(prompt2.systemMessage);
    expect(prompt2.systemMessage.text).toBe("");
  });

  it("augment system message when single", () => {
    const prompt = Prompt.builder()
      .messages(new SystemMessage({ content: "Hello" }))
      .build();

    assert.exists(prompt.systemMessage);
    expect(prompt.systemMessage.text).toBe("Hello");

    const copy = prompt.augmentSystemMessage((message) => {
      return new SystemMessage({
        content: "How are you?",
        properties: message.metadata,
      });
    });

    assert.exists(copy.systemMessage);
    expect(copy.systemMessage.text).toBe("How are you?");
    assert.exists(prompt.systemMessage);
    expect(prompt.systemMessage.text).toBe("Hello");
  });

  it("augment system message when multiple", () => {
    const prompt = Prompt.builder()
      .messages(
        new SystemMessage({ content: "Hello" }),
        new SystemMessage({ content: "How are you?" }),
      )
      .build();

    assert.exists(prompt.systemMessage);
    expect(prompt.systemMessage.text).toBe("Hello");

    const copy = prompt.augmentSystemMessage((message) => {
      return new SystemMessage({
        content: "What about you?",
        properties: message.metadata,
      });
    });

    assert.exists(copy.systemMessage);
    expect(copy.systemMessage.text).toBe("What about you?");
    assert.exists(prompt.systemMessage);
    expect(prompt.systemMessage.text).toBe("Hello");
  });

  it("augment system message when none", () => {
    const prompt = Prompt.builder()
      .messages(new UserMessage({ content: "You'll be back!" }))
      .build();

    assert.exists(prompt.systemMessage);
    expect(prompt.systemMessage.text).toBe("");

    const copy = prompt.augmentSystemMessage((message) => {
      return new SystemMessage({
        content: "How are you?",
        properties: message.metadata,
      });
    });

    expect(copy.instructions[0]).toBeInstanceOf(SystemMessage);
    assert.exists(copy.systemMessage);
    expect(copy.systemMessage.text).toBe("How are you?");
    assert.exists(prompt.systemMessage);
    expect(prompt.systemMessage.text).toBe("");
  });

  it("augment system message when not first", () => {
    const messages = [
      new UserMessage({ content: "Hi" }),
      new SystemMessage({ content: "Hello" }),
    ];
    const prompt = Prompt.builder().messages(messages).build();

    assert.exists(prompt.systemMessage);
    assert.exists(prompt.userMessage);
    expect(prompt.userMessage.text).toBe("Hi");
    expect(prompt.systemMessage.text).toBe("Hello");

    const copy = prompt.augmentSystemMessage((message) => {
      return new SystemMessage({
        content: "How are you?",
        properties: message.metadata,
      });
    });

    assert.exists(copy.systemMessage);
    expect(copy.instructions.length).toBe(messages.length);
    expect(copy.systemMessage.text).toBe("How are you?");

    assert.exists(prompt.systemMessage);
    assert.exists(prompt.userMessage);
    expect(prompt.userMessage.text).toBe("Hi");
    expect(prompt.systemMessage.text).toBe("Hello");
  });

  it("should preserve message order", () => {
    const system = new SystemMessage({ content: "You are helpful" });
    const user1 = new UserMessage({ content: "First question" });
    const user2 = new UserMessage({ content: "Second question" });

    const prompt = Prompt.builder().messages(system, user1, user2).build();

    expect(prompt.instructions).toHaveLength(3);
    expect(prompt.instructions[0]).toBe(system);
    expect(prompt.instructions[1]).toBe(user1);
    expect(prompt.instructions[2]).toBe(user2);
  });

  it("should handle empty message list", () => {
    const prompt = Prompt.builder().messages([]).build();

    expect(prompt.instructions).toHaveLength(0);
    expect(prompt.userMessage.text).toBe("");
    expect(prompt.systemMessage.text).toBe("");
  });

  it("should create prompt with options", () => {
    const options = new DefaultChatOptions({
      model: "test-model",
      temperature: 0.5,
    });
    const prompt = new Prompt("Test content", options);

    expect(prompt.options).toBe(options);
    expect(prompt.userMessage.text).toBe("Test content");
  });

  it("should handle mixed message types", () => {
    const system = new SystemMessage({ content: "System message" });
    const user = new UserMessage({ content: "User message" });

    const prompt = Prompt.builder().messages(user, system).build();

    expect(prompt.instructions).toHaveLength(2);
    expect(prompt.userMessage.text).toBe("User message");
    expect(prompt.systemMessage.text).toBe("System message");
  });

  it("get last user or tool response message when only user message", () => {
    const prompt = Prompt.builder()
      .messages(new UserMessage({ content: "Hello" }))
      .build();

    assert.exists(prompt.lastUserOrToolResponseMessage);
    expect(prompt.lastUserOrToolResponseMessage).toBeInstanceOf(UserMessage);
    expect(prompt.lastUserOrToolResponseMessage.text).toBe("Hello");
  });

  it("get last user or tool response message when only tool response", () => {
    const toolResponse = new ToolResponseMessage({
      responses: [{ id: "toolId", name: "toolName", responseData: "result" }],
    });
    const prompt = Prompt.builder().messages(toolResponse).build();

    assert.exists(prompt.lastUserOrToolResponseMessage);
    expect(prompt.lastUserOrToolResponseMessage).toBeInstanceOf(
      ToolResponseMessage,
    );
  });

  it("get last user or tool response message when both present", () => {
    const userMsg = new UserMessage({ content: "User question" });
    const toolResponse = new ToolResponseMessage({
      responses: [{ id: "toolId", name: "toolName", responseData: "result" }],
    });

    const prompt = Prompt.builder()
      .messages(
        userMsg,
        new AssistantMessage({ content: "AI response" }),
        toolResponse,
      )
      .build();

    // Should return the last one chronologically (toolResponse)
    assert.exists(prompt.lastUserOrToolResponseMessage);
    expect(prompt.lastUserOrToolResponseMessage).toBeInstanceOf(
      ToolResponseMessage,
    );
  });

  it("get last user or tool response message when multiple user messages", () => {
    const prompt = Prompt.builder()
      .messages(
        new UserMessage({ content: "First question" }),
        new UserMessage({ content: "Second question" }),
      )
      .build();

    // Should return the last UserMessage
    assert.exists(prompt.lastUserOrToolResponseMessage);
    expect(prompt.lastUserOrToolResponseMessage).toBeInstanceOf(UserMessage);
    expect(prompt.lastUserOrToolResponseMessage.text).toBe("Second question");
  });

  it("get last user or tool response message when only system and assistant", () => {
    const prompt = Prompt.builder()
      .messages(
        new SystemMessage({ content: "System" }),
        new AssistantMessage({ content: "AI" }),
      )
      .build();

    // Should return empty UserMessage
    assert.exists(prompt.lastUserOrToolResponseMessage);
    expect(prompt.lastUserOrToolResponseMessage).toBeInstanceOf(UserMessage);
    expect(prompt.lastUserOrToolResponseMessage.text).toBe("");
  });

  it("get last user or tool response message when empty", () => {
    const prompt = Prompt.builder().messages([]).build();

    assert.exists(prompt.lastUserOrToolResponseMessage);
    expect(prompt.lastUserOrToolResponseMessage).toBeInstanceOf(UserMessage);
    expect(prompt.lastUserOrToolResponseMessage.text).toBe("");
  });

  it("get last user or tool response message with mixed ordering", () => {
    // Test with tool response before user message
    const userMsg = new UserMessage({ content: "Latest user message" });
    const toolResponse = new ToolResponseMessage({
      responses: [{ id: "toolId", name: "toolName", responseData: "result" }],
    });

    const prompt = Prompt.builder()
      .messages(toolResponse, new SystemMessage({ content: "System" }), userMsg)
      .build();

    // Should return the last UserMessage
    assert.exists(prompt.lastUserOrToolResponseMessage);
    expect(prompt.lastUserOrToolResponseMessage).toBeInstanceOf(UserMessage);
    expect(prompt.lastUserOrToolResponseMessage.text).toBe(
      "Latest user message",
    );
  });
});
