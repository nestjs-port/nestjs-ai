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

import { DefaultMetaProvider } from "../../../context/index.js";
import type { MetaProvider } from "../../../context/index.js";
import type { McpPromptMetadata } from "../../../mcp-prompt.js";
import { McpPromptMethodCallback } from "../mcp-prompt-method-callback.js";
import {
  ExamplePromptArgsSchema,
  ExamplePromptProvider,
} from "./mcp-prompt-method-callback-example.spec.js";

describe("McpPromptMethodCallback", () => {
  describe("apply()", () => {
    it("returns [name, config, callback] tuple ready for registerPrompt", () => {
      const callback = new McpPromptMethodCallback({
        provider: new ExamplePromptProvider(),
        propertyKey: "useArgsSchema",
        metadata: createMetadata({
          name: "schema-prompt",
          title: "Schema prompt",
          description: "A prompt backed by args schema",
          argsSchema: ExamplePromptArgsSchema,
          metaProvider: createMetaProvider({ source: "test" }),
        }),
        mcpServer: createMockMcpServer(),
      });

      const [name, config, cb] = callback.apply();

      expect(name).toBe("schema-prompt");
      expect(config.title).toBe("Schema prompt");
      expect(config.description).toBe("A prompt backed by args schema");
      expect(config.argsSchema).toBe(ExamplePromptArgsSchema);
      expect(config._meta).toEqual({ source: "test" });
      expect(typeof cb).toBe("function");
    });

    it("omits config fields when metadata leaves them empty", () => {
      const callback = new McpPromptMethodCallback({
        provider: new ExamplePromptProvider(),
        propertyKey: "returnPromptResult",
        metadata: createMetadata({ name: "prompt-result" }),
        mcpServer: createMockMcpServer(),
      });

      const [name, config] = callback.apply();

      expect(name).toBe("prompt-result");
      expect(config).toEqual({});
    });

    it("falls back to propertyKey when metadata.name is empty", () => {
      const callback = new McpPromptMethodCallback({
        provider: new ExamplePromptProvider(),
        propertyKey: "returnPromptResult",
        metadata: createMetadata(),
        mcpServer: createMockMcpServer(),
      });

      const [name] = callback.apply();

      expect(name).toBe("returnPromptResult");
    });

    it("returns a 1-arg callback when no argsSchema is configured", async () => {
      const callback = createCallback("returnPromptResult", "prompt-result");

      const [, , cb] = callback.apply();
      const result = await (
        cb as (ctx: ServerContext) => Promise<GetPromptResult>
      )(createMockCtx());

      expect(result.description).toBe("Prompt result");
    });

    it("returns a 2-arg callback when argsSchema is configured", async () => {
      const callback = new McpPromptMethodCallback({
        provider: new ExamplePromptProvider(),
        propertyKey: "useArgsSchema",
        metadata: createMetadata({
          name: "schema-prompt",
          argsSchema: ExamplePromptArgsSchema,
        }),
        mcpServer: createMockMcpServer(),
      });

      const [, , cb] = callback.apply();
      const result = await (
        cb as (
          args: Record<string, unknown>,
          ctx: ServerContext,
        ) => Promise<GetPromptResult>
      )({ name: "Jordan", enabled: true }, createMockCtx());

      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: "Jordan:true",
      });
    });
  });

  describe("handle() — result conversion", () => {
    it("returns Promise<GetPromptResult> as-is", async () => {
      const callback = createCallback("returnPromptResult", "prompt-result");
      const result = await callback.handle(undefined, createMockCtx());

      expect(result.description).toBe("Prompt result");
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.role).toBe("assistant");
      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: "Async prompt result",
      });
    });

    it("wraps Promise<string> as a single assistant message", async () => {
      const callback = createCallback("returnString", "string");
      const result = await callback.handle(undefined, createMockCtx());

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: "Async string response",
      });
    });

    it("wraps Promise<PromptMessage> as a single-message array", async () => {
      const callback = createCallback("returnSingleMessage", "single-message");
      const result = await callback.handle(undefined, createMockCtx());

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: "Async single message",
      });
    });

    it("returns Promise<PromptMessage[]> as the messages array", async () => {
      const callback = createCallback("returnMessageList", "message-list");
      const result = await callback.handle(undefined, createMockCtx());

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: "Async message 1",
      });
      expect(result.messages[1]?.content).toMatchObject({
        type: "text",
        text: "Async message 2",
      });
    });

    it("wraps Promise<string[]> as multiple assistant messages", async () => {
      const callback = createCallback("returnStringList", "string-list");
      const result = await callback.handle(undefined, createMockCtx());

      expect(result.messages).toHaveLength(3);
      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: "Async string 1",
      });
      expect(result.messages[1]?.content).toMatchObject({
        type: "text",
        text: "Async string 2",
      });
      expect(result.messages[2]?.content).toMatchObject({
        type: "text",
        text: "Async string 3",
      });
    });
  });

  describe("handle() — argument resolution", () => {
    it("forwards SDK-validated args to the user method", async () => {
      const callback = new McpPromptMethodCallback({
        provider: new ExamplePromptProvider(),
        propertyKey: "useArgsSchema",
        metadata: createMetadata({
          name: "schema-prompt",
          argsSchema: ExamplePromptArgsSchema,
        }),
        mcpServer: createMockMcpServer(),
      });

      const result = await callback.handle(
        { name: "Jordan", enabled: true },
        createMockCtx(),
      );

      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: "Jordan:true",
      });
    });

    it("substitutes an empty args object for schema-backed methods when undefined", async () => {
      const callback = new McpPromptMethodCallback({
        provider: new ExamplePromptProvider(),
        propertyKey: "useArgsSchema",
        metadata: createMetadata({
          name: "schema-prompt",
          argsSchema: ExamplePromptArgsSchema,
        }),
        mcpServer: createMockMcpServer(),
      });

      const result = await callback.handle(undefined, createMockCtx());

      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: "undefined:undefined",
      });
    });
  });

  describe("handle() — context propagation", () => {
    it("wraps the mcpServer into methodContext.exchange", async () => {
      const callback = createCallback("captureExchange", "capture-exchange");
      const result = await callback.handle(undefined, createMockCtx());

      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: "exchange=McpServerExchange",
      });
    });
  });

  describe("handle() — meta and signal", () => {
    it("forwards _meta into McpMeta", async () => {
      const callback = createCallback("useMeta", "meta-prompt");
      const result = await callback.handle(
        undefined,
        createMockCtx({
          _meta: { userId: "user123", sessionId: "session456" },
        }),
      );

      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: 'Meta: {"userId":"user123","sessionId":"session456"}',
      });
    });

    it("yields an empty meta object when _meta is absent", async () => {
      const callback = createCallback("useMeta", "meta-prompt");
      const result = await callback.handle(undefined, createMockCtx());

      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: "Meta: {}",
      });
    });

    it("exposes progressToken from _meta when present", async () => {
      const callback = createCallback("useProgressToken", "progress-prompt");
      const result = await callback.handle(
        undefined,
        createMockCtx({ _meta: { progressToken: "token-1" } }),
      );

      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: "progressToken=token-1",
      });
    });

    it("forwards the abort signal from ctx.mcpReq", async () => {
      const callback = createCallback("captureSignal", "signal-prompt");
      const controller = new AbortController();
      const result = await callback.handle(
        undefined,
        createMockCtx({ signal: controller.signal }),
      );

      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: "signal=present aborted=false",
      });
    });
  });

  describe("handle() — error handling", () => {
    it("wraps method exceptions in McpPromptMethodException", async () => {
      const callback = createCallback("failing", "failing-prompt");

      await expect(
        callback.handle(undefined, createMockCtx()),
      ).rejects.toMatchObject({
        name: "McpPromptMethodException",
        message: "Error invoking prompt method: failing",
      });
    });
  });
});

