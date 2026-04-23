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
import { z } from "zod";
import { ToolContext, ToolContextSchema } from "../../../chat/index.js";
import { DefaultToolDefinition } from "../../definition/index.js";
import type { ToolCallResultConverter } from "../../execution/index.js";
import { MethodToolCallback } from "../method-tool-callback.js";

class TestGenericClass {
  static readonly STATIC_PREFIX = "STATIC";

  processStringList(input: { strings: string[] }): string {
    const { strings } = input;
    return `${strings.length} strings processed: [${strings.join(", ")}]`;
  }

  processStringIntMap(input: { map: Record<string, number> }): string {
    const { map } = input;
    return `${Object.keys(map).length} entries processed: ${formatMap(map)}`;
  }

  processListOfMaps(input: { listOfMaps: Record<string, number>[] }): string {
    const { listOfMaps } = input;
    return `${listOfMaps.length} maps processed: [${listOfMaps
      .map((map) => formatMap(map))
      .join(", ")}]`;
  }

  processStringListInToolContext(input: { toolContext: ToolContext }): string {
    const context = input.toolContext.context;
    return `${Object.keys(context).length} entries processed ${formatMap(context)}`;
  }

  static processStaticListWithThis(input: { strings: string[] }): string {
    return `${TestGenericClass.STATIC_PREFIX}:${input.strings.join("|")}`;
  }
}

function formatMap(map: Record<string, unknown>): string {
  return `{${Object.entries(map)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(", ")}}`;
}

