import { describe, expect, it, vi } from "vitest";
import { AssistantMessage } from "../../messages";
import { Prompt } from "../../prompt";
import { ChatModel } from "../chat-model";
import { ChatResponse } from "../chat-response";
import { Generation } from "../generation";

/**
 * Test implementation of ChatModel for testing purposes.
 */
class TestChatModel extends ChatModel {
	constructor(
		private readonly callImplementation: (
			prompt: Prompt,
		) => Promise<ChatResponse>,
	) {
		super();
	}

	async call(prompt: Prompt): Promise<ChatResponse> {
		return this.callImplementation(prompt);
	}
}

describe("ChatModel", () => {
	it("generate with string calls generate with prompt and returns response correctly", async () => {
		const userMessage = "Zero Wing";
		const responseMessage = "All your bases are belong to us";

		const mockAssistantMessage = new AssistantMessage({
			content: responseMessage,
			media: [],
		});

		const generation = new Generation({
			assistantMessage: mockAssistantMessage,
		});

		const response = new ChatResponse({
			generations: [generation],
		});

		const callSpy = vi.fn<(prompt: Prompt) => Promise<ChatResponse>>();
		callSpy.mockImplementation((prompt: Prompt) => {
			expect(prompt).toBeDefined();
			expect(prompt.contents).toBe(userMessage);
			return Promise.resolve(response);
		});

		const chatModel = new TestChatModel(callSpy);

		const result = await chatModel.callString(userMessage);

		expect(result).toBe(responseMessage);
		expect(callSpy).toHaveBeenCalledTimes(1);
		expect(callSpy).toHaveBeenCalledWith(expect.any(Prompt));
	});

	it("generate with empty string returns empty response", async () => {
		const userMessage = "";
		const responseMessage = "";

		const mockAssistantMessage = new AssistantMessage({
			content: responseMessage,
			media: [],
		});

		const generation = new Generation({
			assistantMessage: mockAssistantMessage,
		});

		const response = new ChatResponse({
			generations: [generation],
		});

		const callSpy = vi.fn<(prompt: Prompt) => Promise<ChatResponse>>();
		callSpy.mockResolvedValue(response);

		const chatModel = new TestChatModel(callSpy);

		const result = await chatModel.callString(userMessage);

		expect(result).toBe(responseMessage);
		expect(callSpy).toHaveBeenCalledTimes(1);
		expect(callSpy).toHaveBeenCalledWith(expect.any(Prompt));
	});

	it("generate with whitespace only string handles correctly", async () => {
		const userMessage = "   \t\n   ";
		const responseMessage = "I received whitespace input";

		const mockAssistantMessage = new AssistantMessage({
			content: responseMessage,
			media: [],
		});

		const generation = new Generation({
			assistantMessage: mockAssistantMessage,
		});

		const response = new ChatResponse({
			generations: [generation],
		});

		const callSpy = vi.fn<(prompt: Prompt) => Promise<ChatResponse>>();
		callSpy.mockResolvedValue(response);

		const chatModel = new TestChatModel(callSpy);

		const result = await chatModel.callString(userMessage);

		expect(result).toBe(responseMessage);
		expect(callSpy).toHaveBeenCalledTimes(1);
	});

	it("generate when prompt call throws exception propagates correctly", async () => {
		const userMessage = "Test message";
		const expectedException = new Error("API call failed");

		const callSpy = vi.fn<(prompt: Prompt) => Promise<ChatResponse>>();
		callSpy.mockRejectedValue(expectedException);

		const chatModel = new TestChatModel(callSpy);

		await expect(chatModel.callString(userMessage)).rejects.toThrow(
			expectedException,
		);

		expect(callSpy).toHaveBeenCalledTimes(1);
		expect(callSpy).toHaveBeenCalledWith(expect.any(Prompt));
	});

	it("generate when response is null handles gracefully", async () => {
		const userMessage = "Test message";

		const callSpy = vi.fn<(prompt: Prompt) => Promise<ChatResponse>>();
		callSpy.mockResolvedValue(null as unknown as ChatResponse);

		const chatModel = new TestChatModel(callSpy);

		await expect(chatModel.callString(userMessage)).rejects.toThrow();

		expect(callSpy).toHaveBeenCalledTimes(1);
		expect(callSpy).toHaveBeenCalledWith(expect.any(Prompt));
	});

	it("generate when assistant message is null handles gracefully", async () => {
		const userMessage = "Test message";

		// Empty generations array results in null result
		const response = new ChatResponse({
			generations: [],
		});

		const callSpy = vi.fn<(prompt: Prompt) => Promise<ChatResponse>>();
		callSpy.mockResolvedValue(response);

		const chatModel = new TestChatModel(callSpy);

		const result = await chatModel.callString(userMessage);

		expect(result).toBeNull();
		expect(callSpy).toHaveBeenCalledTimes(1);
	});

	it("generate when assistant message text is null returns null", async () => {
		const userMessage = "Test message";

		const mockAssistantMessage = new AssistantMessage({
			content: null,
			media: [],
		});

		const generation = new Generation({
			assistantMessage: mockAssistantMessage,
		});

		const response = new ChatResponse({
			generations: [generation],
		});

		const callSpy = vi.fn<(prompt: Prompt) => Promise<ChatResponse>>();
		callSpy.mockResolvedValue(response);

		const chatModel = new TestChatModel(callSpy);

		const result = await chatModel.callString(userMessage);

		expect(result).toBeNull();
		expect(callSpy).toHaveBeenCalledTimes(1);
	});

	it("generate with multiline string handles correctly", async () => {
		const userMessage = "Line 1\nLine 2\r\nLine 3\rLine 4";
		const responseMessage = "Multiline input processed";

		const mockAssistantMessage = new AssistantMessage({
			content: responseMessage,
			media: [],
		});

		const generation = new Generation({
			assistantMessage: mockAssistantMessage,
		});

		const response = new ChatResponse({
			generations: [generation],
		});

		const callSpy = vi.fn<(prompt: Prompt) => Promise<ChatResponse>>();
		callSpy.mockResolvedValue(response);

		const chatModel = new TestChatModel(callSpy);

		const result = await chatModel.callString(userMessage);

		expect(result).toBe(responseMessage);
		expect(callSpy).toHaveBeenCalledTimes(1);
	});

	it("generate multiple times with same client maintains state", async () => {
		const callSpy = vi.fn<(prompt: Prompt) => Promise<ChatResponse>>();

		const setupMockResponse = (responseText: string) => {
			const mockAssistantMessage = new AssistantMessage({
				content: responseText,
				media: [],
			});

			const generation = new Generation({
				assistantMessage: mockAssistantMessage,
			});

			const response = new ChatResponse({
				generations: [generation],
			});

			callSpy.mockResolvedValue(response);
		};

		const chatModel = new TestChatModel(callSpy);

		// First call
		setupMockResponse("Response 1");
		const result1 = await chatModel.callString("Message 1");
		expect(result1).toBe("Response 1");

		// Second call
		setupMockResponse("Response 2");
		const result2 = await chatModel.callString("Message 2");
		expect(result2).toBe("Response 2");

		expect(callSpy).toHaveBeenCalledTimes(2);
	});
});
