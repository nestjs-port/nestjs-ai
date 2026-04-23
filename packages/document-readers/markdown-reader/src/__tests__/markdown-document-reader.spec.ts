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

import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  MarkdownDocumentReader,
  MarkdownDocumentReaderConfig,
} from "../index.js";

describe("MarkdownDocumentReader", () => {
  it("test dir path single", async () => {
    const reader = new MarkdownDocumentReader({
      markdownResources: resourcePath("dir-test-1/*.md"),
    });

    const documents = await reader.get();

    expectUnorderedDocuments(
      documents.map((document) => ({
        metadata: document.metadata,
        text: document.text ?? "",
      })),
      [
        {
          metadata: {},
          text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur diam eros, laoreet sit amet cursus vitae, varius sed nisi. Cras sit amet quam quis velit commodo porta consectetur id nisi. Phasellus tincidunt pulvinar augue.",
        },
        {
          metadata: { category: "blockquote" },
          text: "Proin vel laoreet leo, sed luctus augue. Sed et ligula commodo, commodo lacus at, consequat turpis. Maecenas eget sapien odio. Maecenas urna lectus, pellentesque in accumsan aliquam, congue eu libero. Ut rhoncus nec justo a porttitor. Pellentesque auctor pharetra eros, viverra sodales lorem aliquet id. Curabitur semper nisi vel sem interdum suscipit.",
        },
      ],
    );
  });

  it("test dir path multiple", async () => {
    const reader = new MarkdownDocumentReader({
      markdownResources: resourcePath("dir-test-2/*.md"),
    });
    const documents = await reader.get();

    expectUnorderedDocuments(
      documents.map((document) => ({
        metadata: document.metadata,
        text: document.text ?? "",
      })),
      [
        {
          metadata: {
            category: "header_1",
            title: "This is a fancy header name",
          },
          text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt velit non bibendum gravida. Cras accumsan tincidunt ornare. Donec hendrerit consequat tellus blandit accumsan. Aenean aliquam metus at arcu elementum dignissim.",
        },
        {
          metadata: { category: "header_3", title: "Header 3" },
          text: "Aenean eu leo eu nibh tristique posuere quis quis massa.",
        },
        {
          metadata: { category: "header_1", title: "Header 1a" },
          text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur diam eros, laoreet sit amet cursus vitae, varius sed nisi. Cras sit amet quam quis velit commodo porta consectetur id nisi. Phasellus tincidunt pulvinar augue.",
        },
        {
          metadata: { category: "header_1", title: "Header 1b" },
          text: "Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Etiam lobortis risus libero, sed sollicitudin risus cursus in. Morbi enim metus, ornare vel lacinia eget, venenatis vel nibh.",
        },
        {
          metadata: { category: "header_2", title: "Header 2b" },
          text: "Proin vel laoreet leo, sed luctus augue. Sed et ligula commodo, commodo lacus at, consequat turpis. Maecenas eget sapien odio. Maecenas urna lectus, pellentesque in accumsan aliquam, congue eu libero.",
        },
        {
          metadata: { category: "header_2", title: "Header 2c" },
          text: "Ut rhoncus nec justo a porttitor. Pellentesque auctor pharetra eros, viverra sodales lorem aliquet id. Curabitur semper nisi vel sem interdum suscipit.",
        },
      ],
    );
  });

  it("test only headers with paragraphs", async () => {
    const reader = new MarkdownDocumentReader({
      markdownResources: resourcePath("only-headers.md"),
    });

    const documents = await reader.get();

    expectUnorderedDocuments(
      documents.map((document) => ({
        metadata: document.metadata,
        text: document.text ?? "",
      })),
      [
        {
          metadata: { category: "header_1", title: "Header 1a" },
          text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur diam eros, laoreet sit amet cursus vitae, varius sed nisi. Cras sit amet quam quis velit commodo porta consectetur id nisi. Phasellus tincidunt pulvinar augue.",
        },
        {
          metadata: { category: "header_1", title: "Header 1b" },
          text: "Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Etiam lobortis risus libero, sed sollicitudin risus cursus in. Morbi enim metus, ornare vel lacinia eget, venenatis vel nibh.",
        },
        {
          metadata: { category: "header_2", title: "Header 2b" },
          text: "Proin vel laoreet leo, sed luctus augue. Sed et ligula commodo, commodo lacus at, consequat turpis. Maecenas eget sapien odio. Maecenas urna lectus, pellentesque in accumsan aliquam, congue eu libero.",
        },
        {
          metadata: { category: "header_2", title: "Header 2c" },
          text: "Ut rhoncus nec justo a porttitor. Pellentesque auctor pharetra eros, viverra sodales lorem aliquet id. Curabitur semper nisi vel sem interdum suscipit.",
        },
      ],
    );
  });

  it("test with formatting", async () => {
    const reader = new MarkdownDocumentReader({
      markdownResources: resourcePath("with-formatting.md"),
    });

    const documents = await reader.get();

    expectUnorderedDocuments(
      documents.map((document) => ({
        metadata: document.metadata,
        text: document.text ?? "",
      })),
      [
        {
          metadata: {
            category: "header_1",
            title: "This is a fancy header name",
          },
          text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt velit non bibendum gravida. Cras accumsan tincidunt ornare. Donec hendrerit consequat tellus blandit accumsan. Aenean aliquam metus at arcu elementum dignissim.",
        },
        {
          metadata: { category: "header_3", title: "Header 3" },
          text: "Aenean eu leo eu nibh tristique posuere quis quis massa.",
        },
      ],
    );
  });

  it("test document divided via horizontal rules", async () => {
    const config = MarkdownDocumentReaderConfig.builder()
      .horizontalRuleCreateDocument(true)
      .build();

    const reader = new MarkdownDocumentReader({
      markdownResources: resourcePath("horizontal-rules.md"),
      config,
    });
    const documents = await reader.get();

    expectUnorderedDocuments(
      documents.map((document) => ({
        metadata: document.metadata,
        text: document.text ?? "",
      })),
      [
        {
          metadata: {},
          text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt velit non bibendum gravida.",
        },
        {
          metadata: {},
          text: "Cras accumsan tincidunt ornare. Donec hendrerit consequat tellus blandit accumsan. Aenean aliquam metus at arcu elementum dignissim.",
        },
        {
          metadata: {},
          text: "Nullam nisi dui, egestas nec sem nec, interdum lobortis enim. Pellentesque odio orci, faucibus eu luctus nec, venenatis et magna.",
        },
        {
          metadata: {},
          text: "Vestibulum nec eros non felis fermentum posuere eget ac risus. Curabitur et fringilla massa. Cras facilisis nec nisl sit amet sagittis.",
        },
        {
          metadata: {},
          text: "Aenean eu leo eu nibh tristique posuere quis quis massa. Nullam lacinia luctus sem ut vehicula.",
        },
        {
          metadata: {},
          text: "Aenean quis vulputate mi. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Nam tincidunt nunc a tortor tincidunt, nec lobortis diam rhoncus.",
        },
        {
          metadata: {},
          text: "Nulla facilisi. Phasellus eget tellus sed nibh ornare interdum eu eu mi.",
        },
      ],
    );
  });

  it("test document not divided via horizontal rules when disabled", async () => {
    const config = MarkdownDocumentReaderConfig.builder()
      .horizontalRuleCreateDocument(false)
      .build();

    const reader = new MarkdownDocumentReader({
      markdownResources: resourcePath("horizontal-rules.md"),
      config,
    });
    const documents = await reader.get();

    expect(documents).toHaveLength(1);
    const document = documents[0];
    expect(document.metadata).toEqual({});
    expect(
      document.text?.startsWith(
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
      ),
    ).toBe(true);
    expect(
      document.text?.endsWith(
        "Phasellus eget tellus sed nibh ornare interdum eu eu mi.",
      ),
    ).toBe(true);
  });

  it("test simple markdown document with hard and soft line breaks", async () => {
    const reader = new MarkdownDocumentReader({
      markdownResources: resourcePath("simple.md"),
    });

    const documents = await reader.get();

    expect(documents).toHaveLength(1);
    const document = documents[0];
    expect(document.metadata).toEqual({});
    expect(document.text).toBe(
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt velit non bibendum gravida. Cras accumsan tincidunt ornare. Donec hendrerit consequat tellus blandit accumsan. Aenean aliquam metus at arcu elementum dignissim.Nullam nisi dui, egestas nec sem nec, interdum lobortis enim. Pellentesque odio orci, faucibus eu luctus nec, venenatis et magna. Vestibulum nec eros non felis fermentum posuere eget ac risus.Aenean eu leo eu nibh tristique posuere quis quis massa. Nullam lacinia luctus sem ut vehicula.",
    );
  });

  it("test code", async () => {
    const config = MarkdownDocumentReaderConfig.builder()
      .horizontalRuleCreateDocument(true)
      .build();

    const reader = new MarkdownDocumentReader({
      markdownResources: resourcePath("code.md"),
      config,
    });

    const documents = await reader.get();

    expect(documents).toHaveLength(5);
    expect(documents[0].metadata).toEqual({});
    expect(documents[0].text).toBe("This is a Java sample application:");

    expect(documents[1].metadata).toEqual({
      lang: "java",
      category: "code_block",
    });
    expect(documents[1].text?.startsWith("package com.example.demo;")).toBe(
      true,
    );
    expect(documents[1].text).toContain(
      "SpringApplication.run(DemoApplication.class, args);",
    );

    expect(documents[2].metadata).toEqual({ category: "code_inline" });
    expect(documents[2].text).toBe(
      "Markdown also provides the possibility to use inline code formatting throughout the entire sentence.",
    );

    expect(documents[3].metadata).toEqual({});
    expect(documents[3].text).toBe(
      "Another possibility is to set block code without specific highlighting:",
    );

    expect(documents[4].metadata).toEqual({ lang: "", category: "code_block" });
    expect(documents[4].text).toBe("./mvnw spring-javaformat:apply\n");
  });

  it("test code when code block should not be separated document", async () => {
    const config = MarkdownDocumentReaderConfig.builder()
      .horizontalRuleCreateDocument(true)
      .includeCodeBlock(true)
      .build();

    const reader = new MarkdownDocumentReader({
      markdownResources: resourcePath("code.md"),
      config,
    });

    const documents = await reader.get();

    expect(documents).toHaveLength(3);

    expect(documents[0].metadata).toEqual({
      lang: "java",
      category: "code_block",
    });
    expect(
      documents[0].text?.startsWith(
        "This is a Java sample application: package com.example.demo",
      ),
    ).toBe(true);
    expect(documents[0].text).toContain(
      "SpringApplication.run(DemoApplication.class, args);",
    );

    expect(documents[1].metadata).toEqual({ category: "code_inline" });
    expect(documents[1].text).toBe(
      "Markdown also provides the possibility to use inline code formatting throughout the entire sentence.",
    );

    expect(documents[2].metadata).toEqual({ lang: "", category: "code_block" });
    expect(documents[2].text).toBe(
      "Another possibility is to set block code without specific highlighting: ./mvnw spring-javaformat:apply\n",
    );
  });

  it("test blockquote", async () => {
    const reader = new MarkdownDocumentReader({
      markdownResources: resourcePath("blockquote.md"),
    });

    const documents = await reader.get();

    expectUnorderedDocuments(
      documents.map((document) => ({
        metadata: document.metadata,
        text: document.text ?? "",
      })),
      [
        {
          metadata: {},
          text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur diam eros, laoreet sit amet cursus vitae, varius sed nisi. Cras sit amet quam quis velit commodo porta consectetur id nisi. Phasellus tincidunt pulvinar augue.",
        },
        {
          metadata: { category: "blockquote" },
          text: "Proin vel laoreet leo, sed luctus augue. Sed et ligula commodo, commodo lacus at, consequat turpis. Maecenas eget sapien odio. Maecenas urna lectus, pellentesque in accumsan aliquam, congue eu libero. Ut rhoncus nec justo a porttitor. Pellentesque auctor pharetra eros, viverra sodales lorem aliquet id. Curabitur semper nisi vel sem interdum suscipit.",
        },
      ],
    );
  });

  it("test blockquote when blockquote should not be separated document", async () => {
    const config = MarkdownDocumentReaderConfig.builder()
      .includeBlockquote(true)
      .build();

    const reader = new MarkdownDocumentReader({
      markdownResources: resourcePath("blockquote.md"),
      config,
    });

    const documents = await reader.get();

    expect(documents).toHaveLength(1);
    const document = documents[0];
    expect(document.metadata).toEqual({ category: "blockquote" });
    expect(document.text).toBe(
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur diam eros, laoreet sit amet cursus vitae, varius sed nisi. Cras sit amet quam quis velit commodo porta consectetur id nisi. Phasellus tincidunt pulvinar augue. Proin vel laoreet leo, sed luctus augue. Sed et ligula commodo, commodo lacus at, consequat turpis. Maecenas eget sapien odio. Maecenas urna lectus, pellentesque in accumsan aliquam, congue eu libero. Ut rhoncus nec justo a porttitor. Pellentesque auctor pharetra eros, viverra sodales lorem aliquet id. Curabitur semper nisi vel sem interdum suscipit.",
    );
  });

  it("test lists", async () => {
    const reader = new MarkdownDocumentReader({
      markdownResources: resourcePath("lists.md"),
    });

    const documents = await reader.get();

    expectUnorderedDocuments(
      documents.map((document) => ({
        metadata: document.metadata,
        text: document.text ?? "",
      })),
      [
        {
          metadata: { category: "header_2", title: "Ordered list" },
          text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur diam eros, laoreet sit amet cursus vitae, varius sed nisi. Cras sit amet quam quis velit commodo porta consectetur id nisi. Phasellus tincidunt pulvinar augue. Proin vel laoreet leo, sed luctus augue. Sed et ligula commodo, commodo lacus at, consequat turpis. Maecenas eget sapien odio. Pellentesque auctor pharetra eros, viverra sodales lorem aliquet id. Curabitur semper nisi vel sem interdum suscipit. Maecenas urna lectus, pellentesque in accumsan aliquam, congue eu libero. Ut rhoncus nec justo a porttitor.",
        },
        {
          metadata: { category: "header_2", title: "Unordered list" },
          text: "Aenean eu leo eu nibh tristique posuere quis quis massa. Aenean imperdiet libero dui, nec malesuada dui maximus vel. Vestibulum sed dui condimentum, cursus libero in, dapibus tortor. Etiam facilisis enim in egestas dictum.",
        },
      ],
    );
  });

  it("test with additional metadata", async () => {
    const config = MarkdownDocumentReaderConfig.builder()
      .additionalMetadata("service", "some-service-name")
      .additionalMetadata("env", "prod")
      .build();

    const reader = new MarkdownDocumentReader({
      markdownResources: resourcePath("simple.md"),
      config,
    });
    const documents = await reader.get();

    expect(documents).toHaveLength(1);

    const document = documents[0];
    expect(document.metadata).toEqual({
      service: "some-service-name",
      env: "prod",
    });
    expect(
      document.text?.startsWith(
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      ),
    ).toBe(true);
  });
});

interface ExpectedDocument {
  metadata: Record<string, unknown>;
  text: string;
}

function normalizeMetadata(metadata: Record<string, unknown>): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(metadata).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
  );
}

function normalizeDocument(document: ExpectedDocument): string {
  return `${normalizeMetadata(document.metadata)}::${document.text}`;
}

function expectUnorderedDocuments(
  actual: ExpectedDocument[],
  expected: ExpectedDocument[],
): void {
  expect(actual).toHaveLength(expected.length);
  expect(actual.map(normalizeDocument).sort()).toEqual(
    expected.map(normalizeDocument).sort(),
  );
}

function resourcePath(path: string): string {
  return join(__dirname, path);
}
