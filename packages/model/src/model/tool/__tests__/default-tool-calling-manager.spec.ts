import { describe, expect, it } from "vitest";
import {
  AssistantMessage,
  ChatResponse,
  Generation,
  Prompt,
  type ToolCall,
  UserMessage,
} from "../../../chat";
import type { ToolCallbackResolver } from "../../../tool";
import {
  DefaultToolDefinition,
  ToolCallback,
  ToolMetadata,
} from "../../../tool";
import { DefaultToolCallingManager } from "../default-tool-calling-manager";

function createMockToolCallback(
  name: string,
  description: string,
  inputSchema: string,
  callFn: (toolInput: string) => string,
): ToolCallback {
  return new (class extends ToolCallback {
    get toolDefinition() {
      return DefaultToolDefinition.builder()
        .name(name)
        .description(description)
        .inputSchema(inputSchema)
        .build();
    }

    get toolMetadata() {
      return ToolMetadata.create({});
    }

    call(toolInput: string): string {
      return callFn(toolInput);
    }
  })();
}

describe("DefaultToolCallingManager", () => {
  it("should handle null arguments in stream mode", () => {
    const mockToolCallback = createMockToolCallback(
      "testTool",
      "A test tool",
      "{}",
      (toolInput: string) => {
        expect(toolInput).not.toBeNull();
        expect(toolInput).not.toBe("");
        return '{"result": "success"}';
      },
    );

    const toolCall: ToolCall = {
      id: "1",
      type: "function",
      name: "testTool",
      arguments: null as unknown as string,
    };

    const assistantMessage = new AssistantMessage({
      content: "",
      properties: {},
      toolCalls: [toolCall],
    });
    const generation = new Generation({ assistantMessage });
    const chatResponse = new ChatResponse({ generations: [generation] });

    const prompt = new Prompt([UserMessage.of("test")]);

    const resolver: ToolCallbackResolver = {
      resolve: (toolName: string) =>
        toolName === "testTool" ? mockToolCallback : null,
    };

    const manager = new DefaultToolCallingManager({
      toolCallbackResolver: resolver,
    });

    expect(() => manager.executeToolCalls(prompt, chatResponse)).not.toThrow();
  });

  it("should handle empty arguments in stream mode", () => {
    const mockToolCallback = createMockToolCallback(
      "testTool",
      "A test tool",
      "{}",
      (toolInput: string) => {
        expect(toolInput).not.toBeNull();
        expect(toolInput).not.toBe("");
        return '{"result": "success"}';
      },
    );

    const toolCall: ToolCall = {
      id: "1",
      type: "function",
      name: "testTool",
      arguments: "",
    };

    const assistantMessage = new AssistantMessage({
      content: "",
      properties: {},
      toolCalls: [toolCall],
    });
    const generation = new Generation({ assistantMessage });
    const chatResponse = new ChatResponse({ generations: [generation] });

    const prompt = new Prompt([UserMessage.of("test")]);

    const resolver: ToolCallbackResolver = {
      resolve: (toolName: string) =>
        toolName === "testTool" ? mockToolCallback : null,
    };

    const manager = new DefaultToolCallingManager({
      toolCallbackResolver: resolver,
    });

    expect(() => manager.executeToolCalls(prompt, chatResponse)).not.toThrow();
  });

  it("should handle multiple tool calls in single response", () => {
    const toolCallback1 = createMockToolCallback(
      "tool1",
      "First tool",
      '{"type": "object", "properties": {"param": {"type": "string"}}}',
      () => '{"result": "tool1_success"}',
    );

    const toolCallback2 = createMockToolCallback(
      "tool2",
      "Second tool",
      '{"type": "object", "properties": {"value": {"type": "number"}}}',
      () => '{"result": "tool2_success"}',
    );

    const toolCall1: ToolCall = {
      id: "1",
      type: "function",
      name: "tool1",
      arguments: '{"param": "test"}',
    };
    const toolCall2: ToolCall = {
      id: "2",
      type: "function",
      name: "tool2",
      arguments: '{"value": 42}',
    };

    const assistantMessage = new AssistantMessage({
      content: "",
      properties: {},
      toolCalls: [toolCall1, toolCall2],
    });
    const generation = new Generation({ assistantMessage });
    const chatResponse = new ChatResponse({ generations: [generation] });

    const prompt = new Prompt([UserMessage.of("test multiple tools")]);

    const resolver: ToolCallbackResolver = {
      resolve: (toolName: string) => {
        if (toolName === "tool1") return toolCallback1;
        if (toolName === "tool2") return toolCallback2;
        return null;
      },
    };

    const manager = new DefaultToolCallingManager({
      toolCallbackResolver: resolver,
    });

    expect(() => manager.executeToolCalls(prompt, chatResponse)).not.toThrow();
  });

  it("should handle tool call with complex json arguments", () => {
    const complexToolCallback = createMockToolCallback(
      "complexTool",
      "A tool with complex JSON input",
      '{"type": "object", "properties": {"nested": {"type": "object"}}}',
      (toolInput: string) => {
        expect(toolInput).toContain("nested");
        expect(toolInput).toContain("array");
        return '{"result": "processed"}';
      },
    );

    const complexJson =
      '{"nested": {"level1": {"level2": "value"}}, "array": [1, 2, 3]}';
    const toolCall: ToolCall = {
      id: "1",
      type: "function",
      name: "complexTool",
      arguments: complexJson,
    };

    const assistantMessage = new AssistantMessage({
      content: "",
      properties: {},
      toolCalls: [toolCall],
    });
    const generation = new Generation({ assistantMessage });
    const chatResponse = new ChatResponse({ generations: [generation] });

    const prompt = new Prompt([UserMessage.of("test complex json")]);

    const resolver: ToolCallbackResolver = {
      resolve: (toolName: string) =>
        toolName === "complexTool" ? complexToolCallback : null,
    };

    const manager = new DefaultToolCallingManager({
      toolCallbackResolver: resolver,
    });

    expect(() => manager.executeToolCalls(prompt, chatResponse)).not.toThrow();
  });

  it("should handle tool call with malformed json", () => {
    const toolCallback = createMockToolCallback(
      "testTool",
      "Test tool",
      "{}",
      (toolInput: string) => {
        expect(toolInput).not.toBeNull();
        return '{"result": "handled"}';
      },
    );

    const toolCall: ToolCall = {
      id: "1",
      type: "function",
      name: "testTool",
      arguments: "{invalid json}",
    };

    const assistantMessage = new AssistantMessage({
      content: "",
      properties: {},
      toolCalls: [toolCall],
    });
    const generation = new Generation({ assistantMessage });
    const chatResponse = new ChatResponse({ generations: [generation] });

    const prompt = new Prompt([UserMessage.of("test malformed json")]);

    const resolver: ToolCallbackResolver = {
      resolve: (toolName: string) =>
        toolName === "testTool" ? toolCallback : null,
    };

    const manager = new DefaultToolCallingManager({
      toolCallbackResolver: resolver,
    });

    expect(() => manager.executeToolCalls(prompt, chatResponse)).not.toThrow();
  });

  it("should handle tool call returning null", () => {
    const toolCallback = createMockToolCallback(
      "nullReturningTool",
      "Tool that returns null",
      "{}",
      () => null as unknown as string,
    );

    const toolCall: ToolCall = {
      id: "1",
      type: "function",
      name: "nullReturningTool",
      arguments: "{}",
    };

    const assistantMessage = new AssistantMessage({
      content: "",
      properties: {},
      toolCalls: [toolCall],
    });
    const generation = new Generation({ assistantMessage });
    const chatResponse = new ChatResponse({ generations: [generation] });

    const prompt = new Prompt([UserMessage.of("test null return")]);

    const resolver: ToolCallbackResolver = {
      resolve: (toolName: string) =>
        toolName === "nullReturningTool" ? toolCallback : null,
    };

    const manager = new DefaultToolCallingManager({
      toolCallbackResolver: resolver,
    });

    expect(() => manager.executeToolCalls(prompt, chatResponse)).not.toThrow();
  });

  it("should handle multiple generations with tool calls", () => {
    const toolCallback = createMockToolCallback(
      "multiGenTool",
      "Tool for multiple generations",
      "{}",
      () => '{"result": "success"}',
    );

    const toolCall1: ToolCall = {
      id: "1",
      type: "function",
      name: "multiGenTool",
      arguments: "{}",
    };
    const toolCall2: ToolCall = {
      id: "2",
      type: "function",
      name: "multiGenTool",
      arguments: "{}",
    };

    const assistantMessage1 = new AssistantMessage({
      content: "",
      properties: {},
      toolCalls: [toolCall1],
    });
    const assistantMessage2 = new AssistantMessage({
      content: "",
      properties: {},
      toolCalls: [toolCall2],
    });

    const generation1 = new Generation({ assistantMessage: assistantMessage1 });
    const generation2 = new Generation({ assistantMessage: assistantMessage2 });

    const chatResponse = new ChatResponse({
      generations: [generation1, generation2],
    });

    const prompt = new Prompt([UserMessage.of("test multiple generations")]);

    const resolver: ToolCallbackResolver = {
      resolve: (toolName: string) =>
        toolName === "multiGenTool" ? toolCallback : null,
    };

    const manager = new DefaultToolCallingManager({
      toolCallbackResolver: resolver,
    });

    expect(() => manager.executeToolCalls(prompt, chatResponse)).not.toThrow();
  });
});
