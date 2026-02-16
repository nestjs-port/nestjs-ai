import { describe, expect, it } from "vitest";
import {
  AssistantMessage,
  ChatResponse,
  Generation,
  type Message,
  MessageType,
  Prompt,
  type ToolCall,
  type ToolResponse,
  type ToolResponseMessage,
  UserMessage,
} from "../../../chat";
import type { ToolCallbackResolver } from "../../../tool";
import {
  DefaultToolDefinition,
  ToolCallback,
  ToolExecutionException,
  ToolMetadata,
} from "../../../tool";
import { DefaultToolCallingChatOptions } from "../default-tool-calling-chat-options";
import { DefaultToolCallingManager } from "../default-tool-calling-manager";

class TestToolCallback extends ToolCallback {
  private readonly _toolDefinition;
  private readonly _toolMetadata;

  constructor(name: string, returnDirect = false) {
    super();
    this._toolDefinition = DefaultToolDefinition.builder()
      .name(name)
      .inputSchema("{}")
      .build();
    this._toolMetadata = ToolMetadata.create({ returnDirect });
  }

  get toolDefinition() {
    return this._toolDefinition;
  }

  get toolMetadata() {
    return this._toolMetadata;
  }

  call(_toolInput: string): string {
    return "Mission accomplished!";
  }
}

class FailingToolCallback extends ToolCallback {
  private readonly _toolDefinition;

  constructor(name: string) {
    super();
    this._toolDefinition = DefaultToolDefinition.builder()
      .name(name)
      .inputSchema("{}")
      .build();
  }

  get toolDefinition() {
    return this._toolDefinition;
  }

  call(_toolInput: string): string {
    throw new ToolExecutionException(
      this._toolDefinition,
      new Error("You failed this city!"),
    );
  }
}

function createStaticResolver(callbacks: ToolCallback[]): ToolCallbackResolver {
  return {
    resolve: (toolName: string) =>
      callbacks.find((cb) => cb.toolDefinition.name === toolName) ?? null,
  };
}

function findToolResponseMessage(
  history: Message[],
): ToolResponseMessage | undefined {
  return history.find((msg) => msg.messageType === MessageType.TOOL) as
    | ToolResponseMessage
    | undefined;
}

