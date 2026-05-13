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

import "reflect-metadata";

import type {
  BlobResourceContents,
  ReadResourceRequest,
  ReadResourceResult,
  Resource,
  TextResourceContents,
} from "@modelcontextprotocol/server";
import { ResourceTemplate } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";

import { McpServerExchange, McpTransportContext } from "@nestjs-ai/mcp-common";
import { McpResource } from "../../../mcp-resource.js";
import type { McpResourceMethodArguments } from "../../../mcp-resource.js";
import {
  McpResourceMethodCallback,
  type ResourceRegistration,
} from "../mcp-resource-method-callback.js";
import { ResourceContentType } from "../resource-content-type.js";

describe("McpResourceMethodCallback", () => {
  it("returns [name, uri, config, callback] tuple ready for registerResource", () => {
    const callback = createCallback(
      new TestResourceProvider(),
      "getResourceWithRequest",
      createResource("test://resource"),
    );

    const [name, uri, config, cb] = callback.apply();

    expect(name).toBe("testResource");
    expect(uri).toBe("test://resource");
    expect(config).toMatchObject({
      description: "Test resource description",
      mimeType: "text/plain",
    });
    expect(typeof cb).toBe("function");
    const spec = [name, uri, config, cb] as ResourceRegistration;
    expect(spec).toHaveLength(4);
  });

  it("test callback with request parameter", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getResourceWithRequest",
      createResource("test://resource"),
    );

    const request = createRequest("test/resource");
    const result = await callback.handle(createMockExchange(), request);

    expect(result).not.toBeNull();
    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe("Content for test/resource");
  });

  it("test callback with exchange and request parameters", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getResourceWithExchange",
      createResource("test://resource"),
    );

    const request = createRequest("test/resource");
    const result = await callback.handle(createMockExchange(), request);

    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe("Content with exchange for test/resource");
  });

  it("test callback with uri parameter", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getResourceWithUri",
      createResource("test://resource"),
    );

    const request = createRequest("test/resource");
    const result = await callback.handle(createMockExchange(), request);

    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe("Content from URI: test/resource");
  });

  it("test callback with uri variables", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getResourceWithUriVariables",
      createResource("users/{userId}/posts/{postId}"),
      undefined,
      createResourceTemplate("users/{userId}/posts/{postId}"),
    );

    const request = createRequest("users/123/posts/456");
    const result = await callback.handle(createMockExchange(), request, {
      userId: "123",
      postId: "456",
    });

    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe("User: 123, Post: 456");
  });

  it("test callback with exchange and uri variable", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getResourceWithExchangeAndUriVariable",
      createResource("users/{userId}/profile"),
      undefined,
      createResourceTemplate("users/{userId}/profile"),
    );

    const request = createRequest("users/789/profile");
    const result = await callback.handle(createMockExchange(), request, {
      userId: "789",
    });

    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe("Profile for user: 789");
  });

  it("test callback with resource contents list", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getResourceContentsList",
      createResource("test://resource"),
    );

    const request = createRequest("test/resource");
    const result = await callback.handle(createMockExchange(), request);

    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe("Content list for test/resource");
  });

  it("test callback with string list", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getStringList",
      createResource("test://resource"),
    );

    const request = createRequest("test/resource");
    const result = await callback.handle(createMockExchange(), request);

    expect(result.contents).toHaveLength(2);
    const textContent1 = result.contents[0] as TextResourceContents;
    const textContent2 = result.contents[1] as TextResourceContents;
    expect(textContent1.text).toBe("String 1 for test/resource");
    expect(textContent2.text).toBe("String 2 for test/resource");
  });

  it("test callback with single resource contents", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getSingleResourceContents",
      createResource("test://resource"),
    );

    const request = createRequest("test/resource");
    const result = await callback.handle(createMockExchange(), request);

    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe("Single resource content for test/resource");
  });

  it("test callback with single string", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getSingleString",
      createResource("test://resource"),
    );

    const request = createRequest("test/resource");
    const result = await callback.handle(createMockExchange(), request);

    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe("Single string for test/resource");
  });

  it("test callback with string and text content type", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getStringWithTextContentType",
      createResource("text-content://resource", "text/plain"),
    );

    const request = createRequest("test/resource");
    const result = await callback.handle(createMockExchange(), request);

    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe("Text content type for test/resource");
    expect(textContent.mimeType).toBe("text/plain");
  });

  it("test callback with string and blob content type", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getStringWithBlobContentType",
      createResource("blob-content://resource", "application/octet-stream"),
      ResourceContentType.BLOB,
    );

    const request = createRequest("test/resource");
    const result = await callback.handle(createMockExchange(), request);

    expect(result.contents).toHaveLength(1);
    const blobContent = result.contents[0] as BlobResourceContents;
    expect(blobContent.blob).toBe("Blob content type for test/resource");
    expect(blobContent.mimeType).toBe("application/octet-stream");
  });

  it("test callback with string list and text content type", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getStringListWithTextContentType",
      createResource("text-list://resource", "text/html"),
    );

    const request = createRequest("test/resource");
    const result = await callback.handle(createMockExchange(), request);

    expect(result.contents).toHaveLength(2);
    const textContent1 = result.contents[0] as TextResourceContents;
    const textContent2 = result.contents[1] as TextResourceContents;
    expect(textContent1.text).toBe("HTML text 1 for test/resource");
    expect(textContent2.text).toBe("HTML text 2 for test/resource");
    expect(textContent1.mimeType).toBe("text/html");
    expect(textContent2.mimeType).toBe("text/html");
  });

  it("test callback with string list and blob content type", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getStringListWithBlobContentType",
      createResource("blob-list://resource", "image/png"),
    );

    const request = createRequest("test/resource");
    const result = await callback.handle(createMockExchange(), request);

    expect(result.contents).toHaveLength(2);
    const blobContent1 = result.contents[0] as BlobResourceContents;
    const blobContent2 = result.contents[1] as BlobResourceContents;
    expect(blobContent1.blob).toBe("PNG blob 1 for test/resource");
    expect(blobContent2.blob).toBe("PNG blob 2 for test/resource");
    expect(blobContent1.mimeType).toBe("image/png");
    expect(blobContent2.mimeType).toBe("image/png");
  });

  // Tests for @McpProgressToken functionality
  it("test callback with progress token", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getResourceWithProgressToken",
      createResource("test://resource"),
    );

    const request = createRequest("test/resource", {
      progressToken: "progress-123",
    });
    const result = await callback.handle(createMockExchange(), request);

    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe(
      "Content with progress token: progress-123 for test/resource",
    );
  });

  it("test callback with progress token null", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getResourceWithProgressToken",
      createResource("test://resource"),
    );

    const request = createRequest("test/resource");
    const result = await callback.handle(createMockExchange(), request);

    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe(
      "Content with progress token: null for test/resource",
    );
  });

  it("test callback with progress token only", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getResourceWithProgressTokenOnly",
      createResource("test://resource"),
    );

    const request = createRequest("test/resource", {
      progressToken: "progress-456",
    });
    const result = await callback.handle(createMockExchange(), request);

    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe(
      "Content with only progress token: progress-456",
    );
  });

  it("test callback with progress token and uri variables", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getResourceWithProgressTokenAndUriVariables",
      createResource("users/{userId}/posts/{postId}"),
      undefined,
      createResourceTemplate("users/{userId}/posts/{postId}"),
    );

    const request = createRequest("users/123/posts/456", {
      progressToken: "progress-789",
    });
    const result = await callback.handle(createMockExchange(), request, {
      userId: "123",
      postId: "456",
    });

    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe(
      "User: 123, Post: 456, Progress: progress-789",
    );
  });

  // Tests for McpMeta functionality
  it("test callback with meta", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getResourceWithMeta",
      createResource("test://resource"),
    );

    const request = createRequest("test/resource", {
      key: "meta-value-123",
    });
    const result = await callback.handle(createMockExchange(), request);

    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe(
      "Content with meta: meta-value-123 for test/resource",
    );
  });

  it("test callback with meta null", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getResourceWithMeta",
      createResource("test://resource"),
    );

    const request = createRequest("test/resource");
    const result = await callback.handle(createMockExchange(), request);

    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe(
      "Content with meta: undefined for test/resource",
    );
  });

  it("test callback with meta only", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getResourceWithMetaOnly",
      createResource("test://resource"),
    );

    const request = createRequest("test/resource", {
      key: "meta-value-456",
    });
    const result = await callback.handle(createMockExchange(), request);

    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe("Content with only meta: meta-value-456");
  });

  it("test callback with meta and uri variables", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getResourceWithMetaAndUriVariables",
      createResource("users/{userId}/posts/{postId}"),
      undefined,
      createResourceTemplate("users/{userId}/posts/{postId}"),
    );

    const request = createRequest("users/123/posts/456", {
      key: "meta-value-789",
    });
    const result = await callback.handle(createMockExchange(), request, {
      userId: "123",
      postId: "456",
    });

    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe("User: 123, Post: 456, Meta: meta-value-789");
  });

  it("test callback with exchange and meta", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getResourceWithExchangeAndMeta",
      createResource("test://resource"),
    );

    const request = createRequest("test/resource", {
      key: "meta-value-abc",
    });
    const result = await callback.handle(createMockExchange(), request);

    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe(
      "Content with exchange and meta: meta-value-abc for test/resource",
    );
  });

  it("test method invocation error", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getFailingResource",
      createResource("failing-resource://resource"),
    );

    const request = createRequest("failing-resource://resource");

    await expect(
      callback.handle(createMockExchange(), request),
    ).rejects.toMatchObject({
      name: "McpResourceMethodException",
      message: "Error invoking resource method: getFailingResource",
    });
  });

  it("test null request", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getResourceWithRequest",
      createResource("test://resource"),
    );

    await expect(
      callback.handle(createMockExchange(), null as never),
    ).rejects.toThrow("Request must not be null");
  });

  it("test callback with transport context", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getResourceWithTransportContext",
      createResource("transport-context://resource"),
    );

    const transportContext = McpTransportContext.create({ traceId: "trace-1" });
    const exchange = createMockExchange(transportContext);
    const request = createRequest("transport-context://resource");
    const result = await callback.handle(exchange, request);

    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe(
      "Content with transport context (trace-1) for transport-context://resource",
    );
  });

  it("test invalid uri variable parameters", () => {
    // Constructor should throw when URI is empty/null but we accept resources
    // here. This mirrors the Java testInvalidUriVariableParameters: constructing
    // with an empty URI rejects up front.
    expect(() => {
      new McpResourceMethodCallback({
        provider: new TestResourceProvider(),
        propertyKey: "getResourceWithUriVariables",
        resource: { uri: "", name: "invalid" } as Resource,
      });
    }).toThrow("URI can't be null or empty!");
  });
});

