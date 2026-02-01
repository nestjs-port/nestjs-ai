import type {
	GenerateContentResult,
	GenerativeModel,
	GoogleGenerativeAI,
} from "@google/generative-ai";
import { Prompt, UserMessage } from "@nestjs-ai/model";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { GoogleGenAiChatModel } from "../chat.model";
import { GoogleGenAiChatOptions } from "../chat.options";

vi.mock("@google/generative-ai");

describe("GoogleGenAiChatModel", () => {
	let chatModel: GoogleGenAiChatModel;
	let mockClient: GoogleGenerativeAI;
	let mockGenerativeModel: GenerativeModel;

	beforeEach(() => {
		mockGenerativeModel = {
			generateContent: vi.fn(),
			generateContentStream: vi.fn(),
		} as unknown as GenerativeModel;

		mockClient = {
			apiKey: "test-api-key",
			getGenerativeModel: vi.fn().mockReturnValue(mockGenerativeModel),
			getCachedContentManager: vi.fn().mockReturnValue({}),
		} as unknown as GoogleGenerativeAI;

		chatModel = new GoogleGenAiChatModel(
			mockClient,
			new GoogleGenAiChatOptions({ model: "gemini-pro" }),
		);
	});

	it("should be defined", () => {
		expect(chatModel).toBeDefined();
	});

	it("should call generateContent with correct params", async () => {
		const mockResponse = {
			candidates: [
				{
					content: [{ parts: [{ text: "Hello there!" }] }],
					finishReason: "STOP",
				},
			],
			usageMetadata: {
				promptTokenCount: 10,
				candidatesTokenCount: 5,
				totalTokenCount: 15,
			},
		};

		(mockGenerativeModel.generateContent as Mock).mockResolvedValue(
			mockResponse as unknown as GenerateContentResult,
		);

		const prompt = new Prompt([UserMessage.of("Hello")]);
		const response = await chatModel.call(prompt);

		expect(mockClient.getGenerativeModel).toHaveBeenCalledWith({
			model: "gemini-pro",
		});
		expect(mockGenerativeModel.generateContent).toHaveBeenCalledWith(
			expect.objectContaining({
				contents: expect.arrayContaining([
					expect.objectContaining({
						role: "user",
						parts: [{ text: "Hello" }],
					}),
				]),
			}),
		);

		expect(response.result?.output.text).toBe("Hello there!");
		expect(response.metadata?.usage?.totalTokens).toBe(15);
	});
});
