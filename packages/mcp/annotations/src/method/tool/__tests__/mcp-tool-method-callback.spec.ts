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
import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  McpServerExchange,
  McpTransportContext,
} from "../../../context/index.js";
import { McpTool } from "../../../mcp-tool.js";
import { McpToolMethodCallback } from "../mcp-tool-method-callback.js";
import type { ToolRegistration } from "../mcp-tool-method-callback.js";
import type { McpToolMethodArguments } from "../../../mcp-tool.js";
import { ReturnMode } from "../return-mode.js";

type StandardSchemaWithJsonSchema = StandardSchemaV1 & StandardJSONSchemaV1;

describe("McpToolMethodCallback", () => {
  it("returns [name, config, callback] tuple ready for registerTool", () => {
    const callback = createCallback(
      new TestToolProvider(),
      "simpleTool",
      ReturnMode.TEXT,
    );

    const [name, config, cb] = callback.apply();

    expect(name).toBe("simple-tool");
    expect(config.description).toBe("A simple tool");
    expect(typeof cb).toBe("function");
    const spec: ToolRegistration = [name, config, cb];
    expect(spec).toHaveLength(3);
  });

  it("testSimpleToolCallback", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "simpleTool", ReturnMode.TEXT);

    const exchange = createMockExchange();
    const request = createRequest("simple-tool", { input: "test message" });

    const result = await callback.handle(exchange, request);

    expect(result).not.toBeNull();
    expect(result.isError).toBeFalsy();
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Processed: test message",
    });
  });

  it("testMathToolCallback", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "addNumbers", ReturnMode.TEXT);

    const exchange = createMockExchange();
    const request = createRequest("math-tool", { a: 5, b: 3 });

    const result = await callback.handle(exchange, request);

    expect(result).not.toBeNull();
    expect(result.isError).toBeFalsy();
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toMatchObject({ type: "text", text: "8" });
  });

  it("testComplexToolCallback", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "complexTool", ReturnMode.TEXT);

    const exchange = createMockExchange();
    const request = createRequest("complex-tool", {
      name: "John",
      age: 30,
      active: true,
    });

    const result = await callback.handle(exchange, request);

    expect(result).not.toBeNull();
    expect(result.isError).toBeFalsy();
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Name: John, Age: 30, Active: true",
    });
  });

  it("testToolWithExchangeParameter", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(
      provider,
      "toolWithExchange",
      ReturnMode.TEXT,
    );

    const exchange = createMockExchange();
    const request = createRequest("exchange-tool", { message: "hello" });

    const result = await callback.handle(exchange, request);

    expect(result).not.toBeNull();
    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Exchange tool: hello",
    });
  });

  it("testToolWithListParameter", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "processList", ReturnMode.TEXT);

    const exchange = createMockExchange();
    const request = createRequest("list-tool", {
      items: ["item1", "item2", "item3"],
    });

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Items: item1, item2, item3",
    });
  });

  it("testToolWithObjectParameter", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "processObject", ReturnMode.TEXT);

    const exchange = createMockExchange();
    const request = createRequest("object-tool", {
      obj: { name: "test", value: 42 },
    });

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Object: test - 42",
    });
  });

  it("testToolWithNoParameters", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "noParamsTool", ReturnMode.TEXT);

    const exchange = createMockExchange();
    const request = createRequest("no-params-tool", {});

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "No parameters needed",
    });
  });

  it("testToolWithEnumParameter", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "enumTool", ReturnMode.TEXT);

    const exchange = createMockExchange();
    const request = createRequest("enum-tool", { enumValue: "OPTION_B" });

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Enum: OPTION_B",
    });
  });

  it("testToolWithPrimitiveTypes", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(
      provider,
      "primitiveTypesTool",
      ReturnMode.TEXT,
    );

    const exchange = createMockExchange();
    const request = createRequest("primitive-types-tool", {
      flag: true,
      b: 1,
      s: 2,
      i: 3,
      l: 4,
      f: 5.5,
      d: 6.6,
    });

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Primitives: true, 1, 2, 3, 4, 5.5, 6.6",
    });
  });

  it("testToolWithNullParameters", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "simpleTool", ReturnMode.TEXT);

    const exchange = createMockExchange();
    const request = createRequest("simple-tool", { input: null });

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Processed: null",
    });
  });

  it("testToolWithMissingParameters", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "simpleTool", ReturnMode.TEXT);

    const exchange = createMockExchange();
    const request = createRequest("simple-tool", {});

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Processed: null",
    });
  });

  it("testToolThatThrowsException", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "exceptionTool", ReturnMode.TEXT);

    const exchange = createMockExchange();
    const request = createRequest("exception-tool", { input: "test" });

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(textOf(result)).toContain("Tool execution failed: test");
  });

  it("testToolThatReturnsNull", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(
      provider,
      "nullReturnTool",
      ReturnMode.TEXT,
    );

    const exchange = createMockExchange();
    const request = createRequest("null-return-tool", {});

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({ type: "text", text: "null" });
  });

  it("testNullRequest", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "simpleTool", ReturnMode.TEXT);

    await expect(
      callback.handle(createMockExchange(), null as never),
    ).rejects.toThrow("Request must not be null");
  });

  it("testCallbackReturnsCallToolResult", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "complexTool", ReturnMode.TEXT);

    const exchange = createMockExchange();
    const request = createRequest("complex-tool", {
      name: "Alice",
      age: 25,
      active: false,
    });

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Name: Alice, Age: 25, Active: false",
    });
  });

  it("testToolWithContextParameter", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(
      provider,
      "toolWithContext",
      ReturnMode.TEXT,
    );

    const exchange = createMockExchange();
    const request = createRequest("context-tool", { message: "hello" });

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Context tool: hello",
    });
  });

  it("testToolWithTransportContextParameter", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(
      provider,
      "toolWithTransportContext",
      ReturnMode.TEXT,
    );

    const transportContext = McpTransportContext.create({ traceId: "trace-1" });
    const exchange = createMockExchange(transportContext);
    const request = createRequest("transport-context-tool", {
      message: "hello",
    });

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Transport context tool: hello",
    });
  });

  it("testConstructorParameters", () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "simpleTool", ReturnMode.TEXT);

    expect(callback).not.toBeNull();
  });

  it("testToolWithTextOutput", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "processObject", ReturnMode.TEXT);

    const exchange = createMockExchange();
    const request = createRequest("object-tool", {
      obj: { name: "test", value: 42 },
    });

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Object: test - 42",
    });
  });

  it("testToolReturningComplexObject", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(
      provider,
      "returnObjectTool",
      ReturnMode.STRUCTURED,
    );

    const exchange = createMockExchange();
    const request = createRequest("return-object-tool", {
      name: "test",
      value: 42,
    });

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    // For complex return types (non-primitive, non-wrapper, non-CallToolResult),
    // the new implementation should return structured content
    expect(result.content).toHaveLength(0);
    expect(result.structuredContent).not.toBeUndefined();
    expect(result.structuredContent).toMatchObject({ name: "test", value: 42 });
  });

  it("testToolReturningComplexListObject", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(
      provider,
      "returnListObjectTool",
      ReturnMode.TEXT,
    );

    const exchange = createMockExchange();
    const request = createRequest("return-list-object-tool", {
      name: "test",
      value: 42,
    });

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    // For complex return types in TEXT mode, the result should be JSON serialized as
    // text content
    expect(result.content).toHaveLength(1);
    expect(JSON.parse(textOf(result))).toEqual([{ name: "test", value: 42 }]);
  });

  it("testToolReturningStructuredComplexListObject", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(
      provider,
      "returnListObjectTool",
      ReturnMode.STRUCTURED,
    );

    const exchange = createMockExchange();
    const request = createRequest("return-list-object-tool", {
      name: "test",
      value: 42,
    });

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).not.toBeUndefined();
    expect(Array.isArray(result.structuredContent)).toBe(true);
    expect(result.structuredContent).toHaveLength(1);
    expect(
      (
        result.structuredContent as unknown as Array<Record<string, unknown>>
      )[0],
    ).toMatchObject({
      name: "test",
      value: 42,
    });
  });

  it("testToolReturningStringList", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(
      provider,
      "returnListStringTool",
      ReturnMode.TEXT,
    );

    const exchange = createMockExchange();
    const request = createRequest("return-list-string-tool", {
      name: "test",
      value: 42,
    });

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    // For complex return types in TEXT mode, the result should be JSON serialized as
    // text content
    expect(result.content).toHaveLength(1);
    expect(JSON.parse(textOf(result))).toEqual(["test", "42"]);
  });

  // --------------------------------------------------------------------------
  // CallToolRequest parameter support
  // --------------------------------------------------------------------------

  it("testDynamicToolWithCallToolRequest", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "dynamicTool", ReturnMode.TEXT);

    const exchange = createMockExchange();
    const request = createRequest("dynamic-tool", {
      action: "analyze",
      data: "test-data",
    });

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Processed action: analyze for tool: dynamic-tool",
    });
  });

  it("testDynamicToolMissingRequiredParameter", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "dynamicTool", ReturnMode.TEXT);

    const exchange = createMockExchange();
    const request = createRequest("dynamic-tool", {
      data: "test-data",
    }); // Missing 'action' parameter

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe("Missing required 'action' parameter");
  });

  it("testContextAwareToolWithCallToolRequestAndExchange", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(
      provider,
      "contextAwareTool",
      ReturnMode.TEXT,
    );

    const exchange = createMockExchange();
    const request = createRequest("context-aware-tool", {
      key1: "value1",
      key2: "value2",
    });

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Exchange available: true, Args: 2",
    });
  });

  it("testCallToolRequestParameterInjection", async () => {
    // Test that CallToolRequest is properly injected via args.request
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "dynamicTool", ReturnMode.TEXT);

    const exchange = createMockExchange();
    const request = createRequest("dynamic-tool", {
      action: "test",
      data: "sample",
    });

    // The callback should properly inject the CallToolRequest
    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    // The tool should have access to the full request including the tool name
    expect(textOf(result)).toContain("tool: dynamic-tool");
  });

  it("testProgressTokenParameterInjection", async () => {
    // Test that args.progressToken receives the progress token from request
    const provider = new TestToolProvider();
    const callback = createCallback(
      provider,
      "progressTokenTool",
      ReturnMode.TEXT,
    );

    const exchange = createMockExchange();

    const request = createRequest(
      "progress-token-tool",
      { input: "test-input" },
      { progressToken: "test-progress-token-123" },
    );

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Input: test-input, Progress Token: test-progress-token-123",
    });
  });

  it("testProgressTokenParameterWithNullToken", async () => {
    // Test that args.progressToken handles null progress token
    const provider = new TestToolProvider();
    const callback = createCallback(
      provider,
      "progressTokenTool",
      ReturnMode.TEXT,
    );

    const exchange = createMockExchange();
    const request = createRequest("progress-token-tool", {
      input: "test-input",
    });

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Input: test-input, Progress Token: null",
    });
  });

  it("testStructuredOutputWithCallToolRequest", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(
      provider,
      "structuredOutputTool",
      ReturnMode.STRUCTURED,
    );

    const exchange = createMockExchange();
    const request = createRequest("structured-output-tool", {
      input: "test-message",
    });

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).not.toBeUndefined();
    expect(result.structuredContent).toMatchObject({
      message: "test-message",
      value: 42,
    });
  });

  it("testMetaParameterInjection", async () => {
    // Test that args.meta receives the meta from request
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "metaTool", ReturnMode.TEXT);

    const exchange = createMockExchange();
    const request = createRequest(
      "meta-tool",
      { input: "test-input" },
      { userId: "user123", sessionId: "session456" },
    );

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    expect(textOf(result)).toContain("Input: test-input");
    expect(textOf(result)).toContain(
      'Meta: {"userId":"user123","sessionId":"session456"',
    );
  });

  it("testMetaParameterWithNullMeta", async () => {
    // Test that args.meta handles null meta
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "metaTool", ReturnMode.TEXT);

    const exchange = createMockExchange();
    const request = createRequest("meta-tool", { input: "test-input" });

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    expect(textOf(result)).toBe("Input: test-input, Meta: {}");
  });

  // --------------------------------------------------------------------------
  // Async (Promise) result support
  // --------------------------------------------------------------------------

  it("testSimpleMonoToolCallback", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(
      provider,
      "simpleMonoTool",
      ReturnMode.TEXT,
    );

    const exchange = createMockExchange();
    const request = createRequest("simple-mono-tool", {
      input: "test message",
    });

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Processed: test message",
    });
  });

  it("testVoidReturnMode", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "voidTool", ReturnMode.VOID);

    const exchange = createMockExchange();
    const request = createRequest("void-tool", { input: "test" });

    const result = await callback.handle(exchange, request);

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({ type: "text", text: '"Done"' });
  });
});