class TestResourceProvider {
  @McpResource({ uri: "test://resource" })
  getResourceWithRequest(args: McpResourceMethodArguments): ReadResourceResult {
    return {
      contents: [
        {
          uri: args.uri,
          mimeType: "text/plain",
          text: `Content for ${args.uri}`,
        },
      ],
    };
  }

  @McpResource({ uri: "test://resource" })
  getResourceWithExchange(
    args: McpResourceMethodArguments,
  ): ReadResourceResult {
    const hasExchange = args.exchange != null;
    void hasExchange;
    return {
      contents: [
        {
          uri: args.uri,
          mimeType: "text/plain",
          text: `Content with exchange for ${args.uri}`,
        },
      ],
    };
  }

  @McpResource({ uri: "test://resource" })
  getResourceWithUri(args: McpResourceMethodArguments): ReadResourceResult {
    return {
      contents: [
        {
          uri: args.uri,
          mimeType: "text/plain",
          text: `Content from URI: ${args.uri}`,
        },
      ],
    };
  }

  @McpResource({ uri: "users/{userId}/posts/{postId}" })
  getResourceWithUriVariables(
    args: McpResourceMethodArguments,
  ): ReadResourceResult {
    const userId = args.uriVariables.userId ?? "";
    const postId = args.uriVariables.postId ?? "";
    return {
      contents: [
        {
          uri: `users/${userId}/posts/${postId}`,
          mimeType: "text/plain",
          text: `User: ${userId}, Post: ${postId}`,
        },
      ],
    };
  }

