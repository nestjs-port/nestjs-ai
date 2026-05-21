import type {
  ReadResourceResult,
  TextResourceContents,
} from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";

import { DefaultMcpReadResourceResultConverter } from "../default-mcp-read-resource-result-converter.js";
import { ResourceContentType } from "../resource-content-type.js";

describe("DefaultMcpReadResourceResultConverter", () => {
  const converter = new DefaultMcpReadResourceResultConverter();

  it("test meta propagated to text resource contents", () => {
    const meta = {
      ui: { csp: { connectDomains: ["api.example.com"] } },
    };

    const result = converter.convertToReadResourceResult(
      "<html>Hello</html>",
      "ui://test/view",
      "text/html;profile=mcp-app",
      ResourceContentType.TEXT,
      meta,
    );

    expect(result.contents).toHaveLength(1);
    const content = result.contents[0] as TextResourceContents;
    expect(content._meta).not.toBeNull();
    expect(content._meta).toHaveProperty("ui");
  });

  it("test meta null when not specified", () => {
    const result = converter.convertToReadResourceResult(
      "content",
      "resource://test",
      "text/plain",
      ResourceContentType.TEXT,
      null,
    );

    expect(result.contents).toHaveLength(1);
    const content = result.contents[0] as TextResourceContents;
    expect(content._meta).toBeUndefined();
  });

  it("test meta propagated to text resource contents from string list", () => {
    const meta = { ui: { theme: "dark" } };

    const result = converter.convertToReadResourceResult(
      ["item1", "item2"],
      "ui://test/list",
      "text/plain",
      ResourceContentType.TEXT,
      meta,
    );

    expect(result.contents).toHaveLength(2);

    const content0 = result.contents[0] as TextResourceContents;
    expect(content0.text).toBe("item1");
    expect(content0._meta).not.toBeNull();
    expect(content0._meta).toHaveProperty("ui");

    const content1 = result.contents[1] as TextResourceContents;
    expect(content1.text).toBe("item2");
    expect(content1._meta).not.toBeNull();
    expect(content1._meta).toHaveProperty("ui");
  });

  it("test existing resource contents passthrough preserves original meta", () => {
    const userMeta = { custom: "user-provided-meta" };
    const userContent: TextResourceContents = {
      uri: "resource://test",
      mimeType: "text/plain",
      text: "user content",
      _meta: userMeta,
    };

    const annotationMeta = { annotation: "should-not-override" };

    const result = converter.convertToReadResourceResult(
      userContent,
      "resource://test",
      "text/plain",
      ResourceContentType.TEXT,
      annotationMeta,
    );

    expect(result.contents).toHaveLength(1);
    const content = result.contents[0] as TextResourceContents;
    expect(content._meta).toEqual(userMeta);
    expect(content._meta).toHaveProperty("custom");
    expect(content._meta).not.toHaveProperty("annotation");
  });

  it("test existing read resource result passthrough is unmodified", () => {
    const userMeta = { original: "from-user" };
    const userContent: TextResourceContents = {
      uri: "resource://test",
      mimeType: "text/plain",
      text: "user content",
      _meta: userMeta,
    };
    const userResult: ReadResourceResult = { contents: [userContent] };

    const annotationMeta = { annotation: "should-not-override" };

    const result = converter.convertToReadResourceResult(
      userResult,
      "resource://test",
      "text/plain",
      ResourceContentType.TEXT,
      annotationMeta,
    );

    expect(result.contents).toHaveLength(1);
    const content = result.contents[0] as TextResourceContents;
    expect(content._meta).toEqual(userMeta);
    expect(content._meta).toHaveProperty("original");
    expect(content._meta).not.toHaveProperty("annotation");
  });

  it("test existing resource contents list passthrough preserves original meta", () => {
    const userMeta = { custom: "list-meta" };
    const userContent: TextResourceContents = {
      uri: "resource://test",
      mimeType: "text/plain",
      text: "user content",
      _meta: userMeta,
    };

    const annotationMeta = { annotation: "should-not-override" };

    const result = converter.convertToReadResourceResult(
      [userContent],
      "resource://test",
      "text/plain",
      ResourceContentType.TEXT,
      annotationMeta,
    );

    expect(result.contents).toHaveLength(1);
    const content = result.contents[0] as TextResourceContents;
    expect(content._meta).toEqual(userMeta);
    expect(content._meta).toHaveProperty("custom");
    expect(content._meta).not.toHaveProperty("annotation");
  });

  it("test null result returns empty contents", () => {
    const result = converter.convertToReadResourceResult(
      null,
      "resource://test",
      "text/plain",
      ResourceContentType.TEXT,
      { ui: "value" },
    );

    expect(result.contents).toHaveLength(0);
  });

  it("test meta with complex nested structure", () => {
    const meta = {
      ui: {
        csp: {
          connectDomains: ["api.example.com", "cdn.example.com"],
          frameDomains: ["embed.example.com"],
        },
        theme: "dark",
      },
    };

    const result = converter.convertToReadResourceResult(
      "<html>App</html>",
      "ui://myapp/view",
      "text/html;profile=mcp-app",
      ResourceContentType.TEXT,
      meta,
    );

    expect(result.contents).toHaveLength(1);
    const content = result.contents[0] as TextResourceContents;
    expect(content._meta).not.toBeNull();
    expect(content._meta).toHaveProperty("ui");

    const uiMeta = (content._meta as { ui: Record<string, unknown> }).ui;
    expect(uiMeta).toHaveProperty("csp");
    expect(uiMeta).toHaveProperty("theme");
    expect(uiMeta.theme).toBe("dark");
  });
});
