import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ToolContext, ToolContextSchema } from "../../../chat";
import { TOOL_METADATA_KEY, Tool, type ToolAnnotationMetadata } from "../index";

class SchemaRequiredExamples {
  @Tool()
  noArgsAndVoidReturn() {}

  // @ts-expect-error schema-less @Tool() only supports `() => void | Promise<void>`
  @Tool()
  hasInputWithoutSchema(_value: string) {}

  // @ts-expect-error schema-less @Tool() only supports `() => void | Promise<void>`
  @Tool()
  hasReturnWithoutSchema() {
    return "value";
  }

  // @ts-expect-error both parameters and returns schemas must be provided together
  @Tool({
    parameters: z.string(),
  })
  onlyParametersSchema(value: string) {
    return value;
  }

  // @ts-expect-error both parameters and returns schemas must be provided together
  @Tool({
    returns: z.string(),
  })
  onlyReturnsSchema(_value: string) {
    return "";
  }
}
void SchemaRequiredExamples;

class TypedToolExamples {
  @Tool({
    parameters: z.object({ city: z.string() }),
    returns: z.object({ temperature: z.number() }),
  })
  valid(_input: { city: string }) {
    return { temperature: 20 };
  }

  // @ts-expect-error input type must match the `parameters` schema type
  @Tool({
    parameters: z.object({ city: z.string() }),
    returns: z.object({ temperature: z.number() }),
  })
  invalidInput(_input: { city: number }) {
    return { temperature: 20 };
  }

  // @ts-expect-error return type must match the `returns` schema type
  @Tool({
    parameters: z.object({ city: z.string() }),
    returns: z.object({ temperature: z.number() }),
  })
  invalidReturn(_input: { city: string }) {
    return { temperature: "20" };
  }
}
void TypedToolExamples;

class AdvancedTypedToolExamples {
  @Tool({
    parameters: z.tuple([z.string(), z.number()]),
    returns: z.boolean(),
  })
  multiArgs(name: string, age: number) {
    return age > 18 && name.length > 0;
  }

  // @ts-expect-error tuple schema requires `(string, number)` method arguments
  @Tool({
    parameters: z.tuple([z.string(), z.number()]),
    returns: z.boolean(),
  })
  invalidMultiArgs(age: number, name: string) {
    return age > 18 && name.length > 0;
  }

  @Tool({
    parameters: z.number(),
    returns: z.number(),
  })
  primitiveInput(value: number) {
    return value + 1;
  }

  // @ts-expect-error primitive schema requires number input
  @Tool({
    parameters: z.number(),
    returns: z.number(),
  })
  invalidPrimitiveInput(value: string) {
    return value.length;
  }

  @Tool({
    parameters: z.string(),
    returns: z.instanceof(Buffer),
  })
  bufferReturn(value: string) {
    return Buffer.from(value);
  }

  // @ts-expect-error return type must be Buffer
  @Tool({
    parameters: z.string(),
    returns: z.instanceof(Buffer),
  })
  invalidBufferReturn(value: string) {
    return value;
  }

  @Tool({
    parameters: z.string(),
    returns: z.instanceof(Readable),
  })
  streamReturn(value: string) {
    return Readable.from([value]);
  }

  // @ts-expect-error return type must be Readable
  @Tool({
    parameters: z.string(),
    returns: z.instanceof(Readable),
  })
  invalidStreamReturn(value: string) {
    return Buffer.from(value);
  }

  @Tool({
    parameters: z.array(z.string()),
    returns: z.number(),
  })
  arrayInput(values: string[]) {
    return values.length;
  }

  // @ts-expect-error array schema requires a single array argument, not rest arguments
  @Tool({
    parameters: z.array(z.string()),
    returns: z.number(),
  })
  invalidArrayInput(...values: string[]) {
    return values.length;
  }

  @Tool({
    parameters: z.object({ city: z.string().optional() }),
    returns: z.boolean(),
  })
  optionalFieldInSchema(input: { city?: string }) {
    return Boolean(input.city);
  }

  // @ts-expect-error optional method parameter does not match required schema input
  @Tool({
    parameters: z.object({ city: z.string() }),
    returns: z.boolean(),
  })
  optionalMethodArgWithRequiredSchema(input?: { city: string }) {
    return Boolean(input?.city);
  }

  // @ts-expect-error required method input does not match optional schema input
  @Tool({
    parameters: z.object({ city: z.string().optional() }),
    returns: z.boolean(),
  })
  requiredMethodArgWithOptionalSchema(input: { city: string }) {
    return Boolean(input.city);
  }
}
void AdvancedTypedToolExamples;

class ToolContextTypedExamples {
  @Tool({
    parameters: ToolContextSchema,
    returns: z.string(),
  })
  validToolContextInput(context: ToolContext) {
    return JSON.stringify(context.context);
  }

  // @ts-expect-error input type must match ToolContextSchema (ToolContext instance)
  @Tool({
    parameters: ToolContextSchema,
    returns: z.string(),
  })
  invalidToolContextInput(context: { context: Record<string, unknown> }) {
    return JSON.stringify(context.context);
  }
}
void ToolContextTypedExamples;

describe("ToolDecorator", () => {
  class TestTools {
    @Tool({
      name: "getWeather",
      parameters: z.object({ city: z.string() }),
      returns: z.object({ temperature: z.number() }),
    })
    getWeather(input: { city: string }) {
      return { temperature: input.city.length };
    }
  }

  it("stores zod parameter and return schemas in metadata", () => {
    const metadata = Reflect.getMetadata(
      TOOL_METADATA_KEY,
      TestTools.prototype,
      "getWeather",
    ) as ToolAnnotationMetadata;

    expect(metadata.parameters).toBeDefined();
    expect(metadata.returns).toBeDefined();
    expect(
      metadata.parameters?.safeParse({ city: "seoul" }).success,
    ).toBeTruthy();
    expect(
      metadata.returns?.safeParse({ temperature: 18 }).success,
    ).toBeTruthy();
  });

  it("supports ToolContextSchema in tool metadata", () => {
    class ContextTools {
      @Tool({
        name: "contextEcho",
        parameters: ToolContextSchema,
        returns: z.string(),
      })
      contextEcho(context: ToolContext) {
        return JSON.stringify(context.context);
      }
    }

    const metadata = Reflect.getMetadata(
      TOOL_METADATA_KEY,
      ContextTools.prototype,
      "contextEcho",
    ) as ToolAnnotationMetadata;

    expect(metadata.parameters).toBeDefined();
    expect(
      metadata.parameters?.safeParse(new ToolContext({ foo: "bar" })).success,
    ).toBeTruthy();
    expect(
      metadata.parameters?.safeParse({ context: { foo: "bar" } }).success,
    ).toBeFalsy();
  });
});
