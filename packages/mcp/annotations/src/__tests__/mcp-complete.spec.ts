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

import { assert, describe, expect, it } from "vitest";
import type {
  CompleteRequest,
  CompleteResult,
} from "@modelcontextprotocol/server";
import { MCP_COMPLETE_METADATA_KEY } from "../metadata.js";
import { McpComplete } from "../mcp-complete.js";
import type { McpMeta } from "../mcp-meta.js";
import type {
  McpCompleteMetadata,
  McpCompleteMethodArguments,
} from "../mcp-complete.js";
import { McpServerExchange, McpTransportContext } from "@nestjs-ai/mcp-common";
import { McpCompleteMethodCallback } from "../method/index.js";

class McpCompleteTypeExamples {
  @McpComplete({ prompt: "test-prompt" })
  validSync(args: McpCompleteMethodArguments): CompleteResult {
    void args.exchange;
    void args.context;
    void args.request;
    void args.argument;
    void args.value;
    void args.meta;
    void args.progressToken;

    return {
      completion: {
        values: ["test"],
        total: 1,
        hasMore: false,
      },
    };
  }

  @McpComplete({ prompt: "test-prompt" })
  async validAsync(args: McpCompleteMethodArguments): Promise<CompleteResult> {
    void args.exchange;
    void args.context;
    void args.request;
    void args.argument;
    void args.value;
    void args.meta;
    void args.progressToken;

    return {
      completion: {
        values: ["test"],
        total: 1,
        hasMore: false,
      },
    };
  }

  @McpComplete({ prompt: "test-prompt" })
  validCompletion(
    args: McpCompleteMethodArguments,
  ): CompleteResult["completion"] {
    void args;

    return {
      values: ["test"],
      total: 1,
      hasMore: false,
    };
  }

  // @ts-expect-error @McpComplete only supports methods with exactly one object parameter
  @McpComplete({ prompt: "test-prompt" })
  noArguments() {}

  // @ts-expect-error @McpComplete only supports methods with a single object parameter
  @McpComplete({ prompt: "test-prompt" })
  wrongArgumentType(_value: string) {}

  // @ts-expect-error @McpComplete only supports methods returning CompleteResult, CompleteCompletion, string, string[], or Promise thereof
  @McpComplete({ prompt: "test-prompt" })
  wrongReturnType(args: McpCompleteMethodArguments) {
    void args;
    return 1;
  }

  @McpComplete({ prompt: "test-prompt" })
  metaAndToken(args: McpCompleteMethodArguments): Promise<CompleteResult> {
    const meta: McpMeta | undefined = args.meta;
    void meta?.get("test");
    void args.progressToken;

    return Promise.resolve({
      completion: {
        values: ["test"],
        total: 1,
        hasMore: false,
      },
    });
  }

  // @ts-expect-error @McpComplete only supports methods with exactly one object parameter
  @McpComplete({ prompt: "test-prompt" })
  tooManyArguments(
    args: McpCompleteMethodArguments,
    _context: string,
  ): CompleteResult {
    void args;
    void _context;

    return {
      completion: {
        values: ["test"],
        total: 1,
        hasMore: false,
      },
    };
  }
}

void McpCompleteTypeExamples;

describe("McpComplete", () => {
  class TestHandlers {
    @McpComplete({ prompt: "test-prompt" })
    onComplete(args: McpCompleteMethodArguments): CompleteResult {
      void args;

      return {
        completion: {
          values: ["test"],
          total: 1,
          hasMore: false,
        },
      };
    }
  }

  it("stores metadata for completion handlers", () => {
    const metadata = Reflect.getMetadata(
      MCP_COMPLETE_METADATA_KEY,
      TestHandlers.prototype,
      "onComplete",
    ) as McpCompleteMetadata;

    assert.exists(metadata);
    expect(metadata.prompt).toBe("test-prompt");
    expect(metadata.uri).toBe("");
  });

  it("passes the exchange transport context into stateful completion handlers", async () => {
    let receivedArgs: McpCompleteMethodArguments | undefined;

    class CompletionHandler {
      @McpComplete({ prompt: "test-prompt" })
      async onComplete(
        args: McpCompleteMethodArguments,
      ): Promise<CompleteResult> {
        receivedArgs = args;

        return {
          completion: {
            values: ["done"],
            total: 1,
            hasMore: false,
          },
        };
      }
    }

    const transportContext = McpTransportContext.create({
      traceId: "trace-1",
    });

    const exchange = new McpServerExchange(
      {
        server: {
          getClientCapabilities: () => undefined,
          getClientVersion: () => undefined,
        },
      } as never,
      {
        sessionId: "session-1",
        mcpReq: {
          notify: async () => undefined,
        },
      } as never,
      transportContext,
    );

    const callback = new McpCompleteMethodCallback({
      provider: new CompletionHandler(),
      propertyKey: "onComplete",
      complete: { prompt: "test-prompt", uri: "" },
      mcpServer: {
        server: {
          getClientCapabilities: () => undefined,
          getClientVersion: () => undefined,
          listRoots: () => Promise.reject(new Error("listRoots not mocked")),
          elicitInput: () =>
            Promise.reject(new Error("elicitInput not mocked")),
          createMessage: () =>
            Promise.reject(new Error("createMessage not mocked")),
          sendLoggingMessage: () => Promise.resolve(),
          ping: () => Promise.resolve(),
        },
      } as never,
    });

    const request = {
      params: {
        ref: {
          type: "ref/prompt",
          name: "example",
        },
        argument: { value: "alpha" },
        _meta: { progressToken: "token-1", test: "meta-value" },
      },
    } as unknown as CompleteRequest;

    const result = await (
      callback as unknown as {
        handleWithExchange(
          exchange: McpServerExchange,
          request: CompleteRequest,
        ): Promise<CompleteResult>;
      }
    ).handleWithExchange(exchange, request);

    expect(result.completion.values).toEqual(["done"]);
    expect(receivedArgs?.context).toBe(transportContext);
    expect(receivedArgs?.context?.get("traceId")).toBe("trace-1");
    expect(receivedArgs?.exchange).toBe(exchange);
  });
});
