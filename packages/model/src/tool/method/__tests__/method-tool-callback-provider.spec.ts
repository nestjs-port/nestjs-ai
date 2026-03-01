import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { type ToolContext, ToolContextSchema } from "../../../chat";
import { Tool } from "../../annotation";
import { ToolExecutionException } from "../../execution";
import { MethodToolCallbackProvider } from "../method-tool-callback-provider";

class WeatherTools {
  @Tool({
    name: "getWeather",
    description: "Get weather by city",
    parameters: z.object({ city: z.string() }),
    returns: z.object({ temperature: z.number() }),
  })
  getWeather(input: { city: string }) {
    return { temperature: input.city.length };
  }
}

class DuplicateToolA {
  @Tool({
    name: "duplicateTool",
    parameters: z.object({ input: z.string() }),
    returns: z.string(),
  })
  run(input: { input: string }): string {
    return input.input;
  }
}

class DuplicateToolB {
  @Tool({
    name: "duplicateTool",
    parameters: z.object({ input: z.string() }),
    returns: z.string(),
  })
  run(input: { input: string }): string {
    return input.input;
  }
}

class NoToolMethods {
  run(): void {}
}

class ContextOnlyTools {
  @Tool({
    name: "contextOnly",
    parameters: z.object({ toolContext: ToolContextSchema }),
    returns: z.string(),
  })
  contextOnly(input: { toolContext: ToolContext }) {
    const _context = input.toolContext;
    return "ok";
  }
}

class TupleWithContextTools {
  @Tool({
    name: "objectWithContext",
    parameters: z.object({
      name: z.string(),
      toolContext: ToolContextSchema,
      count: z.number(),
    }),
    returns: z.string(),
  })
  objectWithContext(input: {
    name: string;
    toolContext: ToolContext;
    count: number;
  }): string {
    const _context = input.toolContext;
    return `${input.name}:${input.count}`;
  }
}

describe("MethodToolCallbackProvider", () => {
  it("builds method callbacks from @Tool metadata", async () => {
    const provider = new MethodToolCallbackProvider([new WeatherTools()]);

    const callbacks = provider.toolCallbacks;

    expect(callbacks).toHaveLength(1);
    expect(callbacks[0].toolDefinition.name).toBe("getWeather");
    expect(callbacks[0].toolDefinition.description).toBe("Get weather by city");

    const inputSchema = JSON.parse(callbacks[0].toolDefinition.inputSchema) as {
      type?: string;
    };
    expect(inputSchema.type).toBe("object");

    const result = await callbacks[0].call('{"city":"seoul"}');
    expect(JSON.parse(result)).toEqual({ temperature: 5 });
  });

  it("throws when tool names are duplicated", () => {
    expect(
      () =>
        new MethodToolCallbackProvider([
          new DuplicateToolA(),
          new DuplicateToolB(),
        ]),
    ).toThrowError(/Multiple tools with the same name \(duplicateTool\)/);
  });

  it("throws when no @Tool annotated methods exist", () => {
    expect(
      () => new MethodToolCallbackProvider([new NoToolMethods()]),
    ).toThrowError(/No @Tool annotated methods found/);
  });

  it("wraps zod input parsing failures as ToolExecutionException", async () => {
    const provider = new MethodToolCallbackProvider([new WeatherTools()]);

    const callback = provider.toolCallbacks[0];

    let thrown: unknown;
    try {
      await callback.call('{"city":123}');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ToolExecutionException);
  });

  it("supports ToolContextSchema in object input schema", () => {
    const provider = new MethodToolCallbackProvider([new ContextOnlyTools()]);
    const callback = provider.toolCallbacks[0];
    const inputSchema = JSON.parse(callback.toolDefinition.inputSchema) as {
      properties?: Record<string, unknown>;
      type?: string;
    };

    expect(inputSchema.type).toBe("object");
    expect(inputSchema.properties).toHaveProperty("toolContext");
  });

  it("supports ToolContextSchema in mixed object input schema", () => {
    const provider = new MethodToolCallbackProvider([
      new TupleWithContextTools(),
    ]);
    const callback = provider.toolCallbacks[0];
    const inputSchema = JSON.parse(callback.toolDefinition.inputSchema) as {
      properties?: Record<string, { type?: string }>;
      required?: string[];
      type?: string;
    };

    expect(inputSchema.type).toBe("object");
    expect(inputSchema.required).toEqual(["name", "toolContext", "count"]);
    expect(inputSchema.properties?.name?.type).toBe("string");
    expect(inputSchema.properties?.count?.type).toBe("number");
    expect(inputSchema.properties).toHaveProperty("toolContext");
  });
});
