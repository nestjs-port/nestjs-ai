import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ToolContext } from "../../../chat";
import { DefaultToolDefinition } from "../../definition";
import { ToolExecutionException } from "../../execution";
import { ToolMetadata } from "../../metadata";
import { FunctionToolCallback } from "../function-tool-callback";

class TestFunctionTool {
  calledValue: unknown = null;

  calledToolContext: ToolContext | null = null;

  stringConsumer(): (input: { value: string }) => void {
    return (input) => {
      this.calledValue = input.value;
    };
  }

  stringBiFunction(): (
    input: { value: string },
    context: ToolContext | null,
  ) => string {
    return (input, context) => {
      this.calledValue = input.value;
      this.calledToolContext = context;
      return `return value = ${input.value}`;
    };
  }

  stringFunction(): (input: { value: string }) => string {
    return (input) => {
      this.calledValue = input.value;
      return `return value = ${input.value}`;
    };
  }

  stringSupplier(): () => string {
    this.calledValue = "not params";
    return () => "return value = ";
  }

  throwRuntimeException(): (input: { value: string }) => void {
    return (_input) => {
      throw new Error("test exception");
    };
  }

  throwToolExecutionException(): (input: { value: string }) => void {
    return (_input) => {
      throw new ToolExecutionException(
        new DefaultToolDefinition("test", "test", "{}"),
        new Error("test exception"),
      );
    };
  }
}

describe("FunctionToolCallback", () => {
  it("test consumer tool call", async () => {
    const tool = new TestFunctionTool();
    const callback = FunctionToolCallback.builder<{ value: string }, void>(
      "testTool",
      tool.stringConsumer(),
    )
      .toolMetadata(ToolMetadata.create({ returnDirect: true }))
      .description("test description")
      .inputType(z.object({ value: z.string() }))
      .build();

    await callback.call('{"value":"test string param"}');

    expect(tool.calledValue).toBe("test string param");
  });

  it("test bi function tool call", async () => {
    const tool = new TestFunctionTool();
    const callback = FunctionToolCallback.builder<{ value: string }, string>(
      "testTool",
      tool.stringBiFunction(),
    )
      .toolMetadata(ToolMetadata.create({ returnDirect: true }))
      .description("test description")
      .inputType(z.object({ value: z.string() }))
      .build();

    const toolContext = new ToolContext({ foo: "bar" });

    const callResult = await callback.call(
      '{"value":"test string param"}',
      toolContext,
    );

    expect(tool.calledValue).toBe("test string param");
    expect(callResult).toBe('"return value = test string param"');
    expect(tool.calledToolContext).toBe(toolContext);
  });

  it("test function tool call", async () => {
    const tool = new TestFunctionTool();
    const callback = FunctionToolCallback.builder<{ value: string }, string>(
      "testTool",
      tool.stringFunction(),
    )
      .toolMetadata(ToolMetadata.create({ returnDirect: true }))
      .description("test description")
      .inputType(z.object({ value: z.string() }))
      .build();

    const toolContext = new ToolContext({});

    const callResult = await callback.call(
      '{"value":"test string param"}',
      toolContext,
    );

    expect(tool.calledValue).toBe("test string param");
    expect(callResult).toBe('"return value = test string param"');
  });

  it("test supplier tool call", async () => {
    const tool = new TestFunctionTool();

    // Supplier overload ignores input at execution time, but the builder still requires a zod schema.
    const callback = FunctionToolCallback.builder<
      Record<string, never>,
      string
    >("testTool", tool.stringSupplier())
      .toolMetadata(ToolMetadata.create({ returnDirect: true }))
      .description("test description")
      .inputType(z.object({}))
      .build();

    const toolContext = new ToolContext({});

    const callResult = await callback.call("{}", toolContext);

    expect(tool.calledValue).toBe("not params");
    expect(callResult).toBe('"return value = "');
  });

  it("test throw runtime exception", async () => {
    const tool = new TestFunctionTool();
    const callback = FunctionToolCallback.builder<{ value: string }, void>(
      "testTool",
      tool.throwRuntimeException(),
    )
      .toolMetadata(ToolMetadata.create({ returnDirect: true }))
      .description("test description")
      .inputType(z.object({ value: z.string() }))
      .build();

    let thrown: unknown;
    try {
      await callback.call('{"value":"test string param"}');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ToolExecutionException);
    const exception = thrown as ToolExecutionException;
    expect(exception.message).toBe("test exception");
    expect(exception.cause).toBeInstanceOf(Error);
    expect(exception.toolDefinition).toBe(callback.toolDefinition);
  });

  it("test throw tool execution exception", async () => {
    const tool = new TestFunctionTool();
    const callback = FunctionToolCallback.builder<{ value: string }, void>(
      "testTool",
      tool.throwToolExecutionException(),
    )
      .toolMetadata(ToolMetadata.create({ returnDirect: true }))
      .description("test description")
      .inputType(z.object({ value: z.string() }))
      .build();

    let thrown: unknown;
    try {
      await callback.call('{"value":"test string param"}');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ToolExecutionException);
    const exception = thrown as ToolExecutionException;
    expect(exception.message).toBe("test exception");
    expect(exception.cause).toBeInstanceOf(Error);
  });

  it("test empty string input", async () => {
    const tool = new TestFunctionTool();
    const callback = FunctionToolCallback.builder<{ value: string }, void>(
      "testTool",
      tool.stringConsumer(),
    )
      .description("test empty string")
      .inputType(z.object({ value: z.string() }))
      .build();

    await callback.call('{"value":""}');

    expect(tool.calledValue).toBe("");
  });
});
