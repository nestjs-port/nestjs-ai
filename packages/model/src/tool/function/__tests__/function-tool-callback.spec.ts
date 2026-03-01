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

  stringConsumer(): (input: string) => void {
    return (input) => {
      this.calledValue = input;
    };
  }

  stringBiFunction(): (input: string, context: ToolContext | null) => string {
    return (input, context) => {
      this.calledValue = input;
      this.calledToolContext = context;
      return `return value = ${input}`;
    };
  }

  stringFunction(): (input: string) => string {
    return (input) => {
      this.calledValue = input;
      return `return value = ${input}`;
    };
  }

  stringSupplier(): () => string {
    this.calledValue = "not params";
    return () => "return value = ";
  }

  throwRuntimeException(): (input: string) => void {
    return (_input) => {
      throw new Error("test exception");
    };
  }

  throwToolExecutionException(): (input: string) => void {
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
    const callback = FunctionToolCallback.builder<string, void>(
      "testTool",
      tool.stringConsumer(),
    )
      .toolMetadata(ToolMetadata.create({ returnDirect: true }))
      .description("test description")
      .inputType(z.string())
      .build();

    await callback.call('"test string param"');

    expect(tool.calledValue).toBe("test string param");
  });

  it("test bi function tool call", async () => {
    const tool = new TestFunctionTool();
    const callback = FunctionToolCallback.builder<string, string>(
      "testTool",
      tool.stringBiFunction(),
    )
      .toolMetadata(ToolMetadata.create({ returnDirect: true }))
      .description("test description")
      .inputType(z.string())
      .build();

    const toolContext = new ToolContext({ foo: "bar" });

    const callResult = await callback.call('"test string param"', toolContext);

    expect(tool.calledValue).toBe("test string param");
    expect(callResult).toBe('"return value = test string param"');
    expect(tool.calledToolContext).toBe(toolContext);
  });

  it("test function tool call", async () => {
    const tool = new TestFunctionTool();
    const callback = FunctionToolCallback.builder<string, string>(
      "testTool",
      tool.stringFunction(),
    )
      .toolMetadata(ToolMetadata.create({ returnDirect: true }))
      .description("test description")
      .inputType(z.string())
      .build();

    const toolContext = new ToolContext({});

    const callResult = await callback.call('"test string param"', toolContext);

    expect(tool.calledValue).toBe("test string param");
    expect(callResult).toBe('"return value = test string param"');
  });

  it("test supplier tool call", async () => {
    const tool = new TestFunctionTool();

    // Supplier overload ignores input at execution time, but the builder still requires a zod schema.
    const callback = FunctionToolCallback.builder<void, string>(
      "testTool",
      tool.stringSupplier(),
    )
      .toolMetadata(ToolMetadata.create({ returnDirect: true }))
      .description("test description")
      .inputType(z.string())
      .build();

    const toolContext = new ToolContext({});

    const callResult = await callback.call('"test string param"', toolContext);

    expect(tool.calledValue).toBe("not params");
    expect(callResult).toBe('"return value = "');
  });

  it("test throw runtime exception", async () => {
    const tool = new TestFunctionTool();
    const callback = FunctionToolCallback.builder<string, void>(
      "testTool",
      tool.throwRuntimeException(),
    )
      .toolMetadata(ToolMetadata.create({ returnDirect: true }))
      .description("test description")
      .inputType(z.string())
      .build();

    let thrown: unknown;
    try {
      await callback.call('"test string param"');
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
    const callback = FunctionToolCallback.builder<string, void>(
      "testTool",
      tool.throwToolExecutionException(),
    )
      .toolMetadata(ToolMetadata.create({ returnDirect: true }))
      .description("test description")
      .inputType(z.string())
      .build();

    let thrown: unknown;
    try {
      await callback.call('"test string param"');
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
    const callback = FunctionToolCallback.builder<string, void>(
      "testTool",
      tool.stringConsumer(),
    )
      .description("test empty string")
      .inputType(z.string())
      .build();

    await callback.call('""');

    expect(tool.calledValue).toBe("");
  });
});
