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
  ServerContext,
} from "@modelcontextprotocol/server";
import { McpComplete } from "../../../mcp-complete.js";
import type { McpCompleteMethodArguments } from "../../../mcp-complete.js";
import { McpTransportContext } from "../../../context/index.js";
import { McpStatelessCompleteMethodCallback } from "../index.js";

class AsyncStatelessCompleteReturnTypes {
  @McpComplete({ prompt: "test-prompt" })
  async completionObject(
    args: McpCompleteMethodArguments,
  ): Promise<CompleteResult["completion"]> {
    void args;

    return {
      values: ["Async stateless completion object for: value"],
      total: 1,
      hasMore: false,
    };
  }

  @McpComplete({ prompt: "test-prompt" })
  async completionList(args: McpCompleteMethodArguments): Promise<string[]> {
    void args;

    return [
      "Async stateless list item 1 for: value",
      "Async stateless list item 2 for: value",
    ];
  }

  @McpComplete({ prompt: "test-prompt" })
  async completionString(args: McpCompleteMethodArguments): Promise<string> {
    void args;

    return "Async stateless string completion for: value";
  }

  @McpComplete({ prompt: "test-prompt" })
  async directCompletionResult(
    args: McpCompleteMethodArguments,
  ): Promise<CompleteResult> {
    void args;

    return {
      completion: {
        values: ["Direct stateless completion for value"],
        total: 1,
        hasMore: false,
      },
    };
  }
}

/**
 * Tests for {@link McpStatelessCompleteMethodCallback}.
 */
describe("McpStatelessCompleteMethodCallback", () => {
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

  it("test callback with transport context", async () => {
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

    const callback = new McpStatelessCompleteMethodCallback({
      provider: new CompletionHandler(),
      propertyKey: "onComplete",
      complete: { prompt: "test-prompt", uri: "" },
    });

    const result = await callback.apply(
      transportContext as unknown as ServerContext,
      createRequest(),
    );

    expect(result.completion.values).toEqual(["done"]);
    expect(receivedArgs).toEqual(
      expect.objectContaining({
        request: createRequest(),
        argument: createRequest().params.argument,
        value: "value",
        progressToken: "token-1",
      }),
    );
    expect(receivedArgs?.meta?.get("test")).toBe("meta-value");
    expect(receivedArgs?.context).toBe(transportContext);
    expect(receivedArgs?.context?.get("traceId")).toBe("trace-1");
    expect(receivedArgs?.exchange).toBeUndefined();
  });

  it("test callback with completion object", async () => {
    const callback = new McpStatelessCompleteMethodCallback({
      provider: new AsyncStatelessCompleteReturnTypes(),
      propertyKey: "completionObject",
      complete: { prompt: "test-prompt", uri: "" },
    });

    const result = await callback.apply({} as ServerContext, createRequest());

    expect(result.completion.values).toEqual([
      "Async stateless completion object for: value",
    ]);
    expect(result.completion.total).toBe(1);
    expect(result.completion.hasMore).toBe(false);
  });

  it("test callback with completion list", async () => {
    const callback = new McpStatelessCompleteMethodCallback({
      provider: new AsyncStatelessCompleteReturnTypes(),
      propertyKey: "completionList",
      complete: { prompt: "test-prompt", uri: "" },
    });

    const result = await callback.apply({} as ServerContext, createRequest());

    expect(result.completion.values).toEqual([
      "Async stateless list item 1 for: value",
      "Async stateless list item 2 for: value",
    ]);
    expect(result.completion.total).toBe(2);
    expect(result.completion.hasMore).toBe(false);
  });

  it("test callback with completion string", async () => {
    const callback = new McpStatelessCompleteMethodCallback({
      provider: new AsyncStatelessCompleteReturnTypes(),
      propertyKey: "completionString",
      complete: { prompt: "test-prompt", uri: "" },
    });

    const result = await callback.apply({} as ServerContext, createRequest());

    expect(result.completion.values).toEqual([
      "Async stateless string completion for: value",
    ]);
    expect(result.completion.total).toBe(1);
    expect(result.completion.hasMore).toBe(false);
  });

  it("test callback with direct completion result", async () => {
    const callback = new McpStatelessCompleteMethodCallback({
      provider: new AsyncStatelessCompleteReturnTypes(),
      propertyKey: "directCompletionResult",
      complete: { prompt: "test-prompt", uri: "" },
    });

    const result = await callback.apply({} as ServerContext, createRequest());

    expect(result.completion.values).toEqual([
      "Direct stateless completion for value",
    ]);
    expect(result.completion.total).toBe(1);
    expect(result.completion.hasMore).toBe(false);
  });
});
