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

import "reflect-metadata";
import type {
  ReadResourceResult,
  ServerContext,
  McpServer,
} from "@modelcontextprotocol/server";
import { ResourceTemplate } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";

import { McpResource } from "../../../mcp-resource.js";
import type { McpResourceMethodArguments } from "../../../mcp-resource.js";
import { McpResourceProvider } from "../mcp-resource-provider.js";

describe("McpResourceProvider", () => {
  describe("getResourceRegistrations()", () => {
    it("produces a registration for each @McpResource-annotated method", async () => {
      const provider = new McpResourceProvider({
        resourceObjects: [new ExampleResourceProvider()],
        mcpServer: createMockMcpServer(),
      });

      const registrations = provider.getResourceRegistrations();
      const names = registrations.map(([name]) => name);

      // Sorted by property key, not by resource name. Property keys
      // (alphabetical): configResource, fallbackResource, templatedResource.
      expect(names).toEqual([
        "config-resource",
        "fallbackResource",
        "templatedResource",
      ]);
    });

    it("forwards decorator metadata into the registration config", () => {
      const provider = new McpResourceProvider({
        resourceObjects: [new ExampleResourceProvider()],
        mcpServer: createMockMcpServer(),
      });

      const registrations = provider.getResourceRegistrations();
      const configEntry = registrations.find(
        ([name]) => name === "config-resource",
      );

      expect(configEntry).toBeDefined();
      const [, uri, config] = configEntry!;
      expect(uri).toBe("config://app");
      expect(config.description).toBe("A resource backed by a fixed URI");
      expect(config.mimeType).toBe("text/plain");
    });

    it("returns callbacks that execute the underlying user method", async () => {
      const provider = new McpResourceProvider({
        resourceObjects: [new ExampleResourceProvider()],
        mcpServer: createMockMcpServer(),
      });

      const registrations = provider.getResourceRegistrations();
      const templatedEntry = registrations.find(
        ([name]) => name === "templatedResource",
      );
      expect(templatedEntry).toBeDefined();
      const [, resourceTemplate, , cb] = templatedEntry!;
      expect(resourceTemplate).toBeInstanceOf(ResourceTemplate);
      if (!(resourceTemplate instanceof ResourceTemplate)) {
        throw new Error("Expected a ResourceTemplate");
      }
      expect(resourceTemplate.uriTemplate.toString()).toBe(
        "http://example.com/users/{userId}",
      );

      const result = await (
        cb as unknown as (
          uri: URL,
          variables: Record<string, string>,
          ctx: ServerContext,
        ) => Promise<ReadResourceResult>
      )(
        new URL("http://example.com/users/jane"),
        { userId: "jane" },
        createMockCtx(),
      );

      expect(result.contents[0]).toMatchObject({
        uri: "http://example.com/users/jane",
        mimeType: "text/plain",
        text: "Resource for jane",
      });
    });

    it("ignores methods without @McpResource metadata", () => {
      class MixedResourceProvider {
        @McpResource({ uri: "annotated://resource", name: "annotated" })
        annotated(_args: McpResourceMethodArguments): ReadResourceResult {
          return { contents: [] };
        }

        plainMethod(): string {
          return "not a resource";
        }
      }

      const provider = new McpResourceProvider({
        resourceObjects: [new MixedResourceProvider()],
        mcpServer: createMockMcpServer(),
      });

      const names = provider.getResourceRegistrations().map(([name]) => name);
      expect(names).toEqual(["annotated"]);
    });

    it("falls back to the property key when the decorator name is empty", () => {
      class FallbackResourceProvider {
        @McpResource({ uri: "fallback://resource" })
        fallbackResource(
          _args: McpResourceMethodArguments,
        ): ReadResourceResult {
          return { contents: [] };
        }
      }

      const provider = new McpResourceProvider({
        resourceObjects: [new FallbackResourceProvider()],
        mcpServer: createMockMcpServer(),
      });

      const names = provider.getResourceRegistrations().map(([name]) => name);
      expect(names).toEqual(["fallbackResource"]);
    });

    it("returns an empty array when no resource methods are present", () => {
      class EmptyResourceProvider {
        plain(): string {
          return "no resources";
        }
      }

      const provider = new McpResourceProvider({
        resourceObjects: [new EmptyResourceProvider()],
        mcpServer: createMockMcpServer(),
      });

      expect(provider.getResourceRegistrations()).toEqual([]);
    });

    it("aggregates registrations from multiple bean objects", () => {
      class FirstResourceProvider {
        @McpResource({ uri: "first://resource", name: "first" })
        first(_args: McpResourceMethodArguments): ReadResourceResult {
          return { contents: [] };
        }
      }

      class SecondResourceProvider {
        @McpResource({ uri: "second://resource", name: "second" })
        second(_args: McpResourceMethodArguments): ReadResourceResult {
          return { contents: [] };
        }
      }

      const provider = new McpResourceProvider({
        resourceObjects: [
          new FirstResourceProvider(),
          new SecondResourceProvider(),
        ],
        mcpServer: createMockMcpServer(),
      });

      const names = provider.getResourceRegistrations().map(([name]) => name);
      expect(names).toEqual(["first", "second"]);
    });
  });

  describe("constructor", () => {
    it("rejects null resourceObjects", () => {
      expect(
        () =>
          new McpResourceProvider({
            resourceObjects: null as never,
            mcpServer: createMockMcpServer(),
          }),
      ).toThrow("resourceObjects can't be null!");
    });

    it("rejects null mcpServer", () => {
      expect(
        () =>
          new McpResourceProvider({
            resourceObjects: [],
            mcpServer: null as never,
          }),
      ).toThrow("mcpServer can't be null!");
    });
  });
});

class ExampleResourceProvider {
  @McpResource({
    uri: "config://app",
    name: "config-resource",
    description: "A resource backed by a fixed URI",
    mimeType: "text/plain",
  })
  configResource(_args: McpResourceMethodArguments): ReadResourceResult {
    void _args;
    return {
      contents: [
        {
          uri: "config://app",
          mimeType: "text/plain",
          text: "config",
        },
      ],
    };
  }

  @McpResource({ uri: "http://example.com/users/{userId}" })
  templatedResource(args: McpResourceMethodArguments): string {
    return `Resource for ${args.uriVariables.userId ?? ""}`;
  }

  @McpResource({ uri: "fallback://resource" })
  fallbackResource(_args: McpResourceMethodArguments): ReadResourceResult {
    void _args;
    return { contents: [] };
  }
}

function createMockCtx(): ServerContext {
  return {
    mcpReq: {
      id: 1,
      method: "resources/read",
      _meta: undefined,
      signal: new AbortController().signal,
      send: () => Promise.reject(new Error("send not mocked")),
      notify: () => Promise.resolve(),
      log: () => Promise.resolve(),
      elicitInput: () => Promise.reject(new Error("elicitInput not mocked")),
      requestSampling: () =>
        Promise.reject(new Error("requestSampling not mocked")),
    },
  } as unknown as ServerContext;
}

function createMockMcpServer(): McpServer {
  return {
    server: {
      getClientCapabilities: () => undefined,
      getClientVersion: () => undefined,
    },
    registerResource: () => undefined,
  } as unknown as McpServer;
}
