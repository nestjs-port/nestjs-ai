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

import type { ServerContext } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import type { MetaProvider } from "../../../context/index.js";
import { McpTool } from "../../../mcp-tool.js";
import type { McpToolMethodArguments } from "../../../mcp-tool.js";
import { McpToolProvider } from "../mcp-tool-provider.js";

const ExampleToolInputSchema = z.object({
  name: z.string(),
});

const ExampleToolOutputSchema = z.object({
  greeting: z.string(),
});

class ExampleMetaProvider implements MetaProvider {
  getMeta(): Record<string, unknown> | null {
    return { source: "provider-metadata" };
  }
}

describe("McpToolProvider", () => {
  describe("getToolRegistrations()", () => {
    it("produces a registration for each @McpTool-annotated method", async () => {
      const provider = new McpToolProvider({
        toolObjects: [new ExampleToolProvider()],
      });

      const registrations = provider.getToolRegistrations();
      const names = registrations.map(([name]) => name);

      expect(names).toEqual(["z-tool", "beta"]);
    });

    it("forwards decorator metadata into the registration config", () => {
      const provider = new McpToolProvider({
        toolObjects: [new ExampleToolProvider()],
      });

      const registrations = provider.getToolRegistrations();
      const entry = registrations.find(([name]) => name === "z-tool");

      expect(entry).toBeDefined();
      const [, config] = entry!;
      expect(config.title).toBe("Alpha title");
      expect(config.description).toBe("Alpha description");
      expect(config.inputSchema).toBe(ExampleToolInputSchema);
      expect(config.outputSchema).toBe(ExampleToolOutputSchema);
      expect(config.annotations).toEqual({
        title: "Alpha annotations",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      });
      expect(config._meta).toEqual({ source: "provider-metadata" });
    });

    it("returns callbacks that execute the underlying user method", async () => {
      const tool = new ExampleToolProvider();
      const provider = new McpToolProvider({
        toolObjects: [tool],
      });

      const registrations = provider.getToolRegistrations();
      const entry = registrations.find(([name]) => name === "z-tool");
      expect(entry).toBeDefined();
      const [, , cb] = entry!;

      const result = await cb(
        { name: "Jordan" },
        createMockCtx({ _meta: { progressToken: "token-1", source: "req" } }),
      );

      expect(result).toMatchObject({
        content: [],
        structuredContent: {
          greeting: "Hello Jordan",
        },
      });
      expect(tool.lastArgs?.toolArguments).toEqual({ name: "Jordan" });
      expect(tool.lastArgs?.meta.get("progressToken")).toBe("token-1");
      expect(tool.lastArgs?.meta.get("source")).toBe("req");
    });

    it("ignores methods without @McpTool metadata", () => {
      class MixedProvider {
        @McpTool({ name: "annotated" })
        annotated(_args: McpToolMethodArguments): string {
          return "annotated";
        }

        plainMethod(): string {
          return "not a tool";
        }
      }

      const provider = new McpToolProvider({
        toolObjects: [new MixedProvider()],
      });

      const names = provider.getToolRegistrations().map(([name]) => name);
      expect(names).toEqual(["annotated"]);
    });

    it("falls back to the property key when the decorator name is empty", () => {
      class FallbackProvider {
        @McpTool({})
        fallbackTool(_args: McpToolMethodArguments): string {
          return "fallback";
        }
      }

      const provider = new McpToolProvider({
        toolObjects: [new FallbackProvider()],
      });

      const names = provider.getToolRegistrations().map(([name]) => name);
      expect(names).toEqual(["fallbackTool"]);
    });

    it("returns an empty array when no tool methods are present", () => {
      class EmptyProvider {
        plain(): string {
          return "no tools";
        }
      }

      const provider = new McpToolProvider({
        toolObjects: [new EmptyProvider()],
      });

      expect(provider.getToolRegistrations()).toEqual([]);
    });

    it("aggregates registrations from multiple bean objects", () => {
      class FirstProvider {
        @McpTool({ name: "first" })
        first(_args: McpToolMethodArguments): string {
          return "first";
        }
      }

      class SecondProvider {
        @McpTool({ name: "second" })
        second(_args: McpToolMethodArguments): string {
          return "second";
        }
      }

      const provider = new McpToolProvider({
        toolObjects: [new FirstProvider(), new SecondProvider()],
      });

      const names = provider.getToolRegistrations().map(([name]) => name);
      expect(names).toEqual(["first", "second"]);
    });
  });

  describe("constructor", () => {
    it("rejects null toolObjects", () => {
      expect(
        () =>
          new McpToolProvider({
            toolObjects: null as never,
          }),
      ).toThrow("toolObjects can't be null!");
    });
  });
});

class ExampleToolProvider {
  public lastArgs: McpToolMethodArguments | null = null;

  @McpTool({
    name: "z-tool",
    title: "Alpha title",
    description: "Alpha description",
    annotations: { title: "Alpha annotations" },
    inputSchema: ExampleToolInputSchema,
    returnSchema: ExampleToolOutputSchema,
    metaProvider: ExampleMetaProvider,
  })
  alpha(args: McpToolMethodArguments): { greeting: string } {
    this.lastArgs = args;
    return {
      greeting: `Hello ${(args.toolArguments as { name?: string }).name ?? ""}`,
    };
  }

  @McpTool({})
  beta(args: McpToolMethodArguments): string {
    this.lastArgs = args;
    return "beta";
  }

  notAnnotated(): string {
    return "ignored";
  }
}

function createMockCtx(overrides: MockCtxOverrides = {}): ServerContext {
  return {
    mcpReq: {
      id: 1,
      method: "tools/call",
      _meta: overrides._meta,
      signal: overrides.signal ?? new AbortController().signal,
      send: () => Promise.reject(new Error("send not mocked")),
      notify: () => Promise.resolve(),
      log: () => Promise.resolve(),
      elicitInput: () => Promise.reject(new Error("elicitInput not mocked")),
      requestSampling: () =>
        Promise.reject(new Error("requestSampling not mocked")),
    },
  } as unknown as ServerContext;
}

interface MockCtxOverrides {
  _meta?: Record<string, unknown>;
  signal?: AbortSignal;
}
