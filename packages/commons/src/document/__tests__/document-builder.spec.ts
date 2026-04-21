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

import { beforeEach, describe, expect, it } from "vitest";

import { Media, MediaFormat } from "../../content";
import { Document, type DocumentBuilder } from "../document";
import type { IdGenerator } from "../id";

function getMedia(): Media {
  return new Media({
    mimeType: MediaFormat.IMAGE_JPEG,
    data: "http://type1",
  });
}

describe("DocumentBuilder", () => {
  let builder: DocumentBuilder;

  beforeEach(() => {
    builder = Document.builder();
  });

  it("test with id generator", () => {
    const mockGenerator: IdGenerator = {
      generateId(): string {
        return "mockedId";
      },
    };

    const result = builder.idGenerator(mockGenerator);

    expect(result).toBe(builder);

    const document = result
      .text("Test content")
      .metadata("key", "value")
      .build();

    expect(document.id).toBe("mockedId");
  });

  it("test with id generator null", () => {
    expect(() =>
      builder.idGenerator(null as unknown as IdGenerator).build(),
    ).toThrow("idGenerator cannot be null");
  });

  it("test with id", () => {
    const result = builder.text("text").id("testId");

    expect(result).toBe(builder);
    expect(result.build().id).toBe("testId");
  });

  it("test with id null or empty", () => {
    expect(() =>
      builder
        .text("text")
        .id(null as unknown as string)
        .build(),
    ).toThrow("id cannot be null or empty");

    expect(() => builder.text("text").id("").build()).toThrow(
      "id cannot be null or empty",
    );
  });

  it("test with content", () => {
    const result = builder.text("Test content");

    expect(result).toBe(builder);
    expect(result.build().text).toBe("Test content");
  });

  it("test with media single", () => {
    const media = new Media({
      mimeType: MediaFormat.IMAGE_JPEG,
      data: "http://test",
    });

    const result = builder.media(media);

    expect(result).toBe(builder);
    expect(result.build().media).toBe(media);
  });

  it("test with metadata map", () => {
    const metadata: Record<string, unknown> = {
      key1: "value1",
      key2: 2,
    };
    const result = builder.text("text").metadata(metadata);

    expect(result).toBe(builder);
    expect(result.build().metadata).toEqual(metadata);
  });

  it("test with metadata map null", () => {
    expect(() =>
      builder
        .text("text")
        .metadata(null as unknown as Record<string, unknown>)
        .build(),
    ).toThrow("metadata cannot be null");
  });

  it("test with metadata key value", () => {
    const result = builder.metadata("key", "value");

    expect(result).toBe(builder);
    expect(result.text("text").build().metadata).toHaveProperty("key", "value");
  });

  it("test with metadata key null", () => {
    expect(() =>
      builder
        .text("text")
        .metadata(null as unknown as string, "value")
        .build(),
    ).toThrow("metadata cannot be null");
  });

  it("test with metadata value null", () => {
    expect(() => builder.text("text").metadata("key", null).build()).toThrow(
      "metadata value cannot be null",
    );
  });

  it("test build without id", () => {
    const document = builder.text("text").text("Test content").build();

    expect(document.id).toBeTruthy();
    expect(document.text).toBe("Test content");
  });

  it("test build with all properties", () => {
    const metadata: Record<string, unknown> = {
      key: "value",
    };

    const document = builder
      .id("customId")
      .text("Test content")
      .metadata(metadata)
      .build();

    expect(document.id).toBe("customId");
    expect(document.text).toBe("Test content");
    expect(document.metadata).toEqual(metadata);
  });

  it("test with whitespace only id", () => {
    expect(() => builder.text("text").id("   ").build()).toThrow(
      "id cannot be null or empty",
    );
  });

  it("test with empty text", () => {
    const document = builder.text("").build();
    expect(document.text).toBe("");
  });

  it("test overwriting text", () => {
    const document = builder.text("initial text").text("final text").build();
    expect(document.text).toBe("final text");
  });

  it("test multiple metadata key value calls", () => {
    const document = builder
      .text("text")
      .metadata("key1", "value1")
      .metadata("key2", "value2")
      .metadata("key3", 123)
      .build();

    expect(Object.keys(document.metadata)).toHaveLength(3);
    expect(document.metadata).toHaveProperty("key1", "value1");
    expect(document.metadata).toHaveProperty("key2", "value2");
    expect(document.metadata).toHaveProperty("key3", 123);
  });

  it("test metadata map overrides key value", () => {
    const metadata: Record<string, unknown> = {
      newKey: "newValue",
    };

    const document = builder
      .text("text")
      .metadata("oldKey", "oldValue")
      .metadata(metadata)
      .build();

    expect(Object.keys(document.metadata)).toHaveLength(1);
    expect(document.metadata).toHaveProperty("newKey", "newValue");
    expect(document.metadata).not.toHaveProperty("oldKey");
  });

  it("test key value metadata after map", () => {
    const metadata: Record<string, unknown> = {
      mapKey: "mapValue",
    };

    const document = builder
      .text("text")
      .metadata(metadata)
      .metadata("additionalKey", "additionalValue")
      .build();

    expect(Object.keys(document.metadata)).toHaveLength(2);
    expect(document.metadata).toHaveProperty("mapKey", "mapValue");
    expect(document.metadata).toHaveProperty(
      "additionalKey",
      "additionalValue",
    );
  });

  it("test with empty metadata map", () => {
    const emptyMetadata: Record<string, unknown> = {};

    const document = builder.text("text").metadata(emptyMetadata).build();

    expect(Object.keys(document.metadata)).toHaveLength(0);
  });

  it("test overwriting metadata with same key", () => {
    const document = builder
      .text("text")
      .metadata("key", "firstValue")
      .metadata("key", "secondValue")
      .build();

    expect(Object.keys(document.metadata)).toHaveLength(1);
    expect(document.metadata).toHaveProperty("key", "secondValue");
  });

  it("test with null media", () => {
    const document = builder.text("text").media(null).build();
    expect(document.media).toBeNull();
  });

  it("test id overrides id generator", () => {
    const generator: IdGenerator = {
      generateId(): string {
        return "generated-id";
      },
    };

    const document = builder
      .text("text")
      .idGenerator(generator)
      .id("explicit-id")
      .build();

    expect(document.id).toBe("explicit-id");
  });

  it("test complex metadata types", () => {
    const nestedMap: Record<string, unknown> = {
      nested: "value",
    };

    const document = builder
      .text("text")
      .metadata("string", "text")
      .metadata("integer", 42)
      .metadata("double", 3.14)
      .metadata("boolean", true)
      .metadata("map", nestedMap)
      .build();

    expect(Object.keys(document.metadata)).toHaveLength(5);
    expect(document.metadata).toHaveProperty("string", "text");
    expect(document.metadata).toHaveProperty("integer", 42);
    expect(document.metadata).toHaveProperty("double", 3.14);
    expect(document.metadata).toHaveProperty("boolean", true);
    expect(document.metadata).toHaveProperty("map", nestedMap);
  });

  it("test builder reuse", () => {
    const doc1 = builder
      .text("first")
      .id("id1")
      .metadata("key", "value1")
      .build();

    const doc2 = builder
      .text("second")
      .id("id2")
      .metadata("key", "value2")
      .build();

    expect(doc1.id).toBe("id1");
    expect(doc1.text).toBe("first");
    expect(doc1.metadata).toHaveProperty("key", "value1");

    expect(doc2.id).toBe("id2");
    expect(doc2.text).toBe("second");
    expect(doc2.metadata).toHaveProperty("key", "value2");
  });

  it("test media document without text", () => {
    const media = getMedia();
    const document = builder.media(media).build();

    expect(document.media).toBe(media);
    expect(document.text).toBeNull();
  });

  it("test text document without media", () => {
    const document = builder.text("test content").build();

    expect(document.text).toBe("test content");
    expect(document.media).toBeNull();
  });

  it("test overwriting media with null", () => {
    const media = getMedia();
    const document = builder.media(media).media(null).text("fallback").build();

    expect(document.media).toBeNull();
  });

  it("test metadata with special character keys", () => {
    const document = builder
      .text("test")
      .metadata("key-with-dashes", "value1")
      .metadata("key.with.dots", "value2")
      .metadata("key_with_underscores", "value3")
      .metadata("key with spaces", "value4")
      .build();

    expect(document.metadata).toHaveProperty("key-with-dashes", "value1");
    expect(document.metadata).toHaveProperty("key.with.dots", "value2");
    expect(document.metadata).toHaveProperty("key_with_underscores", "value3");
    expect(document.metadata).toHaveProperty("key with spaces", "value4");
  });

  it("test builder state isolation", () => {
    builder.text("first").metadata("shared", "first");

    const doc1 = builder.build();

    builder.text("second").metadata("shared", "second");

    const doc2 = builder.build();

    expect(doc1.text).toBe("first");
    expect(doc1.metadata).toHaveProperty("shared", "first");

    expect(doc2.text).toBe("second");
    expect(doc2.metadata).toHaveProperty("shared", "second");
  });

  it("test builder method chaining", () => {
    const document = builder
      .text("chained")
      .id("chain-id")
      .metadata("key1", "value1")
      .metadata("key2", "value2")
      .score(0.75)
      .build();

    expect(document.text).toBe("chained");
    expect(document.id).toBe("chain-id");
    expect(Object.keys(document.metadata)).toHaveLength(2);
    expect(document.score).toBe(0.75);
  });

  it("test text with newlines and tabs", () => {
    const textWithFormatting =
      "Line 1\nLine 2\n\tTabbed line\r\nWindows line ending";
    const document = builder.text(textWithFormatting).build();

    expect(document.text).toBe(textWithFormatting);
  });

  it("test metadata overwriting with map after key value", () => {
    const newMetadata: Record<string, unknown> = {
      "map-key": "map-value",
    };

    const document = builder
      .text("test")
      .metadata("old-key", "old-value")
      .metadata("another-key", "another-value")
      .metadata(newMetadata)
      .build();

    expect(Object.keys(document.metadata)).toHaveLength(1);
    expect(document.metadata).toHaveProperty("map-key", "map-value");
    expect(document.metadata).not.toHaveProperty("old-key");
    expect(document.metadata).not.toHaveProperty("another-key");
  });

  it("test metadata key value pairs accumulation", () => {
    const document = builder
      .text("test")
      .metadata("a", "1")
      .metadata("b", "2")
      .metadata("c", "3")
      .metadata("d", "4")
      .metadata("e", "5")
      .build();

    expect(Object.keys(document.metadata)).toHaveLength(5);
    expect(Object.keys(document.metadata)).toEqual(
      expect.arrayContaining(["a", "b", "c", "d", "e"]),
    );
  });
});