class TestToolProvider {
  @McpTool({ name: "simple-tool", description: "A simple tool" })
  simpleTool(args: McpToolMethodArguments): string {
    const input = args.toolArguments.input;
    return `Processed: ${input == null ? "null" : String(input)}`;
  }

  @McpTool({ name: "math-tool", description: "A math tool" })
  addNumbers(args: McpToolMethodArguments): number {
    const a = Number(args.toolArguments.a);
    const b = Number(args.toolArguments.b);
    return a + b;
  }

  @McpTool({ name: "complex-tool", description: "A complex tool" })
  complexTool(args: McpToolMethodArguments): CallToolResult {
    const name = String(args.toolArguments.name);
    const age = Number(args.toolArguments.age);
    const active = Boolean(args.toolArguments.active);
    return {
      content: [
        {
          type: "text",
          text: `Name: ${name}, Age: ${age}, Active: ${active}`,
        },
      ],
    };
  }

  @McpTool({
    name: "exchange-tool",
    description: "Tool with exchange parameter",
  })
  toolWithExchange(args: McpToolMethodArguments): string {
    return `Exchange tool: ${String(args.toolArguments.message)}`;
  }

  @McpTool({
    name: "context-tool",
    description: "Tool with context parameter",
  })
  toolWithContext(args: McpToolMethodArguments): string {
    // The request context should be available to stateful tools
    void args.requestContext;
    return `Context tool: ${String(args.toolArguments.message)}`;
  }

