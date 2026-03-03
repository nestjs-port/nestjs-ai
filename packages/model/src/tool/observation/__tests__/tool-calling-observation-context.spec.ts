import { describe, expect, it } from "vitest";
import { ToolDefinition } from "../../definition";
import { ToolCallingObservationContext } from "../tool-calling-observation-context";

describe("ToolCallingObservationContext", () => {
  it("when mandatory request options then return", () => {
    const observationContext = new ToolCallingObservationContext({
      toolDefinition: createToolDefinition("toolA", "description", "{}"),
    });

    expect(observationContext).toBeDefined();
  });

  it("when tool arguments is null then return", () => {
    const observationContext = new ToolCallingObservationContext({
      toolDefinition: createToolDefinition("toolA", "description", "{}"),
      toolCallArguments: null,
    });

    expect(observationContext).toBeDefined();
    expect(observationContext.toolCallArguments).toBe("{}");
  });

  it("when tool arguments is not null then return", () => {
    const observationContext = new ToolCallingObservationContext({
      toolDefinition: createToolDefinition("toolA", "description", "{}"),
      toolCallArguments: "lizard",
    });

    expect(observationContext).toBeDefined();
    expect(observationContext.toolCallArguments).toBe("lizard");
  });

  it("when tool definition is null then throw", () => {
    expect(
      () =>
        new ToolCallingObservationContext({
          toolDefinition: null as unknown as ToolDefinition,
          toolCallArguments: "lizard",
        }),
    ).toThrow("toolDefinition cannot be null");
  });

  it("when tool metadata is null then use default metadata", () => {
    const observationContext = new ToolCallingObservationContext({
      toolDefinition: createToolDefinition("toolA", "description", "{}"),
      toolCallArguments: "lizard",
      toolMetadata: null as never,
    });

    expect(observationContext).toBeDefined();
    expect(observationContext.toolMetadata.returnDirect).toBe(false);
  });

  it("when tool arguments is empty string then return empty string", () => {
    const observationContext = new ToolCallingObservationContext({
      toolDefinition: createToolDefinition("toolA", "description", "{}"),
      toolCallArguments: "",
    });

    expect(observationContext).toBeDefined();
    expect(observationContext.toolCallArguments).toBe("");
  });

  it("when tool call result is null then return null", () => {
    const observationContext = new ToolCallingObservationContext({
      toolDefinition: createToolDefinition("toolA", "description", "{}"),
      toolCallResult: null,
    });

    expect(observationContext).toBeDefined();
    expect(observationContext.toolCallResult).toBeNull();
  });

  it("when tool call result is empty string then return empty string", () => {
    const observationContext = new ToolCallingObservationContext({
      toolDefinition: createToolDefinition("toolA", "description", "{}"),
      toolCallResult: "",
    });

    expect(observationContext).toBeDefined();
    expect(observationContext.toolCallResult).toBe("");
  });

  it("when tool definition is set then get returns it", () => {
    const toolDef = createToolDefinition(
      "testTool",
      "Test description",
      '{"type": "object"}',
    );

    const observationContext = new ToolCallingObservationContext({
      toolDefinition: toolDef,
    });

    expect(observationContext.toolDefinition).toBe(toolDef);
    expect(observationContext.toolDefinition.name).toBe("testTool");
    expect(observationContext.toolDefinition.description).toBe(
      "Test description",
    );
    expect(observationContext.toolDefinition.inputSchema).toBe(
      '{"type": "object"}',
    );
  });
});

function createToolDefinition(
  name: string,
  description: string,
  inputSchema: string,
): ToolDefinition {
  return ToolDefinition.builder()
    .name(name)
    .description(description)
    .inputSchema(inputSchema)
    .build();
}
