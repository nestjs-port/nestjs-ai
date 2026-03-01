import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ToolContext, ToolContextSchema } from "../../../chat";
import { DefaultToolDefinition } from "../../definition";
import { MethodToolCallback } from "../method-tool-callback";

class TestGenericClass {
  static readonly STATIC_PREFIX = "STATIC";

  processStringList(strings: string[]): string {
    return `${strings.length} strings processed: [${strings.join(", ")}]`;
  }

  processStringIntMap(map: Record<string, number>): string {
    return `${Object.keys(map).length} entries processed: ${formatMap(map)}`;
  }

  processListOfMaps(listOfMaps: Record<string, number>[]): string {
    return `${listOfMaps.length} maps processed: [${listOfMaps
      .map((map) => formatMap(map))
      .join(", ")}]`;
  }

  processStringListInToolContext(toolContext: ToolContext): string {
    const context = toolContext.context;
    return `${Object.keys(context).length} entries processed ${formatMap(context)}`;
  }

  processMultiArgsWithToolContext(
    name: string,
    toolContext: ToolContext,
    count: number,
  ): string {
    return `${name}:${count}:${formatMap(toolContext.context)}`;
  }

  static processStaticListWithThis(strings: string[]): string {
    return `${TestGenericClass.STATIC_PREFIX}:${strings.join("|")}`;
  }
}

function formatMap(map: Record<string, unknown>): string {
  return `{${Object.entries(map)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(", ")}}`;
}

describe("MethodToolCallbackGenericTypes", () => {
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
      .toolInputSchema(z.array(z.string()))
      .build();

    // Create a JSON input with a list of strings
    const toolInput = `
      ["one", "two", "three"]
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
      .toolInputSchema(z.record(z.string(), z.number()))
      .build();

    // Create a JSON input with a map of string to integer
    const toolInput = `
      {"one": 1, "two": 2, "three": 3}
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
      .toolInputSchema(z.array(z.record(z.string(), z.number())))
      .build();

    // Create a JSON input with a list of maps
    const toolInput = `
      [
        {"a": 1, "b": 2},
        {"c": 3, "d": 4}
      ]
    `;

    // Call the tool
    const result = await callback.call(toolInput);

    // Verify the result
    expect(JSON.parse(result)).toBe(
      "2 maps processed: [{a=1, b=2}, {c=3, d=4}]",
    );
  });

  it("test tool context type", async () => {
    // Create a test object with a method that takes a List<Map<String, Integer>>
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
      .toolInputSchema(ToolContextSchema)
      .build();

    // Create an empty JSON input
    const toolInput = `
      {}
    `;

    // Create a toolContext
    const toolContext = new ToolContext({ foo: "bar" });

    // Call the tool
    const result = await callback.call(toolInput, toolContext);

    // Verify the result
    expect(JSON.parse(result)).toBe("1 entries processed {foo=bar}");
  });

  it("test multiple args with tool context in tuple", async () => {
    const testObject = new TestGenericClass();

    const toolDefinition = DefaultToolDefinition.builder()
      .name("processMultiArgsWithToolContext")
      .description("Process tuple args with tool context")
      .inputSchema("{}")
      .build();

    const callback = MethodToolCallback.builder()
      .toolDefinition(toolDefinition)
      .toolMethod(testObject.processMultiArgsWithToolContext)
      .toolObject(testObject)
      .toolInputSchema(z.tuple([z.string(), ToolContextSchema, z.number()]))
      .build();

    const toolInput = `
      ["alpha", null, 7]
    `;
    const toolContext = new ToolContext({ foo: "bar", env: "dev" });

    const result = await callback.call(toolInput, toolContext);

    expect(JSON.parse(result)).toBe("alpha:7:{foo=bar, env=dev}");
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
      .toolInputSchema(z.array(z.string()))
      .build();

    const result = await callback.call('["one", "two"]');

    expect(JSON.parse(result)).toBe("STATIC:one|two");
  });
});