  @McpResource({ uri: "users/{userId}/profile" })
  getResourceWithExchangeAndUriVariable(
    args: McpResourceMethodArguments,
  ): ReadResourceResult {
    const userId = args.uriVariables.userId ?? "";
    return {
      contents: [
        {
          uri: `users/${userId}/profile`,
          mimeType: "text/plain",
          text: `Profile for user: ${userId}`,
        },
      ],
    };
  }

  @McpResource({ uri: "test://resource" })
  getResourceContentsList(
    args: McpResourceMethodArguments,
  ): TextResourceContents[] {
    return [
      {
        uri: args.uri,
        mimeType: "text/plain",
        text: `Content list for ${args.uri}`,
      },
    ];
  }

  @McpResource({ uri: "test://resource" })
  getStringList(args: McpResourceMethodArguments): string[] {
    return [`String 1 for ${args.uri}`, `String 2 for ${args.uri}`];
  }

  @McpResource({ uri: "test://resource" })
  getSingleResourceContents(
    args: McpResourceMethodArguments,
  ): TextResourceContents {
    return {
      uri: args.uri,
      mimeType: "text/plain",
      text: `Single resource content for ${args.uri}`,
    };
  }

  @McpResource({ uri: "test://resource" })
  getSingleString(args: McpResourceMethodArguments): string {
    return `Single string for ${args.uri}`;
  }

