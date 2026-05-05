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
  GetPromptResult,
  McpServer,
  ServerContext,
} from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";

import {
  ExamplePromptArgsSchema,
  ExamplePromptProvider,
} from "../../../method/prompt/__tests__/mcp-prompt-method-callback-example.spec.js";
import { McpPrompt } from "../../../mcp-prompt.js";
import type { McpPromptMethodContext } from "../../../mcp-prompt.js";
import { McpPromptProvider } from "../mcp-prompt-provider.js";

describe("McpPromptProvider", () => {
  describe("getPromptRegistrations()", () => {
    it("produces a registration for each @McpPrompt-annotated method", () => {
      const provider = new McpPromptProvider({
        promptObjects: [new ExamplePromptProvider()],
        mcpServer: createMockMcpServer(),
      });

      const registrations = provider.getPromptRegistrations();
      const names = registrations.map(([name]) => name);

      // Sorted by property key, not by prompt name. Property keys (alphabetical):
      // captureExchange, captureSignal, failing, returnMessageList,
      // returnPromptResult, returnSingleMessage, returnString,
      // returnStringList, useArgsSchema, useMeta, useProgressToken.
      expect(names).toEqual([
        "capture-exchange",
        "signal-prompt",
        "failing-prompt",
        "message-list",
        "prompt-result",
        "single-message",
        "string",
        "string-list",
        "schema-prompt",
        "meta-prompt",
        "progress-prompt",
      ]);
    });

    it("forwards decorator metadata into the registration config", () => {
      const provider = new McpPromptProvider({
        promptObjects: [new ExamplePromptProvider()],
        mcpServer: createMockMcpServer(),
      });

      const registrations = provider.getPromptRegistrations();
      const schemaEntry = registrations.find(
        ([name]) => name === "schema-prompt",
      );

      expect(schemaEntry).toBeDefined();
      const [, config] = schemaEntry!;
      expect(config.description).toBe("A prompt backed by args schema");
      expect(config.argsSchema).toBe(ExamplePromptArgsSchema);
    });

    it("returns callbacks that execute the underlying user method", async () => {
      const provider = new McpPromptProvider({
        promptObjects: [new ExamplePromptProvider()],
        mcpServer: createMockMcpServer(),
      });

      const registrations = provider.getPromptRegistrations();
      const stringEntry = registrations.find(([name]) => name === "string");
      expect(stringEntry).toBeDefined();
      const [, , cb] = stringEntry!;

      const result = await (
        cb as unknown as (ctx: ServerContext) => Promise<GetPromptResult>
      )(createMockCtx());

      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: "Async string response",
      });
    });

    it("ignores methods without @McpPrompt metadata", () => {
      class MixedProvider {
        @McpPrompt({ name: "annotated", description: "annotated" })
        annotated(_ctx: McpPromptMethodContext): Promise<GetPromptResult> {
          return Promise.resolve({ messages: [] });
        }

        plainMethod(): string {
          return "not a prompt";
        }
      }

      const provider = new McpPromptProvider({
        promptObjects: [new MixedProvider()],
        mcpServer: createMockMcpServer(),
      });

      const names = provider.getPromptRegistrations().map(([name]) => name);
      expect(names).toEqual(["annotated"]);
    });

    it("falls back to the property key when the decorator name is empty", () => {
      class FallbackProvider {
        @McpPrompt({})
        myPrompt(_ctx: McpPromptMethodContext): Promise<GetPromptResult> {
          return Promise.resolve({ messages: [] });
        }
      }

      const provider = new McpPromptProvider({
        promptObjects: [new FallbackProvider()],
        mcpServer: createMockMcpServer(),
      });

      const names = provider.getPromptRegistrations().map(([name]) => name);
      expect(names).toEqual(["myPrompt"]);
    });

    it("returns an empty array when no prompt methods are present", () => {
      class EmptyProvider {
        plain(): string {
          return "no prompts";
        }
      }

      const provider = new McpPromptProvider({
        promptObjects: [new EmptyProvider()],
        mcpServer: createMockMcpServer(),
      });

      expect(provider.getPromptRegistrations()).toEqual([]);
    });

    it("aggregates registrations from multiple bean objects", () => {
      class FirstProvider {
        @McpPrompt({ name: "first" })
        first(_ctx: McpPromptMethodContext): Promise<GetPromptResult> {
          return Promise.resolve({ messages: [] });
        }
      }

      class SecondProvider {
        @McpPrompt({ name: "second" })
        second(_ctx: McpPromptMethodContext): Promise<GetPromptResult> {
          return Promise.resolve({ messages: [] });
        }
      }

      const provider = new McpPromptProvider({
        promptObjects: [new FirstProvider(), new SecondProvider()],
        mcpServer: createMockMcpServer(),
      });

      const names = provider.getPromptRegistrations().map(([name]) => name);
      expect(names).toEqual(["first", "second"]);
    });
  });

  describe("constructor", () => {
    it("rejects null promptObjects", () => {
      expect(
        () =>
          new McpPromptProvider({
            promptObjects: null as never,
            mcpServer: createMockMcpServer(),
          }),
      ).toThrow("promptObjects can't be null!");
    });

    it("rejects null mcpServer", () => {
      expect(
        () =>
          new McpPromptProvider({
            promptObjects: [],
            mcpServer: null as never,
          }),
      ).toThrow("mcpServer can't be null!");
    });
  });
});

function createMockCtx(): ServerContext {
  return {
    mcpReq: {
      id: 1,
      method: "prompts/get",
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
    registerPrompt: () => undefined,
  } as unknown as McpServer;
}
