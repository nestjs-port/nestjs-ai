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
import { describe, expect, it } from "vitest";

import { McpTransportContext } from "../../../context/index.js";
import { McpResource } from "../../../mcp-resource.js";
import type { McpResourceMethodArguments } from "../../../mcp-resource.js";
import { McpStatelessResourceMethodCallback } from "../mcp-stateless-resource-method-callback.js";
import { ResourceContentType } from "../resource-content-type.js";

describe("McpStatelessResourceMethodCallback", () => {
  it("test callback with request parameter", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getResourceWithRequest",
      createResource("test://resource"),
    );

    const context = createContext();
    const request = createRequest("test/resource");
    const result = await callback.apply(context, request);

    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe("Content for test/resource");
  });

  it("test callback with context and request parameters", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getResourceWithContext",
      createResource("test://resource"),
    );

    const context = createContext({ traceId: "trace-1" });
    const request = createRequest("test/resource");
    const result = await callback.apply(context, request);

    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe(
      "Content with context (trace-1) for test/resource",
    );
  });

  it("test callback with uri parameter", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getResourceWithUri",
      createResource("test://resource"),
    );

    const result = await callback.apply(
      createContext(),
      createRequest("test/resource"),
    );

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
    );

    const result = await callback.apply(
      createContext(),
      createRequest("users/123/posts/456"),
    );

    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe("User: 123, Post: 456");
  });

  it("test callback with resource contents list", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getResourceContentsList",
      createResource("test://resource"),
    );

    const result = await callback.apply(
      createContext(),
      createRequest("test/resource"),
    );

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

    const result = await callback.apply(
      createContext(),
      createRequest("test/resource"),
    );

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

    const result = await callback.apply(
      createContext(),
      createRequest("test/resource"),
    );

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

    const result = await callback.apply(
      createContext(),
      createRequest("test/resource"),
    );

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

    const result = await callback.apply(
      createContext(),
      createRequest("test/resource"),
    );

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

    const result = await callback.apply(
      createContext(),
      createRequest("test/resource"),
    );

    expect(result.contents).toHaveLength(1);
    const blobContent = result.contents[0] as BlobResourceContents;
    expect(blobContent.blob).toBe("Blob content type for test/resource");
    expect(blobContent.mimeType).toBe("application/octet-stream");
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
    const result = await callback.apply(createContext(), request);

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
    const result = await callback.apply(createContext(), request);

    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe(
      "Content with progress token: null for test/resource",
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
    const result = await callback.apply(createContext(), request);

    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe(
      "Content with meta: meta-value-123 for test/resource",
    );
  });

  it("test callback with meta and uri variables", async () => {
    const provider = new TestResourceProvider();
    const callback = createCallback(
      provider,
      "getResourceWithMetaAndUriVariables",
      createResource("users/{userId}/posts/{postId}"),
    );

    const request = createRequest("users/123/posts/456", {
      key: "meta-value-789",
    });
    const result = await callback.apply(createContext(), request);

    expect(result.contents).toHaveLength(1);
    const textContent = result.contents[0] as TextResourceContents;
    expect(textContent.text).toBe("User: 123, Post: 456, Meta: meta-value-789");
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
      callback.apply(createContext(), request),
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
      callback.apply(createContext(), null as never),
    ).rejects.toThrow("Request must not be null");
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
  getResourceWithContext(args: McpResourceMethodArguments): ReadResourceResult {
    const traceId = String(args.context?.get("traceId") ?? "");
    return {
      contents: [
        {
          uri: args.uri,
          mimeType: "text/plain",
          text: `Content with context (${traceId}) for ${args.uri}`,
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

  @McpResource({
    uri: "failing-resource://resource",
    description: "A resource that throws an exception",
  })
  getFailingResource(_args: McpResourceMethodArguments): ReadResourceResult {
    throw new Error("Test exception");
  }
}

function createCallback(
  provider: TestResourceProvider,
  propertyKey: keyof TestResourceProvider,
  resource: Resource,
  contentType?: ResourceContentType,
): McpStatelessResourceMethodCallback {
  return new McpStatelessResourceMethodCallback({
    provider,
    propertyKey,
    resource,
    contentType: contentType ?? null,
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

function createContext(
  metadata: Record<string, unknown> = {},
): McpTransportContext {
  return McpTransportContext.create(metadata);
}