  @McpResource({ uri: "text-content://resource", mimeType: "text/plain" })
  getStringWithTextContentType(args: McpResourceMethodArguments): string {
    return `Text content type for ${args.uri}`;
  }

  @McpResource({
    uri: "blob-content://resource",
    mimeType: "application/octet-stream",
  })
  getStringWithBlobContentType(args: McpResourceMethodArguments): string {
    return `Blob content type for ${args.uri}`;
  }

  @McpResource({ uri: "text-list://resource", mimeType: "text/html" })
  getStringListWithTextContentType(args: McpResourceMethodArguments): string[] {
    return [`HTML text 1 for ${args.uri}`, `HTML text 2 for ${args.uri}`];
  }

  @McpResource({ uri: "blob-list://resource", mimeType: "image/png" })
  getStringListWithBlobContentType(args: McpResourceMethodArguments): string[] {
    return [`PNG blob 1 for ${args.uri}`, `PNG blob 2 for ${args.uri}`];
  }

  // Methods for testing @McpProgressToken
  @McpResource({ uri: "test://resource" })
  getResourceWithProgressToken(
    args: McpResourceMethodArguments,
  ): ReadResourceResult {
    const token =
      args.progressToken == null ? "null" : String(args.progressToken);
    return {
      contents: [
        {
          uri: args.uri,
          mimeType: "text/plain",
          text: `Content with progress token: ${token} for ${args.uri}`,
        },
      ],
    };
  }

  @McpResource({ uri: "test://resource" })
  getResourceWithProgressTokenOnly(
    args: McpResourceMethodArguments,
  ): ReadResourceResult {
    const token =
      args.progressToken == null ? "null" : String(args.progressToken);
    return {
      contents: [
        {
          uri: "test://resource",
          mimeType: "text/plain",
          text: `Content with only progress token: ${token}`,
        },
      ],
    };
  }