  @McpTool({
    name: "transport-context-tool",
    description: "Tool with transport context parameter",
  })
  toolWithTransportContext(args: McpToolMethodArguments): string {
    void args.context;
    return `Transport context tool: ${String(args.toolArguments.message)}`;
  }

  @McpTool({ name: "list-tool", description: "Tool with list parameter" })
  processList(args: McpToolMethodArguments): string {
    const items = args.toolArguments.items as string[];
    return `Items: ${items.join(", ")}`;
  }

  @McpTool({ name: "object-tool", description: "Tool with object parameter" })
  processObject(args: McpToolMethodArguments): string {
    const obj = args.toolArguments.obj as { name: string; value: number };
    return `Object: ${obj.name} - ${obj.value}`;
  }

  @McpTool({
    name: "no-params-tool",
    description: "Tool with no parameters",
  })
  noParamsTool(_args: McpToolMethodArguments): string {
    return "No parameters needed";
  }

  @McpTool({
    name: "exception-tool",
    description: "Tool that throws exception",
  })
  exceptionTool(args: McpToolMethodArguments): string {
    throw new Error(
      `Tool execution failed: ${String(args.toolArguments.input)}`,
    );
  }

  @McpTool({
    name: "null-return-tool",
    description: "Tool that returns null",
  })
  nullReturnTool(_args: McpToolMethodArguments): string | null {
    return null;
  }

