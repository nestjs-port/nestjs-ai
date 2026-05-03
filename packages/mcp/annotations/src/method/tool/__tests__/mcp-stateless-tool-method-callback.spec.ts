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

import { McpTransportContext } from "../../../context/index.js";
import { McpTool } from "../../../mcp-tool.js";
import { McpStatelessToolMethodCallback } from "../mcp-stateless-tool-method-callback.js";
import type { McpToolMethodArguments } from "../mcp-tool-method-arguments.js";
import { ReturnMode } from "../return-mode.js";

describe("McpStatelessToolMethodCallback", () => {
  it("testSimpleToolCallback", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "simpleTool", ReturnMode.TEXT);

    const context = McpTransportContext.EMPTY;
    const request = createRequest("simple-tool", { input: "test message" });

    const result = await callback.apply(context, request);

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Processed: test message",
    });
  });

  it("testMathToolCallback", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "addNumbers", ReturnMode.TEXT);

    const result = await callback.apply(
      McpTransportContext.EMPTY,
      createRequest("math-tool", { a: 5, b: 3 }),
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({ type: "text", text: "8" });
  });

  it("testComplexToolCallback", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "complexTool", ReturnMode.TEXT);

    const result = await callback.apply(
      McpTransportContext.EMPTY,
      createRequest("complex-tool", { name: "John", age: 30, active: true }),
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Name: John, Age: 30, Active: true",
    });
  });

  it("testToolWithContextParameter", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(
      provider,
      "toolWithContext",
      ReturnMode.TEXT,
    );

    const result = await callback.apply(
      McpTransportContext.EMPTY,
      createRequest("context-tool", { message: "hello" }),
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Context tool: hello",
    });
  });

  it("testToolWithListParameter", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "processList", ReturnMode.TEXT);

    const result = await callback.apply(
      McpTransportContext.EMPTY,
      createRequest("list-tool", { items: ["item1", "item2", "item3"] }),
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Items: item1, item2, item3",
    });
  });

  it("testToolWithObjectParameter", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "processObject", ReturnMode.TEXT);

    const result = await callback.apply(
      McpTransportContext.EMPTY,
      createRequest("object-tool", { obj: { name: "test", value: 42 } }),
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Object: test - 42",
    });
  });

  it("testToolWithNoParameters", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "noParamsTool", ReturnMode.TEXT);

    const result = await callback.apply(
      McpTransportContext.EMPTY,
      createRequest("no-params-tool", {}),
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "No parameters needed",
    });
  });

  it("testToolWithEnumParameter", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "enumTool", ReturnMode.TEXT);

    const result = await callback.apply(
      McpTransportContext.EMPTY,
      createRequest("enum-tool", { enumValue: "OPTION_B" }),
    );

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

    const result = await callback.apply(
      McpTransportContext.EMPTY,
      createRequest("primitive-types-tool", {
        flag: true,
        b: 1,
        s: 2,
        i: 3,
        l: 4,
        f: 5.5,
        d: 6.6,
      }),
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Primitives: true, 1, 2, 3, 4, 5.5, 6.6",
    });
  });

  it("testToolWithNullParameters", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "simpleTool", ReturnMode.TEXT);

    const result = await callback.apply(
      McpTransportContext.EMPTY,
      createRequest("simple-tool", { input: null }),
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Processed: null",
    });
  });

  it("testToolWithMissingParameters", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "simpleTool", ReturnMode.TEXT);

    const result = await callback.apply(
      McpTransportContext.EMPTY,
      createRequest("simple-tool", {}),
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Processed: null",
    });
  });

  it("testToolThatThrowsException", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "exceptionTool", ReturnMode.TEXT);

    const result = await callback.apply(
      McpTransportContext.EMPTY,
      createRequest("exception-tool", { input: "test" }),
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("Tool execution failed: test");
  });

  it("testToolThatReturnsNull", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(
      provider,
      "nullReturnTool",
      ReturnMode.TEXT,
    );

    const result = await callback.apply(
      McpTransportContext.EMPTY,
      createRequest("null-return-tool", {}),
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({ type: "text", text: "null" });
  });

  it("testNullRequest", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "simpleTool", ReturnMode.TEXT);

    await expect(
      callback.apply(McpTransportContext.EMPTY, null as never),
    ).rejects.toThrow("Request must not be null");
  });

  it("testCallbackReturnsCallToolResult", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "complexTool", ReturnMode.TEXT);

    const result = await callback.apply(
      McpTransportContext.EMPTY,
      createRequest("complex-tool", {
        name: "Alice",
        age: 25,
        active: false,
      }),
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Name: Alice, Age: 25, Active: false",
    });
  });

  it("testConstructorParameters", () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "simpleTool", ReturnMode.TEXT);

    expect(callback).not.toBeNull();
  });

  it("testToolReturningComplexObject", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(
      provider,
      "returnObjectTool",
      ReturnMode.STRUCTURED,
    );

    const result = await callback.apply(
      McpTransportContext.EMPTY,
      createRequest("return-object-tool", { name: "test", value: 42 }),
    );

    expect(result.isError).toBeFalsy();
    // For complex return types (non-primitive, non-wrapper, non-CallToolResult),
    // the new implementation should return structured content
    expect(result.content).toHaveLength(0);
    expect(result.structuredContent).toMatchObject({ name: "test", value: 42 });
  });

  it("testToolReturningStructuredComplexListObject", async () => {
    // Sanity check that the stateful callback can be exercised similarly; the Java
    // counterpart cross-tests the sync stateful callback here.
    const provider = new TestToolProvider();
    const callback = createCallback(
      provider,
      "returnListObjectTool",
      ReturnMode.STRUCTURED,
    );

    const result = await callback.apply(
      McpTransportContext.EMPTY,
      createRequest("return-list-object-tool", { name: "test", value: 42 }),
    );

    expect(result.isError).toBeFalsy();
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

  it("testVoidReturnMode", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "voidTool", ReturnMode.VOID);

    const result = await callback.apply(
      McpTransportContext.EMPTY,
      createRequest("void-tool", { input: "test" }),
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({ type: "text", text: '"Done"' });
  });

  it("testToolWithCallToolRequest", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(
      provider,
      "toolWithCallToolRequest",
      ReturnMode.TEXT,
    );

    const result = await callback.apply(
      McpTransportContext.EMPTY,
      createRequest("call-tool-request-tool", {
        param1: "value1",
        param2: "value2",
      }),
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Received tool: call-tool-request-tool with 2 arguments",
    });
  });

  it("testToolWithMixedParams", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(
      provider,
      "toolWithMixedParams",
      ReturnMode.TEXT,
    );

    const result = await callback.apply(
      McpTransportContext.EMPTY,
      createRequest("mixed-params-tool", { action: "process" }),
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Action: process, Tool: mixed-params-tool",
    });
  });

  it("testToolWithContextAndRequest", async () => {
    const provider = new TestToolProvider();
    const callback = createCallback(
      provider,
      "toolWithContextAndRequest",
      ReturnMode.TEXT,
    );

    const result = await callback.apply(
      McpTransportContext.EMPTY,
      createRequest("context-and-request-tool", {}),
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: "Context present, Tool: context-and-request-tool",
    });
  });

  it("testStatelessMetaParameterInjection", async () => {
    // Test that args.meta receives the meta from request in stateless context
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "metaTool", ReturnMode.TEXT);

    const result = await callback.apply(
      McpTransportContext.EMPTY,
      createRequest(
        "meta-tool",
        { input: "test-input" },
        { userId: "user123", sessionId: "session456" },
      ),
    );

    expect(result.isError).toBeFalsy();
    expect(textOf(result)).toContain("Input: test-input");
    expect(textOf(result)).toContain(
      'Meta: {"userId":"user123","sessionId":"session456"',
    );
  });

  it("testStatelessMetaParameterWithNullMeta", async () => {
    // Test that args.meta handles null meta in stateless context
    const provider = new TestToolProvider();
    const callback = createCallback(provider, "metaTool", ReturnMode.TEXT);

    const result = await callback.apply(
      McpTransportContext.EMPTY,
      createRequest("meta-tool", { input: "test-input" }),
    );

    expect(result.isError).toBeFalsy();
    expect(textOf(result)).toBe("Input: test-input, Meta: {}");
  });
});