  @McpResource({ uri: "users/{userId}/posts/{postId}" })
  getResourceWithProgressTokenAndUriVariables(
    args: McpResourceMethodArguments,
  ): ReadResourceResult {
    const userId = args.uriVariables.userId ?? "";
    const postId = args.uriVariables.postId ?? "";
    const token =
      args.progressToken == null ? "null" : String(args.progressToken);
    return {
      contents: [
        {
          uri: `users/${userId}/posts/${postId}`,
          mimeType: "text/plain",
          text: `User: ${userId}, Post: ${postId}, Progress: ${token}`,
        },
      ],
    };
  }

  // Methods for testing McpMeta
  @McpResource({ uri: "test://resource" })
  getResourceWithMeta(args: McpResourceMethodArguments): ReadResourceResult {
    return {
      contents: [
        {
          uri: args.uri,
          mimeType: "text/plain",
          text: `Content with meta: ${args.meta.get("key")} for ${args.uri}`,
        },
      ],
    };
  }

  @McpResource({ uri: "test://resource" })
  getResourceWithMetaOnly(
    args: McpResourceMethodArguments,
  ): ReadResourceResult {
    return {
      contents: [
        {
          uri: "test://resource",
          mimeType: "text/plain",
          text: `Content with only meta: ${args.meta.get("key")}`,
        },
      ],
    };
  }

  @McpResource({ uri: "users/{userId}/posts/{postId}" })
  getResourceWithMetaAndUriVariables(
    args: McpResourceMethodArguments,
  ): ReadResourceResult {
    const userId = args.uriVariables.userId ?? "";
    const postId = args.uriVariables.postId ?? "";
    return {
      contents: [
        {
          uri: `users/${userId}/posts/${postId}`,
          mimeType: "text/plain",
          text: `User: ${userId}, Post: ${postId}, Meta: ${args.meta.get("key")}`,
        },
      ],
    };
  }

  @McpResource({ uri: "test://resource" })
  getResourceWithExchangeAndMeta(
    args: McpResourceMethodArguments,
  ): ReadResourceResult {
    return {
      contents: [
        {
          uri: args.uri,
          mimeType: "text/plain",
          text: `Content with exchange and meta: ${args.meta.get("key")} for ${args.uri}`,
        },
      ],
    };
  }

  @McpResource({
    uri: "failing-resource://resource",
    description: "A resource that throws an exception",
  })
  getFailingResource(_args: McpResourceMethodArguments): ReadResourceResult {
    throw new Error("Test exception");
  }

  @McpResource({
    uri: "transport-context://resource",
    description: "A resource with transport context",
  })
  getResourceWithTransportContext(
    args: McpResourceMethodArguments,
  ): ReadResourceResult {
    const traceId = String(args.context?.get("traceId") ?? "");
    return {
      contents: [
        {
          uri: args.uri,
          mimeType: "text/plain",
          text: `Content with transport context (${traceId}) for ${args.uri}`,
        },
      ],
    };
  }
}

function createCallback(
  provider: TestResourceProvider,
  propertyKey: keyof TestResourceProvider,
  resource: Resource,
  contentType?: ResourceContentType,
  resourceTemplate?: ResourceTemplate,
): McpResourceMethodCallback {
  return new McpResourceMethodCallback({
    provider,
    propertyKey,
    resource,
    contentType: contentType ?? null,
    resourceTemplate: resourceTemplate ?? null,
  });
}

function createResource(uri: string, mimeType?: string): Resource {
  return {
    uri,
    name: "testResource",
    description: "Test resource description",
    mimeType: mimeType ?? "text/plain",
  };
}

function createResourceTemplate(uri: string): ResourceTemplate {
  return new ResourceTemplate(uri, { list: undefined });
}

function createRequest(
  uri: string,
  meta?: Record<string, unknown>,
): ReadResourceRequest {
  return {
    method: "resources/read",
    params: {
      uri,
      ...(meta == null ? {} : { _meta: meta }),
    },
  } as unknown as ReadResourceRequest;
}

function createMockExchange(
  context: McpTransportContext = McpTransportContext.EMPTY,
): McpServerExchange {
  return Object.assign(Object.create(McpServerExchange.prototype), {
    transportContext: () => context,
  }) as McpServerExchange;
}