  @McpTool({ name: "enum-tool", description: "Tool with enum parameter" })
  enumTool(args: McpToolMethodArguments): string {
    return `Enum: ${String(args.toolArguments.enumValue)}`;
  }

  @McpTool({
    name: "primitive-types-tool",
    description: "Tool with primitive types",
  })
  primitiveTypesTool(args: McpToolMethodArguments): string {
    const flag = Boolean(args.toolArguments.flag);
    const b = Number(args.toolArguments.b);
    const s = Number(args.toolArguments.s);
    const i = Number(args.toolArguments.i);
    const l = Number(args.toolArguments.l);
    const f = Number(args.toolArguments.f);
    const d = Number(args.toolArguments.d);
    return `Primitives: ${flag}, ${b}, ${s}, ${i}, ${l}, ${f.toFixed(1)}, ${d.toFixed(1)}`;
  }

  @McpTool({
    name: "return-object-tool",
    description: "Tool that returns a complex object",
  })
  returnObjectTool(args: McpToolMethodArguments): {
    name: string;
    value: number;
  } {
    return {
      name: String(args.toolArguments.name),
      value: Number(args.toolArguments.value),
    };
  }

  @McpTool({
    name: "return-list-object-tool",
    description: "Tool that returns a list of complex objects",
  })
  returnListObjectTool(
    args: McpToolMethodArguments,
  ): Array<{ name: string; value: number }> {
    return [
      {
        name: String(args.toolArguments.name),
        value: Number(args.toolArguments.value),
      },
    ];
  }

