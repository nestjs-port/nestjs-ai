import type { ToolCallingManager } from "@nestjs-ai/model";
import {
	AssistantMessage,
	Prompt,
	ToolResponseMessage,
	UserMessage,
} from "@nestjs-ai/model";
import { describe, expect, it, vi } from "vitest";
import type { ToolCallingChatOptions } from "../chat.options";
import { GoogleGenAiToolCallingManager } from "../tools/tool.manager";

describe("GoogleGenAiToolCallingManager", () => {
	it("should be defined", () => {
		const delegate = {} as ToolCallingManager;
		const manager = new GoogleGenAiToolCallingManager(delegate);
		expect(manager).toBeDefined();
	});

	it("should resolve tool definitions and delegate", () => {
		const delegate = {
			resolveToolDefinitions: vi.fn().mockReturnValue([
				{
					name: "testTool",
					description: "test description",
					inputSchema: "{}",
				},
			]),
			executeToolCalls: vi.fn(),
		} as unknown as ToolCallingManager;

		const manager = new GoogleGenAiToolCallingManager(delegate);

		const options = {
			toolCallbacks: [
				{
					name: "testTool",
					description: "test description",
					execute: async () => "result",
				},
			],
			copy: () => options as any,
		} as ToolCallingChatOptions;

		const result = manager.resolveToolDefinitions(options);

		expect(delegate.resolveToolDefinitions).toHaveBeenCalledWith(options);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("testTool");
	});

	it("should execute tool calls and delegate", async () => {
		const delegate = {
			resolveToolDefinitions: vi.fn(),
			executeToolCalls: vi.fn().mockResolvedValue({
				conversationHistory: [
					new AssistantMessage({ content: "Calling tool..." }),
					new ToolResponseMessage({
						responses: [
							{ id: "call_1", name: "testTool", responseData: '"result"' },
						],
					}),
				],
				returnDirect: false,
			}),
		} as unknown as ToolCallingManager;

		const manager = new GoogleGenAiToolCallingManager(delegate);

		const prompt = new Prompt([UserMessage.of("Call test tool")]);
		const chatResponse = {
			results: [],
			metadata: {},
			result: null,
			hasToolCalls: () => true,
			getToolCalls: () => [],
			hasFinishReasons: () => false,
		} as any;

		const result = await manager.executeToolCalls(prompt, chatResponse);

		expect(delegate.executeToolCalls).toHaveBeenCalledWith(
			prompt,
			chatResponse,
		);
		expect(result.conversationHistory).toHaveLength(2);
		expect(result.returnDirect).toBe(false);
	});
});