describe("MethodToolCallbackGenericTypes", () => {
  it("passes tool result schema to converter", async () => {
    const seen: { returnType: unknown | null } = { returnType: null };
    const converter: ToolCallResultConverter = {
      async convert(result?: unknown | null, returnType?: unknown | null) {
        seen.returnType = returnType ?? null;
        return JSON.stringify(result);
      },
    };

    const toolDefinition = DefaultToolDefinition.builder()
      .name("withResultSchema")
      .description("with result schema")
      .inputSchema("{}")
      .build();

    const callback = MethodToolCallback.builder()
      .toolDefinition(toolDefinition)
      .toolMethod(() => "ok")
      .toolInputSchema(z.object({}))
      .toolResultSchema(z.string())
      .toolCallResultConverter(converter)
      .build();

    const result = await callback.call("{}");

    expect(JSON.parse(result)).toBe("ok");
    expect(
      (
        seen.returnType as {
          _zod?: { def?: { type?: unknown } };
        }
      )?._zod?.def?.type,
    ).toBe("string");
  });

  it("test generic list type", async () => {
    // Create a test object with a method that takes a List<String>
    const testObject = new TestGenericClass();

    // Create a tool definition
    const toolDefinition = DefaultToolDefinition.builder()
      .name("processStringList")
      .description("Process a list of strings")
      .inputSchema("{}")
      .build();

    // Create a MethodToolCallback
    const callback = MethodToolCallback.builder()
      .toolDefinition(toolDefinition)
      .toolMethod(testObject.processStringList)
      .toolObject(testObject)
      .toolInputSchema(z.object({ strings: z.array(z.string()) }))
      .build();

    // Create a JSON input with a list of strings
    const toolInput = `
      {"strings": ["one", "two", "three"]}
    `;

    // Call the tool
    const result = await callback.call(toolInput);

    // Verify the result
    expect(JSON.parse(result)).toBe("3 strings processed: [one, two, three]");
  });

  it("test generic map type", async () => {
    // Create a test object with a method that takes a Map<String, Integer>
    const testObject = new TestGenericClass();

    // Create a tool definition
    const toolDefinition = DefaultToolDefinition.builder()
      .name("processStringIntMap")
      .description("Process a map of string to integer")
      .inputSchema("{}")
      .build();

    // Create a MethodToolCallback
    const callback = MethodToolCallback.builder()
      .toolDefinition(toolDefinition)
      .toolMethod(testObject.processStringIntMap)
      .toolObject(testObject)
      .toolInputSchema(z.object({ map: z.record(z.string(), z.number()) }))
      .build();

    // Create a JSON input with a map of string to integer
    const toolInput = `
      {"map": {"one": 1, "two": 2, "three": 3}}
    `;

    // Call the tool
    const result = await callback.call(toolInput);

    // Verify the result
    expect(JSON.parse(result)).toBe(
      "3 entries processed: {one=1, two=2, three=3}",
    );
  });

  it("test nested generic type", async () => {
    // Create a test object with a method that takes a List<Map<String, Integer>>
    const testObject = new TestGenericClass();

    // Create a tool definition
    const toolDefinition = DefaultToolDefinition.builder()
      .name("processListOfMaps")
      .description("Process a list of maps")
      .inputSchema("{}")
      .build();

    // Create a MethodToolCallback
    const callback = MethodToolCallback.builder()
      .toolDefinition(toolDefinition)
      .toolMethod(testObject.processListOfMaps)
      .toolObject(testObject)
      .toolInputSchema(
        z.object({
          listOfMaps: z.array(z.record(z.string(), z.number())),
        }),
      )
      .build();

    // Create a JSON input with a list of maps
    const toolInput = `
      {
        "listOfMaps": [
          {"a": 1, "b": 2},
          {"c": 3, "d": 4}
        ]
      }
    `;

    // Call the tool
    const result = await callback.call(toolInput);

    // Verify the result
    expect(JSON.parse(result)).toBe(
      "2 maps processed: [{a=1, b=2}, {c=3, d=4}]",
    );
  });

  it("test tool context type", async () => {
    // Create a test object with a method that takes context in object input
    const testObject = new TestGenericClass();

    // Create a tool definition
    const toolDefinition = DefaultToolDefinition.builder()
      .name("processToolContext")
      .description("Process tool context")
      .inputSchema("{}")
      .build();

    // Create a MethodToolCallback
    const callback = MethodToolCallback.builder()
      .toolDefinition(toolDefinition)
      .toolMethod(testObject.processStringListInToolContext)
      .toolObject(testObject)
      .toolInputSchema(
        z.object({
          toolContext: ToolContextSchema,
        }),
      )
      .build();

    // Create a JSON input without tool context.
    // Tool context is provided via the runtime argument.
    const toolInput = `
      {}
    `;

    // Call the tool
    const result = await callback.call(
      toolInput,
      new ToolContext({ foo: "bar" }),
    );

    // Verify the result
    expect(JSON.parse(result)).toBe("1 entries processed {foo=bar}");
  });

  it("throws when required tool context is missing", async () => {
    const testObject = new TestGenericClass();

    const toolDefinition = DefaultToolDefinition.builder()
      .name("processToolContext")
      .description("Process tool context")
      .inputSchema("{}")
      .build();

    const callback = MethodToolCallback.builder()
      .toolDefinition(toolDefinition)
      .toolMethod(testObject.processStringListInToolContext)
      .toolObject(testObject)
      .toolInputSchema(
        z.object({
          toolContext: ToolContextSchema,
        }),
      )
      .build();

    await expect(callback.call("{}")).rejects.toThrow(
      "ToolContext is required by the method as an argument",
    );
  });

  it("prefers runtime tool context over input toolContext field", async () => {
    const testObject = new TestGenericClass();

    const toolDefinition = DefaultToolDefinition.builder()
      .name("processToolContext")
      .description("Process tool context")
      .inputSchema("{}")
      .build();

    const callback = MethodToolCallback.builder()
      .toolDefinition(toolDefinition)
      .toolMethod(testObject.processStringListInToolContext)
      .toolObject(testObject)
      .toolInputSchema(
        z.object({
          toolContext: ToolContextSchema,
        }),
      )
      .build();

    const result = await callback.call(
      '{"toolContext":{"foo":"input","env":"input"}}',
      new ToolContext({ foo: "runtime" }),
    );

    expect(JSON.parse(result)).toBe("1 entries processed {foo=runtime}");
  });

  it("test static method using this", async () => {
    const toolDefinition = DefaultToolDefinition.builder()
      .name("processStaticListWithThis")
      .description("Process static list with this binding")
      .inputSchema("{}")
      .build();

    const callback = MethodToolCallback.builder()
      .toolDefinition(toolDefinition)
      .toolMethod(TestGenericClass.processStaticListWithThis)
      .toolObject(TestGenericClass)
      .toolInputSchema(z.object({ strings: z.array(z.string()) }))
      .build();

    const result = await callback.call('{"strings":["one", "two"]}');

    expect(JSON.parse(result)).toBe("STATIC:one|two");
  });
});