  @McpTool({
    name: "return-list-string-tool",
    description: "Tool that returns a list of complex objects",
  })
  returnListStringTool(args: McpToolMethodArguments): string[] {
    return [String(args.toolArguments.name), String(args.toolArguments.value)];
  }

  @McpTool({
    name: "dynamic-tool",
    description: "Fully dynamic tool",
  })
  dynamicTool(args: McpToolMethodArguments): CallToolResult {
    // Access full request details
    const toolName = args.request.params.name;
    const argumentsMap = args.toolArguments;

    // Custom validation
    if (!Object.prototype.hasOwnProperty.call(argumentsMap, "action")) {
      return {
        content: [
          { type: "text", text: "Missing required 'action' parameter" },
        ],
        isError: true,
      };
    }

    const action = String(argumentsMap.action);
    return {
      content: [
        {
          type: "text",
          text: `Processed action: ${action} for tool: ${toolName}`,
        },
      ],
    };
  }

  @McpTool({
    name: "context-aware-tool",
    description: "Tool with context and request",
  })
  contextAwareTool(args: McpToolMethodArguments): CallToolResult {
    const argumentsMap = args.toolArguments;
    return {
      content: [
        {
          type: "text",
          text: `Exchange available: ${args.exchange != null}, Args: ${Object.keys(argumentsMap).length}`,
        },
      ],
    };
  }

  @McpTool({
    name: "progress-token-tool",
    description: "Tool with progress token",
  })
  progressTokenTool(args: McpToolMethodArguments): CallToolResult {
    const input = String(args.toolArguments.input);
    const token =
      args.progressToken == null ? "null" : String(args.progressToken);
    return {
      content: [
        {
          type: "text",
          text: `Input: ${input}, Progress Token: ${token}`,
        },
      ],
    };
  }

  @McpTool({
    name: "structured-output-tool",
    description: "Tool with structured output",
  })
  structuredOutputTool(args: McpToolMethodArguments): {
    message: string;
    value: number;
  } {
    const input = args.toolArguments.input;
    return {
      message: input != null ? String(input) : "default",
      value: 42,
    };
  }

  @McpTool({ name: "meta-tool", description: "Tool with meta parameter" })
  metaTool(args: McpToolMethodArguments): string {
    const input = String(args.toolArguments.input);
    const metaInfo = JSON.stringify(args.meta.meta);
    return `Input: ${input}, Meta: ${metaInfo}`;
  }

  @McpTool({
    name: "simple-mono-tool",
    description: "Hello World Reactive Tool returning Mono<String>",
  })
  async simpleMonoTool(args: McpToolMethodArguments): Promise<string> {
    return Promise.resolve(`Processed: ${String(args.toolArguments.input)}`);
  }

  @McpTool({ name: "void-tool", description: "Tool with void return" })
  voidTool(_args: McpToolMethodArguments): void {
    // Do nothing
  }
}

function createCallback(
  provider: TestToolProvider,
  propertyKey: keyof TestToolProvider,
  returnMode: ReturnMode,
  returnSchema?: StandardSchemaWithJsonSchema | null,
): McpToolMethodCallback {
  const structuredReturnSchema =
    returnSchema ??
    (returnMode === ReturnMode.STRUCTURED
      ? (z.any() as StandardSchemaWithJsonSchema)
      : null);

  return new McpToolMethodCallback({
    provider,
    propertyKey,
    returnMode,
    returnSchema: structuredReturnSchema,
  });
}

function createRequest(
  toolName: string,
  argumentsMap: Record<string, unknown>,
  meta?: Record<string, unknown>,
): CallToolRequest {
  return {
    params: {
      name: toolName,
      arguments: argumentsMap,
      ...(meta == null ? {} : { _meta: meta }),
    },
  } as unknown as CallToolRequest;
}

function createMockExchange(
  context: McpTransportContext = McpTransportContext.EMPTY,
): McpServerExchange {
  return Object.assign(Object.create(McpServerExchange.prototype), {
    transportContext: () => context,
  }) as McpServerExchange;
}

function textOf(result: CallToolResult): string {
  const block = result.content[0];
  if (block && "text" in block && typeof block.text === "string") {
    return block.text;
  }
  return "";
}
