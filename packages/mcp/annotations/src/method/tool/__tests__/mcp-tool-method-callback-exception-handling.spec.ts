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
  CallToolRequest,
  CallToolResult,
} from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";

import {
  McpServerExchange,
  McpTransportContext,
} from "../../../context/index.js";
import { McpTool } from "../../../mcp-tool.js";
import { McpToolMethodCallback } from "../mcp-tool-method-callback.js";
import type { McpToolMethodArguments } from "../../../mcp-tool.js";
import { ReturnMode } from "../return-mode.js";

describe("McpToolMethodCallback exception handling", () => {
  it("testDefaultConstructor_CatchesAllExceptions", async () => {
    // Test with default constructor (uses Error)
    const provider = new ExceptionTestToolProvider();
    const callback = new McpToolMethodCallback({
      provider,
      propertyKey: "runtimeExceptionTool",
      returnMode: ReturnMode.TEXT,
    });

    const exchange = createMockExchange();
    const request = createRequest("runtime-exception-tool", { input: "test" });

    // The Error thrown by the method should be caught and converted to error
    // result
    const result = await callback.apply(exchange, request);

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(textOf(result)).toContain("Runtime error: test");
  });

  it("testExceptionClassConstructor_CatchesSpecifiedExceptions", async () => {
    // Configure to catch only CustomRuntimeException and its subclasses
    const provider = new ExceptionTestToolProvider();
    const callback = new McpToolMethodCallback({
      provider,
      propertyKey: "customRuntimeExceptionTool",
      returnMode: ReturnMode.TEXT,
      toolCallExceptionClass: CustomRuntimeException,
    });

    const exchange = createMockExchange();
    const request = createRequest("custom-runtime-exception-tool", {
      input: "test",
    });

    // The CustomRuntimeException from callMethod should be caught
    const result = await callback.apply(exchange, request);

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("Custom runtime error: test");
  });

  it("testNonMatchingExceptionClass_ThrowsException", async () => {
    // Configure to catch only IllegalArgumentLikeError
    const provider = new ExceptionTestToolProvider();
    const callback = new McpToolMethodCallback({
      provider,
      propertyKey: "runtimeExceptionTool",
      returnMode: ReturnMode.TEXT,
      toolCallExceptionClass: IllegalArgumentLikeError,
    });

    const exchange = createMockExchange();
    const request = createRequest("runtime-exception-tool", { input: "test" });

    // The Error from the method should NOT be caught (not an
    // IllegalArgumentLikeError)
    await expect(callback.apply(exchange, request)).rejects.toThrow(
      "Runtime error: test",
    );
  });

  it("testCheckedExceptionHandling_WithExceptionClass", async () => {
    // Test handling of business exceptions
    const provider = new ExceptionTestToolProvider();
    const callback = new McpToolMethodCallback({
      provider,
      propertyKey: "checkedExceptionTool",
      returnMode: ReturnMode.TEXT,
      toolCallExceptionClass: Error,
    });

    const exchange = createMockExchange();
    const request = createRequest("checked-exception-tool", { input: "test" });

    // The error wrapper should be caught
    const result = await callback.apply(exchange, request);

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("Business error: test");
  });

  it("testCheckedExceptionHandling_WithSpecificClass", async () => {
    // Configure to catch only IllegalArgumentLikeError (not BusinessException)
    const provider = new ExceptionTestToolProvider();
    const callback = new McpToolMethodCallback({
      provider,
      propertyKey: "checkedExceptionTool",
      returnMode: ReturnMode.TEXT,
      toolCallExceptionClass: IllegalArgumentLikeError,
    });

    const exchange = createMockExchange();
    const request = createRequest("checked-exception-tool", { input: "test" });

    // The BusinessException should NOT be caught
    await expect(callback.apply(exchange, request)).rejects.toBeInstanceOf(
      BusinessException,
    );
  });

  it("testSuccessfulExecution_NoExceptionThrown", async () => {
    // Test that successful execution works normally regardless of exception class
    // config
    const provider = new ExceptionTestToolProvider();
    const callback = new McpToolMethodCallback({
      provider,
      propertyKey: "successTool",
      returnMode: ReturnMode.TEXT,
      toolCallExceptionClass: IllegalArgumentLikeError,
    });

    const exchange = createMockExchange();
    const request = createRequest("success-tool", { input: "test" });

    const result = await callback.apply(exchange, request);

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Success: test",
    });
  });

  it("testNullPointerException_WithRuntimeExceptionClass", async () => {
    // Configure to catch Error (which includes TypeError)
    const provider = new ExceptionTestToolProvider();
    const callback = new McpToolMethodCallback({
      provider,
      propertyKey: "nullPointerTool",
      returnMode: ReturnMode.TEXT,
      toolCallExceptionClass: Error,
    });

    const exchange = createMockExchange();
    const request = createRequest("null-pointer-tool", { input: "test" });

    // Should catch the TypeError
    const result = await callback.apply(exchange, request);

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("Null pointer: test");
  });

  it("testIllegalArgumentException_WithSpecificHandling", async () => {
    // Configure to catch any Error
    const provider = new ExceptionTestToolProvider();
    const callback = new McpToolMethodCallback({
      provider,
      propertyKey: "illegalArgumentTool",
      returnMode: ReturnMode.TEXT,
      toolCallExceptionClass: Error,
    });

    const exchange = createMockExchange();
    const request = createRequest("illegal-argument-tool", { input: "test" });

    // Should catch the IllegalArgumentLikeError
    const result = await callback.apply(exchange, request);

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("Illegal argument: test");
  });

  it("testMultipleCallsWithDifferentResults", async () => {
    // Test that the same callback instance handles different scenarios correctly
    const provider = new ExceptionTestToolProvider();

    // Create callbacks with Error handling (catches all)
    const successCallback = new McpToolMethodCallback({
      provider,
      propertyKey: "successTool",
      returnMode: ReturnMode.TEXT,
      toolCallExceptionClass: Error,
    });
    const exceptionCallback = new McpToolMethodCallback({
      provider,
      propertyKey: "runtimeExceptionTool",
      returnMode: ReturnMode.TEXT,
      toolCallExceptionClass: Error,
    });

    const exchange = createMockExchange();

    // Test success case
    const successResult = await successCallback.apply(
      exchange,
      createRequest("success-tool", { input: "success" }),
    );
    expect(successResult.isError).toBeFalsy();
    expect(textOf(successResult)).toBe("Success: success");

    // Test exception case
    const exceptionResult = await exceptionCallback.apply(
      exchange,
      createRequest("runtime-exception-tool", { input: "error" }),
    );
    expect(exceptionResult.isError).toBe(true);
    expect(textOf(exceptionResult)).toContain("Runtime error: error");
  });

  it("testExceptionHierarchy_ParentClassCatchesSubclasses", async () => {
    // Configure to catch Error (parent of CustomRuntimeException)
    const provider = new ExceptionTestToolProvider();
    const callback = new McpToolMethodCallback({
      provider,
      propertyKey: "customRuntimeExceptionTool",
      returnMode: ReturnMode.TEXT,
      toolCallExceptionClass: Error,
    });

    const exchange = createMockExchange();
    const request = createRequest("custom-runtime-exception-tool", {
      input: "test",
    });

    // Should catch the CustomRuntimeException (subclass of Error)
    const result = await callback.apply(exchange, request);
    expect(result.isError).toBe(true);
  });

  it("testConstructorWithNullExceptionClass_UsesDefault", async () => {
    // The constructor without toolCallExceptionClass uses Error as default
    const provider = new ExceptionTestToolProvider();
    const callback = new McpToolMethodCallback({
      provider,
      propertyKey: "runtimeExceptionTool",
      returnMode: ReturnMode.TEXT,
    });

    const exchange = createMockExchange();
    const request = createRequest("runtime-exception-tool", { input: "test" });

    // Should catch all exceptions (default is Error)
    const result = await callback.apply(exchange, request);
    expect(result.isError).toBe(true);
  });
});

