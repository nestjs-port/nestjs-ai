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
import type {
  CompleteRequest,
  CompleteResult,
  McpServer,
} from "@modelcontextprotocol/server";
import { McpComplete } from "../../../mcp-complete.js";
import type { McpCompleteMethodArguments } from "../../../mcp-complete.js";
import { McpCompleteMethodCallback } from "../mcp-complete-method-callback.js";

class AsyncCompleteReturnTypes {
  @McpComplete({ prompt: "test-prompt" })
  async completionObject(
    args: McpCompleteMethodArguments,
  ): Promise<CompleteResult["completion"]> {
    void args;

    return {
      values: ["Async completion object for: value"],
      total: 1,
      hasMore: false,
    };
  }

  @McpComplete({ prompt: "test-prompt" })
  async completionList(args: McpCompleteMethodArguments): Promise<string[]> {
    void args;

    return ["Async list item 1 for: value", "Async list item 2 for: value"];
  }

  @McpComplete({ prompt: "test-prompt" })
  async completionString(args: McpCompleteMethodArguments): Promise<string> {
    void args;

    return "Async string completion for: value";
  }

  @McpComplete({ prompt: "test-prompt" })
  async directCompletionResult(
    args: McpCompleteMethodArguments,
  ): Promise<CompleteResult> {
    void args;

    return {
      completion: {
        values: ["Direct completion for value"],
        total: 1,
        hasMore: false,
      },
    };
  }
}

describe("McpCompleteMethodCallback", () => {
  const createRequest = (): CompleteRequest =>
    ({
      params: {
        ref: {
          type: "ref/prompt",
          name: "example",
        },
        argument: { value: "value" },
        _meta: { progressToken: "token-1", test: "meta-value" },
      },
    }) as unknown as CompleteRequest;

  it("test callback with completion object", async () => {
    const callback = new McpCompleteMethodCallback({
      provider: new AsyncCompleteReturnTypes(),
      propertyKey: "completionObject",
      complete: { prompt: "test-prompt", uri: "" },
      mcpServer: createMockServer(),
    });

    const result = await callback.handle(createRequest(), createMockCtx());

    expect(result.completion.values).toEqual([
      "Async completion object for: value",
    ]);
    expect(result.completion.total).toBe(1);
    expect(result.completion.hasMore).toBe(false);
  });

  it("test callback with completion list", async () => {
    const callback = new McpCompleteMethodCallback({
      provider: new AsyncCompleteReturnTypes(),
      propertyKey: "completionList",
      complete: { prompt: "test-prompt", uri: "" },
      mcpServer: createMockServer(),
    });

    const result = await callback.handle(createRequest(), createMockCtx());

    expect(result.completion.values).toEqual([
      "Async list item 1 for: value",
      "Async list item 2 for: value",
    ]);
    expect(result.completion.total).toBe(2);
    expect(result.completion.hasMore).toBe(false);
  });

  it("test callback with completion string", async () => {
    const callback = new McpCompleteMethodCallback({
      provider: new AsyncCompleteReturnTypes(),
      propertyKey: "completionString",
      complete: { prompt: "test-prompt", uri: "" },
      mcpServer: createMockServer(),
    });

    const result = await callback.handle(createRequest(), createMockCtx());

    expect(result.completion.values).toEqual([
      "Async string completion for: value",
    ]);
    expect(result.completion.total).toBe(1);
    expect(result.completion.hasMore).toBe(false);
  });

  it("test callback with direct completion result", async () => {
    const callback = new McpCompleteMethodCallback({
      provider: new AsyncCompleteReturnTypes(),
      propertyKey: "directCompletionResult",
      complete: { prompt: "test-prompt", uri: "" },
      mcpServer: createMockServer(),
    });

    const result = await callback.handle(createRequest(), createMockCtx());

    expect(result.completion.values).toEqual(["Direct completion for value"]);
    expect(result.completion.total).toBe(1);
    expect(result.completion.hasMore).toBe(false);
  });
});

function createMockServer(): McpServer {
  return {
    server: {
      getClientCapabilities: () => undefined,
      getClientVersion: () => undefined,
      listRoots: () => Promise.reject(new Error("listRoots not mocked")),
      elicitInput: () => Promise.reject(new Error("elicitInput not mocked")),
      createMessage: () =>
        Promise.reject(new Error("createMessage not mocked")),
      sendLoggingMessage: () => Promise.resolve(),
      ping: () => Promise.resolve(),
    },
  } as unknown as McpServer;
}

function createMockCtx() {
  return {
    sessionId: "session-1",
    mcpReq: {
      _meta: undefined,
      signal: new AbortController().signal,
      notify: () => Promise.resolve(),
    },
  } as never;
}