class TestToolProvider {
  @McpTool({ name: "simple-tool", description: "A simple tool" })
  simpleTool(args: McpToolMethodArguments): string {
    const input = args.arguments.input;
    return `Processed: ${input == null ? "null" : String(input)}`;
  }

  @McpTool({ name: "math-tool", description: "A math tool" })
  addNumbers(args: McpToolMethodArguments): number {
    return Number(args.arguments.a) + Number(args.arguments.b);
  }

  @McpTool({ name: "complex-tool", description: "A complex tool" })
  complexTool(args: McpToolMethodArguments): CallToolResult {
    const name = String(args.arguments.name);
    const age = Number(args.arguments.age);
    const active = Boolean(args.arguments.active);
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
    name: "context-tool",
    description: "Tool with context parameter",
  })
  toolWithContext(args: McpToolMethodArguments): string {
    void args.context;
    return `Context tool: ${String(args.arguments.message)}`;
  }

  @McpTool({ name: "list-tool", description: "Tool with list parameter" })
  processList(args: McpToolMethodArguments): string {
    const items = args.arguments.items as string[];
    return `Items: ${items.join(", ")}`;
  }

  @McpTool({ name: "object-tool", description: "Tool with object parameter" })
  processObject(args: McpToolMethodArguments): string {
    const obj = args.arguments.obj as { name: string; value: number };
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
    throw new Error(`Tool execution failed: ${String(args.arguments.input)}`);
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
    return `Enum: ${String(args.arguments.enumValue)}`;
  }

  @McpTool({
    name: "primitive-types-tool",
    description: "Tool with primitive types",
  })
  primitiveTypesTool(args: McpToolMethodArguments): string {
    const flag = Boolean(args.arguments.flag);
    const b = Number(args.arguments.b);
    const s = Number(args.arguments.s);
    const i = Number(args.arguments.i);
    const l = Number(args.arguments.l);
    const f = Number(args.arguments.f);
    const d = Number(args.arguments.d);
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
      name: String(args.arguments.name),
      value: Number(args.arguments.value),
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
        name: String(args.arguments.name),
        value: Number(args.arguments.value),
      },
    ];
  }

  @McpTool({ name: "void-tool", description: "Tool with void return" })
  voidTool(_args: McpToolMethodArguments): void {
    // Do nothing
  }

  @McpTool({
    name: "call-tool-request-tool",
    description: "Tool with CallToolRequest parameter",
  })
  toolWithCallToolRequest(args: McpToolMethodArguments): string {
    const argSize = Object.keys(args.arguments).length;
    return `Received tool: ${args.request.params.name} with ${argSize} arguments`;
  }

  @McpTool({
    name: "mixed-params-tool",
    description: "Tool with mixed parameters",
  })
  toolWithMixedParams(args: McpToolMethodArguments): string {
    return `Action: ${String(args.arguments.action)}, Tool: ${args.request.params.name}`;
  }

  @McpTool({
    name: "context-and-request-tool",
    description: "Tool with context and request",
  })
  toolWithContextAndRequest(args: McpToolMethodArguments): string {
    return `Context present, Tool: ${args.request.params.name}`;
  }

  @McpTool({ name: "meta-tool", description: "Tool with meta parameter" })
  metaTool(args: McpToolMethodArguments): string {
    const input = String(args.arguments.input);
    const metaInfo = JSON.stringify(args.meta.meta);
    return `Input: ${input}, Meta: ${metaInfo}`;
  }
}

function createCallback(
  provider: TestToolProvider,
  propertyKey: keyof TestToolProvider,
  returnMode: ReturnMode,
): McpStatelessToolMethodCallback {
  return new McpStatelessToolMethodCallback({
    provider,
    propertyKey,
    returnMode,
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

function textOf(result: CallToolResult): string {
  const block = result.content[0];
  if (block && "text" in block && typeof block.text === "string") {
    return block.text;
  }
  return "";
}
