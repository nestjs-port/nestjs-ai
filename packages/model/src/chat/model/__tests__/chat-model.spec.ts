import { describe, expect, it, vi } from "vitest";
import { AssistantMessage } from "../../messages";
import { Prompt } from "../../prompt";
import { ChatModel } from "../chat-model";
import { ChatResponse } from "../chat-response";
import { Generation } from "../generation";

/**
 * Test implementation of ChatModel for testing purposes.
 * This is a common pattern for testing abstract classes in vitest.
 */
class TestChatModel extends ChatModel {
	async call(_prompt: Prompt): Promise<ChatResponse> {
		// Default implementation - will be mocked using vi.spyOn()
		throw new Error("call method should be mocked");
	}
}

/**
 * Helper function to create a mock ChatResponse with the given text.
 */
function createMockResponse(responseText: string | null): ChatResponse {
	const mockAssistantMessage = new AssistantMessage({
		content: responseText,
		media: [],
	});

	const generation = new Generation({
		assistantMessage: mockAssistantMessage,
	});

	return new ChatResponse({
		generations: [generation],
	});
}

describe("ChatModel", () => {
	it("generate with string calls generate with prompt and returns response correctly", async () => {
		const userMessage = "Zero Wing";
		const responseMessage = "All your bases are belong to us";

		const response = createMockResponse(responseMessage);

		const chatModel = new TestChatModel();
		const callSpy = vi
			.spyOn(chatModel, "call")
			.mockImplementation((prompt: Prompt) => {
				expect(prompt).toBeDefined();
				expect(prompt.contents).toBe(userMessage);
				return Promise.resolve(response);
			});

		const result = await chatModel.callString(userMessage);

		expect(result).toBe(responseMessage);
		expect(callSpy).toHaveBeenCalledTimes(1);
		expect(callSpy).toHaveBeenCalledWith(expect.any(Prompt));
	});

	it("generate with empty string returns empty response", async () => {
		const userMessage = "";
		const responseMessage = "";

		const response = createMockResponse(responseMessage);

		const chatModel = new TestChatModel();
		const callSpy = vi.spyOn(chatModel, "call").mockResolvedValue(response);

		const result = await chatModel.callString(userMessage);

		expect(result).toBe(responseMessage);
		expect(callSpy).toHaveBeenCalledTimes(1);
		expect(callSpy).toHaveBeenCalledWith(expect.any(Prompt));
	});

	it("generate with whitespace only string handles correctly", async () => {
		const userMessage = "   \t\n   ";
		const responseMessage = "I received whitespace input";

		const response = createMockResponse(responseMessage);

		const chatModel = new TestChatModel();
		const callSpy = vi.spyOn(chatModel, "call").mockResolvedValue(response);

		const result = await chatModel.callString(userMessage);

		expect(result).toBe(responseMessage);
		expect(callSpy).toHaveBeenCalledTimes(1);
	});

	it("generate when prompt call throws exception propagates correctly", async () => {
		const userMessage = "Test message";
		const expectedException = new Error("API call failed");

		const chatModel = new TestChatModel();
		const callSpy = vi
			.spyOn(chatModel, "call")
			.mockRejectedValue(expectedException);

		await expect(chatModel.callString(userMessage)).rejects.toThrow(
			expectedException,
		);

		expect(callSpy).toHaveBeenCalledTimes(1);
		expect(callSpy).toHaveBeenCalledWith(expect.any(Prompt));
	});

	it("generate when response is null handles gracefully", async () => {
		const userMessage = "Test message";

		const chatModel = new TestChatModel();
		const callSpy = vi
			.spyOn(chatModel, "call")
			.mockResolvedValue(null as unknown as ChatResponse);

		await expect(chatModel.callString(userMessage)).rejects.toThrow();

		expect(callSpy).toHaveBeenCalledTimes(1);
		expect(callSpy).toHaveBeenCalledWith(expect.any(Prompt));
	});

	it("generate when assistant message is null handles gracefully", async () => {
		const userMessage = "Test message";

		// Create a response with a generation that has null text
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

		const chatModel = new TestChatModel();
		const callSpy = vi.spyOn(chatModel, "call").mockResolvedValue(response);

		const result = await chatModel.callString(userMessage);

		expect(result).toBeNull();
		expect(callSpy).toHaveBeenCalledTimes(1);
	});

	it("generate when assistant message text is null returns null", async () => {
		const userMessage = "Test message";

		const response = createMockResponse(null);

		const chatModel = new TestChatModel();
		const callSpy = vi.spyOn(chatModel, "call").mockResolvedValue(response);

		const result = await chatModel.callString(userMessage);

		expect(result).toBeNull();
		expect(callSpy).toHaveBeenCalledTimes(1);
	});

	it("generate with multiline string handles correctly", async () => {
		const userMessage = "Line 1\nLine 2\r\nLine 3\rLine 4";
		const responseMessage = "Multiline input processed";

		const response = createMockResponse(responseMessage);

		const chatModel = new TestChatModel();
		const callSpy = vi.spyOn(chatModel, "call").mockResolvedValue(response);

		const result = await chatModel.callString(userMessage);

		expect(result).toBe(responseMessage);
		expect(callSpy).toHaveBeenCalledTimes(1);
	});

	it("generate multiple times with same client maintains state", async () => {
		const chatModel = new TestChatModel();
		const callSpy = vi.spyOn(chatModel, "call");

		// First call
		callSpy.mockResolvedValueOnce(createMockResponse("Response 1"));
		const result1 = await chatModel.callString("Message 1");
		expect(result1).toBe("Response 1");

		// Second call
		callSpy.mockResolvedValueOnce(createMockResponse("Response 2"));
		const result2 = await chatModel.callString("Message 2");
		expect(result2).toBe("Response 2");

		expect(callSpy).toHaveBeenCalledTimes(2);
	});
});
