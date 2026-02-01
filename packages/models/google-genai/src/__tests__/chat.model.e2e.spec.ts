import { GoogleGenerativeAI } from "@google/generative-ai";
import { Prompt, UserMessage } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import { GoogleGenAiChatModel } from "../chat.model";
import { GoogleGenAiChatOptions } from "../chat.options";

describe.skip("GoogleGenAiChatModel Integration", () => {
	it("should call Google GenAI API", async () => {
		const client = new GoogleGenerativeAI(
			"AIzaSyACJ3KcysZeAAbH9maFzPGLMd0B7UL02bg",
		);
		const model = new GoogleGenAiChatModel(
			client,
			new GoogleGenAiChatOptions({ model: "gemini-2.5-flash" }),
		);
		const response = await model.call(new Prompt([UserMessage.of("Hello")]));
		expect(response.result?.output.text).toBeDefined();
	});
});
