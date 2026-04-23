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

import { CheerioDocumentReader } from "../cheerio-document-reader.js";
import { CheerioDocumentReaderConfig } from "../config/index.js";

describe("CheerioDocumentReader", () => {
  it("test simple read", async () => {
    const reader = new CheerioDocumentReader({
      htmlResource: new URL("test.html", import.meta.url),
    });
    const documents = await reader.get();

    expect(documents).toHaveLength(1);
    const document = documents[0];
    expect(document.text).toContain("This is a test HTML document.");
    expect(document.text).toContain("Some paragraph text.");
    expect(document.metadata).toMatchObject({
      title: "Test HTML",
      description: "A test document for Spring AI",
      keywords: "test,html,spring ai",
    });
  });

  it("test simple read with additional metadata", async () => {
    const reader = new CheerioDocumentReader({
      htmlResource: new URL("test.html", import.meta.url),
      config: CheerioDocumentReaderConfig.builder()
        .additionalMetadata("key", "value")
        .build(),
    });
    const documents = await reader.get();

    expect(documents).toHaveLength(1);
    const document = documents[0];
    expect(document.metadata.key).toBe("value");
  });

  it("test selector", async () => {
    const reader = new CheerioDocumentReader({
      htmlResource: new URL("test.html", import.meta.url),
      config: CheerioDocumentReaderConfig.builder().selector("p").build(),
    });
    const documents = await reader.get();

    expect(documents).toHaveLength(1);
    expect(documents[0].text).toBe("Some paragraph text.");
  });

  it("test all elements", async () => {
    const reader = new CheerioDocumentReader({
      htmlResource: new URL("test.html", import.meta.url),
      config: CheerioDocumentReaderConfig.builder().allElements(true).build(),
    });
    const documents = await reader.get();

    expect(documents).toHaveLength(1);
    const document = documents[0];
    expect(document.text).toContain("This is a test HTML document.");
    expect(document.text).toContain("Some paragraph text.");
  });

  it("test with link urls", async () => {
    const reader = new CheerioDocumentReader({
      htmlResource: new URL("test.html", import.meta.url),
      config: CheerioDocumentReaderConfig.builder()
        .includeLinkUrls(true)
        .build(),
    });
    const documents = await reader.get();

    expect(documents).toHaveLength(1);
    const document = documents[0];

    expect(document.metadata).toHaveProperty("linkUrls");

    const linkUrls = document.metadata.linkUrls as string[];
    expect(linkUrls).toContain("https://spring.io/");
  });

  it("test with metadata tags", async () => {
    const reader = new CheerioDocumentReader({
      htmlResource: new URL("test.html", import.meta.url),
      config: CheerioDocumentReaderConfig.builder()
        .metadataTags(["custom1", "custom2"])
        .build(),
    });
    const documents = await reader.get();

    expect(documents).toHaveLength(1);
    const document = documents[0];
    expect(document.metadata).toMatchObject({
      custom1: "value1",
      custom2: "value2",
    });
  });

  it("test with group by element", async () => {
    const reader = new CheerioDocumentReader({
      htmlResource: new URL("test-group-by.html", import.meta.url),
      config: CheerioDocumentReaderConfig.builder()
        .groupByElement(true)
        .selector("section")
        .build(),
    });
    const documents = await reader.get();

    expect(documents).toHaveLength(2);
    expect(documents[0].text).toBe("Section 1 content");
    expect(documents[1].text).toBe("Section 2 content");
  });

  it.skipIf(true)("test wikipedia headlines", async () => {
    expect.hasAssertions();
    // Use a URL resource instead of classpath:
    const reader = new CheerioDocumentReader({
      htmlResource: "https://en.wikipedia.org/",
      config: CheerioDocumentReaderConfig.builder()
        .selector("#mp-itn b a")
        .includeLinkUrls(true)
        .build(),
    });

    const documents = await reader.get();
    expect(documents).toHaveLength(1);
    const document = documents[0];

    // Check for *some* content - we don't want to hard-code specific headlines
    // as they will change. This verifies the selector is working.
    expect(document.text).toBeTruthy();

    // Check if the metadata contains any links
    expect(document.metadata).toHaveProperty("linkUrls");
    expect(Array.isArray(document.metadata.linkUrls)).toBe(true);
  });

  it("test parse from string", async () => {
    const html =
      "<html><head><title>First parse</title></head>" +
      "<body><p>Parsed HTML into a doc.</p></body></html>";

    // Decode the base64 string and create a ByteArrayResource
    const htmlBytes = Buffer.from(html, "utf8");

    const reader = new CheerioDocumentReader({
      htmlResource: htmlBytes,
      config: CheerioDocumentReaderConfig.builder().build(),
    });

    const documents = await reader.get();
    expect(documents).toHaveLength(1);
    const doc = documents[0];
    expect(doc.text).toBe("Parsed HTML into a doc.");
    expect(doc.metadata.title).toBe("First parse");
  });

  it("test parse body fragment", async () => {
    const html = "<div><p>Lorem ipsum.</p></div>";

    // Decode the base64 string and create a ByteArrayResource
    const htmlBytes = Buffer.from(html, "utf8");

    const reader = new CheerioDocumentReader({
      htmlResource: htmlBytes,
      config: CheerioDocumentReaderConfig.builder()
        .selector("div") // Select the div
        .build(),
    });

    const documents = await reader.get();
    expect(documents).toHaveLength(1);
    expect(documents[0].text).toBe("Lorem ipsum.");
  });

  it("test non existing html resource", async () => {
    const reader = new CheerioDocumentReader({
      htmlResource: new URL("non-existing.html", import.meta.url),
      config: CheerioDocumentReaderConfig.builder().build(),
    });

    await expect(reader.get()).rejects.toThrow(Error);
  });
});