function createCallback(
  propertyKey: keyof ExamplePromptProvider,
  name: string,
): McpPromptMethodCallback {
  return new McpPromptMethodCallback({
    provider: new ExamplePromptProvider(),
    propertyKey,
    metadata: createMetadata({ name }),
    mcpServer: createMockMcpServer(),
  });
}

function createMetadata(
  overrides: Partial<McpPromptMetadata> = {},
): McpPromptMetadata {
  return {
    name: "",
    title: "",
    description: "",
    metaProvider: DefaultMetaProvider,
    argsSchema: null,
    ...overrides,
  };
}

function createMetaProvider(
  meta: Record<string, unknown>,
): new () => MetaProvider {
  return class implements MetaProvider {
    getMeta(): Record<string, unknown> {
      return meta;
    }
  };
}

function createMockMcpServer(): McpServer {
  return {
    server: {
      getClientCapabilities: () => undefined,
      getClientVersion: () => undefined,
    },
  } as unknown as McpServer;
}

interface MockCtxOverrides {
  _meta?: Record<string, unknown>;
  signal?: AbortSignal;
  sessionId?: string;
}

function createMockCtx(overrides: MockCtxOverrides = {}): ServerContext {
  return {
    sessionId: overrides.sessionId,
    mcpReq: {
      id: 1,
      method: "prompts/get",
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
