import { describe, expect, it } from "vitest";
import { AbstractMessage } from "../abstract-message";
import { MessageType } from "../message-type";
import { UserMessage } from "../user-message";

describe("UserMessage", () => {
  it("user message with null text", () => {
    expect(
      () => new UserMessage({ content: null as unknown as string }),
    ).toThrow("Content must not be null for SYSTEM or USER messages");
  });

  it("user message with text content", () => {
    const text = "Hello, world!";
    const message = new UserMessage({ content: text });
    expect(message.text).toBe(text);
    expect(message.media).toHaveLength(0);
    expect(message.metadata).toHaveProperty(
      AbstractMessage.MESSAGE_TYPE,
      MessageType.USER,
    );
  });

  it("user message from builder with text", () => {
    const text = "Hello, world!";
    const message = new UserMessage({
      content: text,
      media: [],
      properties: { key: "value" },
    });
    expect(message.text).toBe(text);
    expect(message.media).toHaveLength(0);
    expect(message.metadata).toHaveProperty(
      AbstractMessage.MESSAGE_TYPE,
      MessageType.USER,
    );
    expect(message.metadata).toHaveProperty("key", "value");
  });

  it("user message copy", () => {
    const text1 = "Hello, world!";
    const metadata1 = { key: "value" };
    const userMessage1 = new UserMessage({
      content: text1,
      media: [],
      properties: metadata1,
    });

    const userMessage2 = userMessage1.copy();

    expect(userMessage2.text).toBe(text1);
    expect(userMessage2.media).toHaveLength(0);
    expect(userMessage2.metadata).not.toBe(metadata1);
    expect(userMessage2.metadata).toHaveProperty(
      AbstractMessage.MESSAGE_TYPE,
      MessageType.USER,
    );
    expect(userMessage2.metadata).toHaveProperty("key", "value");
  });

  it("user message with empty text", () => {
    const message = new UserMessage({ content: "" });
    expect(message.text).toBe("");
    expect(message.media).toHaveLength(0);
    expect(message.metadata).toHaveProperty(
      AbstractMessage.MESSAGE_TYPE,
      MessageType.USER,
    );
  });

  it("user message with whitespace text", () => {
    const text = "   \t\n   ";
    const message = new UserMessage({ content: text });
    expect(message.text).toBe(text);
    expect(message.media).toHaveLength(0);
    expect(message.metadata).toHaveProperty(
      AbstractMessage.MESSAGE_TYPE,
      MessageType.USER,
    );
  });

  it("user message builder with null text", () => {
    expect(
      () => new UserMessage({ content: null as unknown as string }),
    ).toThrow("Content must not be null for SYSTEM or USER messages");
  });

  it("user message builder with empty media list", () => {
    const text = "No media attached";
    const message = new UserMessage({ content: text, media: [] });

    expect(message.text).toBe(text);
    expect(message.media).toHaveLength(0);
    expect(message.metadata).toHaveProperty(
      AbstractMessage.MESSAGE_TYPE,
      MessageType.USER,
    );
  });

  it("user message builder with empty metadata", () => {
    const text = "Test message";
    const message = new UserMessage({ content: text, properties: {} });

    expect(message.text).toBe(text);
    expect(message.metadata).toHaveProperty(
      AbstractMessage.MESSAGE_TYPE,
      MessageType.USER,
    );
  });

  it("user message builder overwrite metadata", () => {
    const text = "Test message";
    const message = new UserMessage({
      content: text,
      properties: { key2: "value2" },
    });

    expect(message.metadata).toHaveProperty(
      AbstractMessage.MESSAGE_TYPE,
      MessageType.USER,
    );
    expect(message.metadata).toHaveProperty("key2", "value2");
    expect(message.metadata).not.toHaveProperty("key1");
  });

  it("user message copy with no media", () => {
    const text = "Simple message";
    const metadata = { key: "value" };
    const original = new UserMessage({ content: text, properties: metadata });

    const copy = original.copy();

    expect(copy).not.toBe(original);
    expect(copy.text).toBe(text);
    expect(copy.media).toHaveLength(0);
    expect(copy.metadata).not.toBe(original.metadata);
    expect(copy.metadata).toEqual(original.metadata);
  });

  it("user message equals and hash code", () => {
    const text = "Test message";
    const metadata = { key: "value" };

    const message1 = new UserMessage({
      content: text,
      media: [],
      properties: metadata,
    });
    const message2 = new UserMessage({
      content: text,
      media: [],
      properties: metadata,
    });

    expect(message1.text).toBe(message2.text);
    expect(message1.metadata).toEqual(message2.metadata);
    expect(message1.media).toEqual(message2.media);
  });

  it("user message not equals with different text", () => {
    const message1 = new UserMessage({ content: "Text 1" });
    const message2 = new UserMessage({ content: "Text 2" });

    expect(message1.text).not.toBe(message2.text);
  });
});