describe("DefaultToolCallingManagerTests", () => {
  // BUILD

  it("when default arguments then return", () => {
    const manager = new DefaultToolCallingManager();
    expect(manager).not.toBeNull();
  });

  // RESOLVE TOOL DEFINITIONS

  it("when chat options is null then throw", () => {
    const manager = new DefaultToolCallingManager();
    expect(() =>
      manager.resolveToolDefinitions(
        null as unknown as DefaultToolCallingChatOptions,
      ),
    ).toThrow("chatOptions cannot be null");
  });

  it("when tool callback exists then resolve", () => {
    const toolCallback = new TestToolCallback("toolA");
    const resolver = createStaticResolver([toolCallback]);
    const manager = new DefaultToolCallingManager({
      toolCallbackResolver: resolver,
    });

    const toolDefinitions = manager.resolveToolDefinitions(
      DefaultToolCallingChatOptions.builder().toolNames("toolA").build(),
    );

    expect(toolDefinitions).toHaveLength(1);
    expect(toolDefinitions[0]).toEqual(toolCallback.toolDefinition);
  });

  it("when tool callback does not exist then throw", () => {
    const resolver = createStaticResolver([]);
    const manager = new DefaultToolCallingManager({
      toolCallbackResolver: resolver,
    });

    expect(() =>
      manager.resolveToolDefinitions(
        DefaultToolCallingChatOptions.builder().toolNames("toolB").build(),
      ),
    ).toThrow("No ToolCallback found for tool name: toolB");
  });

  // EXECUTE TOOL CALLS

  it("when prompt is null then throw", () => {
    const manager = new DefaultToolCallingManager();
    const chatResponse = new ChatResponse({ generations: [] });
    expect(() =>
      manager.executeToolCalls(null as unknown as Prompt, chatResponse),
    ).toThrow("prompt cannot be null");
  });

  it("when chat response is null then throw", () => {
    const manager = new DefaultToolCallingManager();
    const prompt = new Prompt("test");
    expect(() =>
      manager.executeToolCalls(prompt, null as unknown as ChatResponse),
    ).toThrow("chatResponse cannot be null");
  });

  it("when no tool call in chat response then throw", () => {
    const manager = new DefaultToolCallingManager();
    const prompt = new Prompt("test");
    const chatResponse = new ChatResponse({ generations: [] });
    expect(() => manager.executeToolCalls(prompt, chatResponse)).toThrow(
      "No tool call requested by the chat model",
    );
  });

  it("when single tool call in chat response then execute", () => {
    const toolCallback = new TestToolCallback("toolA");
    const resolver = createStaticResolver([toolCallback]);
    const manager = new DefaultToolCallingManager({
      toolCallbackResolver: resolver,
    });

    const prompt = new Prompt(
      UserMessage.of("Hello"),
      DefaultToolCallingChatOptions.builder().build(),
    );
    const toolCall: ToolCall = {
      id: "toolA",
      type: "function",
      name: "toolA",
      arguments: "{}",
    };
    const chatResponse = new ChatResponse({
      generations: [
        new Generation({
          assistantMessage: new AssistantMessage({
            content: "",
            properties: {},
            toolCalls: [toolCall],
          }),
        }),
      ],
    });

    const expectedToolResponse: ToolResponse = {
      id: "toolA",
      name: "toolA",
      responseData: "Mission accomplished!",
    };

    const result = manager.executeToolCalls(prompt, chatResponse);

    const toolResponseMsg = findToolResponseMessage(
      result.conversationHistory(),
    );
    expect(toolResponseMsg).toBeDefined();
    expect(toolResponseMsg?.responses).toEqual([expectedToolResponse]);
  });

  it("when single tool call with return direct in chat response then execute", () => {
    const toolCallback = new TestToolCallback("toolA", true);
    const resolver = createStaticResolver([toolCallback]);
    const manager = new DefaultToolCallingManager({
      toolCallbackResolver: resolver,
    });

    const prompt = new Prompt(
      UserMessage.of("Hello"),
      DefaultToolCallingChatOptions.builder().build(),
    );
    const toolCall: ToolCall = {
      id: "toolA",
      type: "function",
      name: "toolA",
      arguments: "{}",
    };
    const chatResponse = new ChatResponse({
      generations: [
        new Generation({
          assistantMessage: new AssistantMessage({
            content: "",
            properties: {},
            toolCalls: [toolCall],
          }),
        }),
      ],
    });

    const expectedToolResponse: ToolResponse = {
      id: "toolA",
      name: "toolA",
      responseData: "Mission accomplished!",
    };

    const result = manager.executeToolCalls(prompt, chatResponse);

    const toolResponseMsg = findToolResponseMessage(
      result.conversationHistory(),
    );
    expect(toolResponseMsg).toBeDefined();
    expect(toolResponseMsg?.responses).toEqual([expectedToolResponse]);
    expect(result.returnDirect()).toBe(true);
  });

  it("when multiple tool calls in chat response then execute", () => {
    const toolCallbackA = new TestToolCallback("toolA");
    const toolCallbackB = new TestToolCallback("toolB");
    const resolver = createStaticResolver([toolCallbackA, toolCallbackB]);
    const manager = new DefaultToolCallingManager({
      toolCallbackResolver: resolver,
    });

    const prompt = new Prompt(
      UserMessage.of("Hello"),
      DefaultToolCallingChatOptions.builder().build(),
    );
    const toolCallA: ToolCall = {
      id: "toolA",
      type: "function",
      name: "toolA",
      arguments: "{}",
    };
    const toolCallB: ToolCall = {
      id: "toolB",
      type: "function",
      name: "toolB",
      arguments: "{}",
    };
    const chatResponse = new ChatResponse({
      generations: [
        new Generation({
          assistantMessage: new AssistantMessage({
            content: "",
            properties: {},
            toolCalls: [toolCallA, toolCallB],
          }),
        }),
      ],
    });

    const expectedToolResponses: ToolResponse[] = [
      { id: "toolA", name: "toolA", responseData: "Mission accomplished!" },
      { id: "toolB", name: "toolB", responseData: "Mission accomplished!" },
    ];

    const result = manager.executeToolCalls(prompt, chatResponse);

    const toolResponseMsg = findToolResponseMessage(
      result.conversationHistory(),
    );
    expect(toolResponseMsg).toBeDefined();
    expect(toolResponseMsg?.responses).toEqual(expectedToolResponses);
  });

  it("when duplicate mixed tool calls in chat response then execute", () => {
    const manager = new DefaultToolCallingManager();

    const options = DefaultToolCallingChatOptions.builder()
      .toolCallbacks(new TestToolCallback("toolA"))
      .toolNames("toolA")
      .build();

    const prompt = new Prompt(UserMessage.of("Hello"), options);
    const toolCall: ToolCall = {
      id: "toolA",
      type: "function",
      name: "toolA",
      arguments: "{}",
    };
    const chatResponse = new ChatResponse({
      generations: [
        new Generation({
          assistantMessage: new AssistantMessage({
            content: "",
            properties: {},
            toolCalls: [toolCall],
          }),
        }),
      ],
    });

    const expectedToolResponse: ToolResponse = {
      id: "toolA",
      name: "toolA",
      responseData: "Mission accomplished!",
    };

    const result = manager.executeToolCalls(prompt, chatResponse);

    const toolResponseMsg = findToolResponseMessage(
      result.conversationHistory(),
    );
    expect(toolResponseMsg).toBeDefined();
    expect(toolResponseMsg?.responses).toEqual([expectedToolResponse]);
  });

  it("when multiple tool calls with return direct in chat response then execute", () => {
    const toolCallbackA = new TestToolCallback("toolA", true);
    const toolCallbackB = new TestToolCallback("toolB", true);
    const resolver = createStaticResolver([toolCallbackA, toolCallbackB]);
    const manager = new DefaultToolCallingManager({
      toolCallbackResolver: resolver,
    });

    const prompt = new Prompt(
      UserMessage.of("Hello"),
      DefaultToolCallingChatOptions.builder().build(),
    );
    const toolCallA: ToolCall = {
      id: "toolA",
      type: "function",
      name: "toolA",
      arguments: "{}",
    };
    const toolCallB: ToolCall = {
      id: "toolB",
      type: "function",
      name: "toolB",
      arguments: "{}",
    };
    const chatResponse = new ChatResponse({
      generations: [
        new Generation({
          assistantMessage: new AssistantMessage({
            content: "",
            properties: {},
            toolCalls: [toolCallA, toolCallB],
          }),
        }),
      ],
    });

    const expectedToolResponses: ToolResponse[] = [
      { id: "toolA", name: "toolA", responseData: "Mission accomplished!" },
      { id: "toolB", name: "toolB", responseData: "Mission accomplished!" },
    ];

    const result = manager.executeToolCalls(prompt, chatResponse);

    const toolResponseMsg = findToolResponseMessage(
      result.conversationHistory(),
    );
    expect(toolResponseMsg).toBeDefined();
    expect(toolResponseMsg?.responses).toEqual(expectedToolResponses);
    expect(result.returnDirect()).toBe(true);
  });

  it("when multiple tool calls with mixed return direct in chat response then execute", () => {
    const toolCallbackA = new TestToolCallback("toolA", true);
    const toolCallbackB = new TestToolCallback("toolB", false);
    const resolver = createStaticResolver([toolCallbackA, toolCallbackB]);
    const manager = new DefaultToolCallingManager({
      toolCallbackResolver: resolver,
    });

    const prompt = new Prompt(
      UserMessage.of("Hello"),
      DefaultToolCallingChatOptions.builder().build(),
    );
    const toolCallA: ToolCall = {
      id: "toolA",
      type: "function",
      name: "toolA",
      arguments: "{}",
    };
    const toolCallB: ToolCall = {
      id: "toolB",
      type: "function",
      name: "toolB",
      arguments: "{}",
    };
    const chatResponse = new ChatResponse({
      generations: [
        new Generation({
          assistantMessage: new AssistantMessage({
            content: "",
            properties: {},
            toolCalls: [toolCallA, toolCallB],
          }),
        }),
      ],
    });

    const expectedToolResponses: ToolResponse[] = [
      { id: "toolA", name: "toolA", responseData: "Mission accomplished!" },
      { id: "toolB", name: "toolB", responseData: "Mission accomplished!" },
    ];

    const result = manager.executeToolCalls(prompt, chatResponse);

    const toolResponseMsg = findToolResponseMessage(
      result.conversationHistory(),
    );
    expect(toolResponseMsg).toBeDefined();
    expect(toolResponseMsg?.responses).toEqual(expectedToolResponses);
    expect(result.returnDirect()).toBe(false);
  });

  it("when tool call with exception then return error", () => {
    const toolCallback = new FailingToolCallback("toolC");
    const resolver = createStaticResolver([toolCallback]);
    const manager = new DefaultToolCallingManager({
      toolCallbackResolver: resolver,
    });

    const prompt = new Prompt(
      UserMessage.of("Hello"),
      DefaultToolCallingChatOptions.builder().build(),
    );
    const toolCall: ToolCall = {
      id: "toolC",
      type: "function",
      name: "toolC",
      arguments: "{}",
    };
    const chatResponse = new ChatResponse({
      generations: [
        new Generation({
          assistantMessage: new AssistantMessage({
            content: "",
            properties: {},
            toolCalls: [toolCall],
          }),
        }),
      ],
    });

    const expectedToolResponse: ToolResponse = {
      id: "toolC",
      name: "toolC",
      responseData: "You failed this city!",
    };

    const result = manager.executeToolCalls(prompt, chatResponse);

    const toolResponseMsg = findToolResponseMessage(
      result.conversationHistory(),
    );
    expect(toolResponseMsg).toBeDefined();
    expect(toolResponseMsg?.responses).toEqual([expectedToolResponse]);
  });
});
