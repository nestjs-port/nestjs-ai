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
import { AbstractMessage } from "../abstract-message.js";
import { MessageType } from "../message-type.js";
import { SystemMessage } from "../system-message.js";

describe("SystemMessage", () => {
  it("system message with null text", () => {
    expect(
      () => new SystemMessage({ content: null as unknown as string }),
    ).toThrow("Content must not be null for SYSTEM or USER messages");
  });

  it("system message with text content", () => {
    const text = "Tell me, did you sail across the sun?";
    const message = new SystemMessage({ content: text });
    expect(message.text).toBe(text);
    expect(message.metadata[AbstractMessage.MESSAGE_TYPE]).toBe(
      MessageType.SYSTEM,
    );
  });

  it("system message from builder with text", () => {
    const text = "Tell me, did you sail across the sun?";
    const message = new SystemMessage({
      content: text,
      properties: { key: "value" },
    });
    expect(message.text).toBe(text);
    expect(message.metadata).toHaveProperty(
      AbstractMessage.MESSAGE_TYPE,
      MessageType.SYSTEM,
    );
    expect(message.metadata).toHaveProperty("key", "value");
  });

  it("system message copy", () => {
    const text1 = "Tell me, did you sail across the sun?";
    const metadata1 = { key: "value" };
    const systemMessage1 = new SystemMessage({
      content: text1,
      properties: metadata1,
    });

    const systemMessage2 = systemMessage1.copy();

    expect(systemMessage2.text).toBe(text1);
    expect(systemMessage2.metadata).not.toBe(metadata1);
    expect(systemMessage2.metadata).toHaveProperty(
      AbstractMessage.MESSAGE_TYPE,
      MessageType.SYSTEM,
    );
    expect(systemMessage2.metadata).toHaveProperty("key", "value");
  });

  it("system message mutate", () => {
    const text1 = "Tell me, did you sail across the sun?";
    const metadata1 = { key: "value" };
    const systemMessage1 = new SystemMessage({
      content: text1,
      properties: metadata1,
    });

    const systemMessage2 = new SystemMessage({
      content: systemMessage1.text ?? "",
      properties: { ...systemMessage1.metadata },
    });

    expect(systemMessage2.text).toBe(text1);
    expect(systemMessage2.metadata).not.toBe(metadata1);

    const text3 = "Farewell, Aragog!";
    const systemMessage3 = new SystemMessage({
      content: text3,
      properties: systemMessage2.metadata,
    });

    expect(systemMessage3.text).toBe(text3);
    expect(systemMessage3.metadata).not.toBe(systemMessage2.metadata);
  });

  it("system message with empty text", () => {
    const message = new SystemMessage({ content: "" });
    expect(message.text).toBe("");
    expect(message.metadata[AbstractMessage.MESSAGE_TYPE]).toBe(
      MessageType.SYSTEM,
    );
  });

  it("system message with whitespace text", () => {
    const text = "   \t\n   ";
    const message = new SystemMessage({ content: text });
    expect(message.text).toBe(text);
    expect(message.metadata[AbstractMessage.MESSAGE_TYPE]).toBe(
      MessageType.SYSTEM,
    );
  });

  it("system message builder with null text", () => {
    expect(
      () => new SystemMessage({ content: null as unknown as string }),
    ).toThrow("Content must not be null for SYSTEM or USER messages");
  });

  it("system message builder with empty metadata", () => {
    const text = "Test message";
    const message = new SystemMessage({ content: text, properties: {} });
    expect(message.text).toBe(text);
    expect(message.metadata).toHaveProperty(
      AbstractMessage.MESSAGE_TYPE,
      MessageType.SYSTEM,
    );
  });

  it("system message builder overwrite metadata", () => {
    const text = "Test message";
    const message = new SystemMessage({
      content: text,
      properties: { key2: "value2" },
    });

    expect(message.metadata).toHaveProperty(
      AbstractMessage.MESSAGE_TYPE,
      MessageType.SYSTEM,
    );
    expect(message.metadata).toHaveProperty("key2", "value2");
    expect(message.metadata).not.toHaveProperty("key1");
  });

  it("system message copy preserves immutability", () => {
    const text = "Original text";
    const originalMetadata = { key: "value" };
    const original = new SystemMessage({
      content: text,
      properties: originalMetadata,
    });

    const copy = original.copy();

    // Verify they are different instances
    expect(copy).not.toBe(original);
    expect(copy.metadata).not.toBe(original.metadata);

    // Verify content is equal
    expect(copy.text).toBe(original.text);
    expect(copy.metadata).toEqual(original.metadata);
  });

  it("system message mutate with new metadata", () => {
    const originalText = "Original text";
    const _original = new SystemMessage({
      content: originalText,
      properties: { key1: "value1" },
    });

    const mutated = new SystemMessage({
      content: originalText,
      properties: { key2: "value2" },
    });

    expect(mutated.text).toBe(originalText);
    expect(mutated.metadata).toHaveProperty(
      AbstractMessage.MESSAGE_TYPE,
      MessageType.SYSTEM,
    );
    expect(mutated.metadata).toHaveProperty("key2", "value2");
    expect(mutated.metadata).not.toHaveProperty("key1");
  });

  it("system message mutate chaining", () => {
    const _original = new SystemMessage({
      content: "Original",
      properties: { key1: "value1" },
    });

    const result = new SystemMessage({
      content: "Updated",
      properties: { key2: "value2" },
    });

    expect(result.text).toBe("Updated");
    expect(result.metadata).toHaveProperty(
      AbstractMessage.MESSAGE_TYPE,
      MessageType.SYSTEM,
    );
    expect(result.metadata).toHaveProperty("key2", "value2");
  });

  it("system message equals and hash code", () => {
    const text = "Test message";
    const metadata = { key: "value" };

    const message1 = new SystemMessage({ content: text, properties: metadata });
    const message2 = new SystemMessage({ content: text, properties: metadata });

    expect(message1.text).toBe(message2.text);
    expect(message1.metadata).toEqual(message2.metadata);
  });

  it("system message not equals with different text", () => {
    const message1 = new SystemMessage({ content: "Text 1" });
    const message2 = new SystemMessage({ content: "Text 2" });

    expect(message1.text).not.toBe(message2.text);
  });
});
