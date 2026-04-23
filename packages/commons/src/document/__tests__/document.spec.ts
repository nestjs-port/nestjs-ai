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

import { Media, MediaFormat } from "../../content/index.js";
import type { ContentFormatter } from "../content-formatter.interface.js";
import { Document } from "../document.js";
import type { IdGenerator } from "../id/index.js";
import { MetadataMode } from "../metadata-mode.js";

function getMedia(): Media {
  return new Media({
    mimeType: MediaFormat.IMAGE_JPEG,
    data: "http://type1",
  });
}

describe("Document", () => {
  it("test score", () => {
    const score = 0.95;
    const document = Document.builder()
      .text("Test content")
      .score(score)
      .build();

    expect(document.score).toBe(score);
  });

  it("test null score", () => {
    const document = Document.builder()
      .text("Test content")
      .score(null)
      .build();

    expect(document.score).toBeNull();
  });

  it("test mutate", () => {
    const metadata: Record<string, unknown> = { key: "value" };
    const score = 0.95;

    const original = Document.builder()
      .id("customId")
      .text("Test content")
      .media(null)
      .metadata(metadata)
      .score(score)
      .build();

    const mutated = original.mutate().build();

    expect(mutated).not.toBe(original);
    expect(mutated.id).toBe(original.id);
    expect(mutated.text).toBe(original.text);
    expect(mutated.media).toBe(original.media);
    expect(mutated.metadata).toEqual(original.metadata);
    expect(mutated.score).toBe(original.score);
  });

  it("test empty document", () => {
    expect(() => Document.builder().build()).toThrow(
      "exactly one of text or media must be specified",
    );
  });

  it("test media document construction", () => {
    const media = getMedia();
    const metadata: Record<string, unknown> = { key: "value" };

    const document = Document.builder().media(media).metadata(metadata).build();

    expect(document.media).toBe(media);
    expect(document.text).toBeNull();
    expect(document.isText).toBe(false);
  });

  it("test text document construction", () => {
    const metadata: Record<string, unknown> = { key: "value" };

    const document = Document.builder()
      .text("Test text")
      .metadata(metadata)
      .build();

    expect(document.text).toBe("Test text");
    expect(document.media).toBeNull();
    expect(document.isText).toBe(true);
  });

  it("test both text and media throws exception", () => {
    const media = getMedia();
    expect(() =>
      Document.builder().text("Test text").media(media).build(),
    ).toThrow("exactly one of text or media must be specified");
  });

  it("test custom id generator", () => {
    const customGenerator: IdGenerator = {
      generateId(...contents: unknown[]): string {
        return `custom-${String(contents[0])}`;
      },
    };

    const document = Document.builder()
      .text("test")
      .idGenerator(customGenerator)
      .build();

    expect(document.id).toBe("custom-test");
  });

  it("test metadata validation", () => {
    const metadata: Record<string, unknown> = { nullKey: null };

    expect(() =>
      Document.builder().text("test").metadata(metadata).build(),
    ).toThrow("metadata cannot have null values");
  });

  it("test formatted content", () => {
    const metadata: Record<string, unknown> = { key: "value" };

    const document = Document.builder()
      .text("Test text")
      .metadata(metadata)
      .build();

    const formattedContent = document.getFormattedContent(MetadataMode.ALL);
    expect(formattedContent).toContain("Test text");
    expect(formattedContent).toContain("key");
    expect(formattedContent).toContain("value");
  });

  it("test custom formatted content", () => {
    const document = Document.builder().text("Test text").build();

    const customFormatter: ContentFormatter = {
      format(doc): string {
        return `Custom: ${doc.text}`;
      },
    };
    const formattedContent = document.getFormattedContent(
      customFormatter,
      MetadataMode.ALL,
    );

    expect(formattedContent).toBe("Custom: Test text");
  });

  it("test null id throws exception", () => {
    expect(() =>
      Document.builder()
        .id(null as unknown as string)
        .text("test")
        .build(),
    ).toThrow("id cannot be null or empty");
  });

  it("test empty id throws exception", () => {
    expect(() => Document.builder().id("").text("test").build()).toThrow(
      "id cannot be null or empty",
    );
  });

  it("test metadata key value addition", () => {
    const document = Document.builder()
      .text("test")
      .metadata("key1", "value1")
      .metadata("key2", "value2")
      .build();

    expect(document.metadata).toHaveProperty("key1", "value1");
    expect(document.metadata).toHaveProperty("key2", "value2");
  });

  it("test metadata mode none", () => {
    const metadata: Record<string, unknown> = { secret: "hidden" };

    const document = Document.builder()
      .text("Visible content")
      .metadata(metadata)
      .build();

    const formattedContent = document.getFormattedContent(MetadataMode.NONE);
    expect(formattedContent).toContain("Visible content");
    expect(formattedContent).not.toContain("secret");
    expect(formattedContent).not.toContain("hidden");
  });

  it("test metadata mode embed", () => {
    const metadata: Record<string, unknown> = {
      embedKey: "embedValue",
      filterKey: "filterValue",
    };

    const document = Document.builder()
      .text("Test content")
      .metadata(metadata)
      .build();

    const formattedContent = document.getFormattedContent(MetadataMode.EMBED);
    expect(formattedContent).toContain("Test content");
  });

  it("test document builder chaining", () => {
    const metadata: Record<string, unknown> = { chain: "test" };

    const document = Document.builder()
      .text("Chain test")
      .metadata(metadata)
      .metadata("additional", "value")
      .score(0.85)
      .build();

    expect(document.text).toBe("Chain test");
    expect(document.metadata).toHaveProperty("chain", "test");
    expect(document.metadata).toHaveProperty("additional", "value");
    expect(document.score).toBe(0.85);
  });
});