// Custom exception classes for testing
class BusinessException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessException";
  }
}

class CustomRuntimeException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomRuntimeException";
  }
}

class IllegalArgumentLikeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IllegalArgumentLikeError";
  }
}

// Test tool provider with various exception-throwing methods
class ExceptionTestToolProvider {
  @McpTool({
    name: "runtime-exception-tool",
    description: "Tool that throws Error",
  })
  runtimeExceptionTool(args: McpToolMethodArguments): string {
    throw new Error(`Runtime error: ${String(args.toolArguments.input)}`);
  }

  @McpTool({
    name: "custom-runtime-exception-tool",
    description: "Tool that throws CustomRuntimeException",
  })
  customRuntimeExceptionTool(args: McpToolMethodArguments): string {
    throw new CustomRuntimeException(
      `Custom runtime error: ${String(args.toolArguments.input)}`,
    );
  }

  @McpTool({
    name: "checked-exception-tool",
    description: "Tool that throws checked exception",
  })
  checkedExceptionTool(args: McpToolMethodArguments): string {
    throw new BusinessException(
      `Business error: ${String(args.toolArguments.input)}`,
    );
  }

  @McpTool({ name: "success-tool", description: "Tool that succeeds" })
  successTool(args: McpToolMethodArguments): string {
    return `Success: ${String(args.toolArguments.input)}`;
  }

  @McpTool({
    name: "null-pointer-tool",
    description: "Tool that throws TypeError",
  })
  nullPointerTool(args: McpToolMethodArguments): string {
    throw new TypeError(`Null pointer: ${String(args.toolArguments.input)}`);
  }

  @McpTool({
    name: "illegal-argument-tool",
    description: "Tool that throws IllegalArgumentLikeError",
  })
  illegalArgumentTool(args: McpToolMethodArguments): string {
    throw new IllegalArgumentLikeError(
      `Illegal argument: ${String(args.toolArguments.input)}`,
    );
  }
}

function createRequest(
  toolName: string,
  argumentsMap: Record<string, unknown>,
): CallToolRequest {
  return {
    params: {
      name: toolName,
      arguments: argumentsMap,
    },
  } as unknown as CallToolRequest;
}

function createMockExchange(): McpServerExchange {
  return Object.assign(Object.create(McpServerExchange.prototype), {
    transportContext: () => McpTransportContext.EMPTY,
  }) as McpServerExchange;
}

function textOf(result: CallToolResult): string {
  const block = result.content[0];
  if (block && "text" in block && typeof block.text === "string") {
    return block.text;
  }
  return "";
}
