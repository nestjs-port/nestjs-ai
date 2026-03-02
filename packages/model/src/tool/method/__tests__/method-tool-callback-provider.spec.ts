import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { Tool, type ToolAnnotationMetadata } from "../../annotation";
import { MethodToolCallbackProvider } from "../method-tool-callback-provider";

class ValidToolObject {
  @Tool({
    returns: z.string(),
  })
  validTool() {
    return "Valid tool result";
  }
}

class NoToolAnnotatedMethodObject {
  notATool() {
    return "Not a tool";
  }
}

class DuplicateToolNameObject {
  @Tool({
    name: "validTool",
    returns: z.string(),
  })
  validTool() {
    return "Duplicate tool result";
  }
}

class ObjectTypeToolMethodsObject {
  @Tool({
    name: "objectTool",
    returns: z.unknown(),
  })
  objectTool(): unknown {
    return "Object tool result";
  }
}

class ToolUseEnhanceToolObject {
  @EnhanceTool({ description: "enhance tool", returns: z.string() })
  enhanceTool() {
    return "enhance tool result";
  }
}

abstract class TestObjectClass<T> {
  abstract test(input: T): string;
}

class TestObjectSuperClass extends TestObjectClass<{ input: string }> {
  @Tool({
    parameters: z.object({ input: z.string() }),
    returns: z.string(),
  })
  test(input: { input: string }): string {
    return input.input;
  }
}

class UseEnhanceToolMixedToolMethodsObject {
  @EnhanceTool({ returns: z.string() })
  validTool() {
    return "Valid tool result";
  }

  @EnhanceTool({
    parameters: z.object({ input: z.string() }),
    returns: z.unknown(),
  })
  functionTool(input: { input: string }) {
    return (value: string) => `Function result: ${input.input}:${value}`;
  }
}

interface EnhanceToolOptions extends ToolAnnotationMetadata {
  enhanceValue?: string;
}

function EnhanceTool(options: EnhanceToolOptions = {}): MethodDecorator {
  const { enhanceValue: _enhanceValue, ...toolOptions } = options;
  const decorateTool = Tool as unknown as (
    toolOptions: ToolAnnotationMetadata,
  ) => MethodDecorator;
  return decorateTool(toolOptions);
}

describe("MethodToolCallbackProvider", () => {
  it("when tool object has tool annotated method then succeed", () => {
    const provider = new MethodToolCallbackProvider([new ValidToolObject()]);

    const callbacks = provider.toolCallbacks;
    expect(callbacks).toHaveLength(1);
    expect(callbacks[0].toolDefinition.name).toBe("validTool");
  });

  it("when tool object has no tool annotated method then throw", () => {
    expect(
      () => new MethodToolCallbackProvider([new NoToolAnnotatedMethodObject()]),
    ).toThrowError(/No @Tool annotated methods found in/);
  });

  it("when multiple tool objects with same tool name then throw", () => {
    expect(
      () =>
        new MethodToolCallbackProvider([
          new ValidToolObject(),
          new DuplicateToolNameObject(),
        ]),
    ).toThrowError(
      /Multiple tools with the same name \(validTool\) found in sources/,
    );
  });

  it("when tool object has object type method then success", () => {
    const provider = new MethodToolCallbackProvider([
      new ObjectTypeToolMethodsObject(),
    ]);
    const callbacks = provider.toolCallbacks;

    expect(callbacks).toHaveLength(1);
    expect(callbacks[0].toolDefinition.name).toBe("objectTool");
  });

  it("when tool object has enhance tool annotated method then succeed", () => {
    const provider = new MethodToolCallbackProvider([
      new ToolUseEnhanceToolObject(),
    ]);
    const callbacks = provider.toolCallbacks;

    expect(callbacks).toHaveLength(1);
    expect(callbacks[0].toolDefinition.name).toBe("enhanceTool");
    expect(callbacks[0].toolDefinition.description).toBe("enhance tool");
  });

  it("build tools with bridge method return only user declared methods", () => {
    const provider = new MethodToolCallbackProvider([
      new TestObjectSuperClass(),
    ]);
    const callbacks = provider.toolCallbacks;

    expect(callbacks).toHaveLength(1);
    expect(callbacks[0].constructor.name).toBe("MethodToolCallback");
  });

  it("when enhance tool object has mix of valid and function type methods then include both in current ts behavior", () => {
    const provider = new MethodToolCallbackProvider([
      new UseEnhanceToolMixedToolMethodsObject(),
    ]);
    const callbacks = provider.toolCallbacks;

    expect(callbacks).toHaveLength(2);
    expect(callbacks.map((callback) => callback.toolDefinition.name)).toEqual([
      "validTool",
      "functionTool",
    ]);
  });
});
