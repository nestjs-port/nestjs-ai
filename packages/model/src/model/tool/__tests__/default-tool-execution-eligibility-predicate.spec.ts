import { describe, expect, it } from "vitest";
import {
	AssistantMessage,
	type ChatOptions,
	ChatResponse,
	DefaultChatOptions,
	Generation,
	type ToolCall,
} from "../../../chat";
import type { ToolCallback } from "../../../tool";
import { DefaultToolExecutionEligibilityPredicate } from "../default-tool-execution-eligibility-predicate";
import type { ToolCallingChatOptions } from "../tool-calling-chat-options.interface";

describe("DefaultToolExecutionEligibilityPredicate", () => {
	const predicate = new DefaultToolExecutionEligibilityPredicate();

	function createToolCallingChatOptions(
		internalToolExecutionEnabled: boolean | null,
	): ToolCallingChatOptions {
		return {
			DEFAULT_TOOL_EXECUTION_ENABLED: true,
			get toolCallbacks() {
				return [];
			},
			set toolCallbacks(_value: ToolCallback[]) {},
			get toolNames() {
				return new Set();
			},
			set toolNames(_value: Set<string>) {},
			get internalToolExecutionEnabled() {
				return internalToolExecutionEnabled;
			},
			set internalToolExecutionEnabled(_value: boolean | null) {},
			get toolContext() {
				return {};
			},
			set toolContext(_value: Record<string, unknown>) {},
			copy: () => createToolCallingChatOptions(internalToolExecutionEnabled),
		} as ToolCallingChatOptions;
	}

	it("when tool execution enabled and has tool calls", () => {
		const options = createToolCallingChatOptions(true);

		const toolCall: ToolCall = {
			id: "id1",
			type: "function",
			name: "testTool",
			arguments: "{}",
		};
		const assistantMessage = new AssistantMessage({
			content: "test",
			properties: {},
			toolCalls: [toolCall],
		});
		const chatResponse = new ChatResponse({
			generations: [new Generation({ assistantMessage })],
		});

		const result = predicate.test(options, chatResponse);
		expect(result).toBe(true);
	});

	it("when tool execution enabled and no tool calls", () => {
		const options = createToolCallingChatOptions(true);

		const assistantMessage = new AssistantMessage({ content: "test" });
		const chatResponse = new ChatResponse({
			generations: [new Generation({ assistantMessage })],
		});

		const result = predicate.test(options, chatResponse);
		expect(result).toBe(false);
	});

	it("when tool execution disabled and has tool calls", () => {
		const options = createToolCallingChatOptions(false);

		const toolCall: ToolCall = {
			id: "id1",
			type: "function",
			name: "testTool",
			arguments: "{}",
		};
		const assistantMessage = new AssistantMessage({
			content: "test",
			properties: {},
			toolCalls: [toolCall],
		});
		const chatResponse = new ChatResponse({
			generations: [new Generation({ assistantMessage })],
		});

		const result = predicate.test(options, chatResponse);
		expect(result).toBe(false);
	});

	it("when tool execution disabled and no tool calls", () => {
		const options = createToolCallingChatOptions(false);

		const assistantMessage = new AssistantMessage({ content: "test" });
		const chatResponse = new ChatResponse({
			generations: [new Generation({ assistantMessage })],
		});

		const result = predicate.test(options, chatResponse);
		expect(result).toBe(false);
	});

	it("when regular chat options and has tool calls", () => {
		const options: ChatOptions = new DefaultChatOptions();

		const toolCall: ToolCall = {
			id: "id1",
			type: "function",
			name: "testTool",
			arguments: "{}",
		};
		const assistantMessage = new AssistantMessage({
			content: "test",
			properties: {},
			toolCalls: [toolCall],
		});
		const chatResponse = new ChatResponse({
			generations: [new Generation({ assistantMessage })],
		});

		const result = predicate.test(options, chatResponse);
		expect(result).toBe(true);
	});

	it("when null chat response", () => {
		const options = createToolCallingChatOptions(true);

		const result = predicate.test(options, null as unknown as ChatResponse);
		expect(result).toBe(false);
	});

	it("when empty generations list", () => {
		const options = createToolCallingChatOptions(true);

		const chatResponse = new ChatResponse({ generations: [] });

		const result = predicate.test(options, chatResponse);
		expect(result).toBe(false);
	});

	it("when multiple generations with mixed tool calls", () => {
		const options = createToolCallingChatOptions(true);

		const toolCall: ToolCall = {
			id: "id1",
			type: "function",
			name: "testTool",
			arguments: "{}",
		};
		const messageWithToolCall = new AssistantMessage({
			content: "test1",
			properties: {},
			toolCalls: [toolCall],
		});
		const messageWithoutToolCall = new AssistantMessage({ content: "test2" });

		const chatResponse = new ChatResponse({
			generations: [
				new Generation({ assistantMessage: messageWithToolCall }),
				new Generation({ assistantMessage: messageWithoutToolCall }),
			],
		});

		const result = predicate.test(options, chatResponse);
		expect(result).toBe(true);
	});

	it("when multiple generations without tool calls", () => {
		const options = createToolCallingChatOptions(true);

		const message1 = new AssistantMessage({ content: "test1" });
		const message2 = new AssistantMessage({ content: "test2" });

		const chatResponse = new ChatResponse({
			generations: [
				new Generation({ assistantMessage: message1 }),
				new Generation({ assistantMessage: message2 }),
			],
		});

		const result = predicate.test(options, chatResponse);
		expect(result).toBe(false);
	});

	it("when assistant message has empty tool calls list", () => {
		const options = createToolCallingChatOptions(true);

		const assistantMessage = new AssistantMessage({
			content: "test",
			properties: {},
			toolCalls: [],
		});
		const chatResponse = new ChatResponse({
			generations: [new Generation({ assistantMessage })],
		});

		const result = predicate.test(options, chatResponse);
		expect(result).toBe(false);
	});

	it("when multiple tool calls present", () => {
		const options = createToolCallingChatOptions(true);

		const toolCall1: ToolCall = {
			id: "id1",
			type: "function",
			name: "testTool1",
			arguments: "{}",
		};
		const toolCall2: ToolCall = {
			id: "id2",
			type: "function",
			name: "testTool2",
			arguments: '{"param": "value"}',
		};
		const assistantMessage = new AssistantMessage({
			content: "test",
			properties: {},
			toolCalls: [toolCall1, toolCall2],
		});
		const chatResponse = new ChatResponse({
			generations: [new Generation({ assistantMessage })],
		});

		const result = predicate.test(options, chatResponse);
		expect(result).toBe(true);
	});
});
