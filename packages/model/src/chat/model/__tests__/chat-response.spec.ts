import { describe, expect, it } from "vitest";
import { AssistantMessage } from "../../messages";
import { ChatGenerationMetadata } from "../../metadata";
import { ChatResponse } from "../chat-response";
import { Generation } from "../generation";

describe("ChatResponse", () => {
	it("when tool calls are present then return true", () => {
		const chatResponse = ChatResponse.builder()
			.generations([
				new Generation({
					assistantMessage: new AssistantMessage({
						content: "",
						toolCalls: [
							{
								id: "toolA",
								type: "function",
								name: "toolA",
								arguments: "{}",
							},
						],
						media: [],
					}),
				}),
			])
			.build();
		expect(chatResponse.hasToolCalls()).toBe(true);
	});

	it("when no tool calls are present then return false", () => {
		const chatResponse = ChatResponse.builder()
			.generations([
				new Generation({
					assistantMessage: new AssistantMessage({
						content: "Result",
						media: [],
					}),
				}),
			])
			.build();
		expect(chatResponse.hasToolCalls()).toBe(false);
	});

	it("when finish reason is null then throw", () => {
		const chatResponse = ChatResponse.builder()
			.generations([
				new Generation({
					assistantMessage: new AssistantMessage({
						content: "Result",
						media: [],
					}),
					chatGenerationMetadata: ChatGenerationMetadata.builder()
						.finishReason("completed")
						.build(),
				}),
			])
			.build();
		expect(() => {
			// @ts-expect-error - testing runtime validation
			chatResponse.hasFinishReasons(null);
		}).toThrow("finishReasons cannot be null");
	});

	it("when finish reason is present", () => {
		const chatResponse = ChatResponse.builder()
			.generations([
				new Generation({
					assistantMessage: new AssistantMessage({
						content: "Result",
						media: [],
					}),
					chatGenerationMetadata: ChatGenerationMetadata.builder()
						.finishReason("completed")
						.build(),
				}),
			])
			.build();
		expect(chatResponse.hasFinishReasons("completed")).toBe(true);
	});

	it("when finish reason is not present", () => {
		const chatResponse = ChatResponse.builder()
			.generations([
				new Generation({
					assistantMessage: new AssistantMessage({
						content: "Result",
						media: [],
					}),
					chatGenerationMetadata: ChatGenerationMetadata.builder()
						.finishReason("failed")
						.build(),
				}),
			])
			.build();
		expect(chatResponse.hasFinishReasons("completed")).toBe(false);
	});

	it("when empty generations list then return false", () => {
		const chatResponse = ChatResponse.builder().generations([]).build();
		expect(chatResponse.hasToolCalls()).toBe(false);
	});

	it("when multiple generations with tool calls then return true", () => {
		const chatResponse = ChatResponse.builder()
			.generations([
				new Generation({
					assistantMessage: new AssistantMessage({
						content: "First response",
						media: [],
					}),
				}),
				new Generation({
					assistantMessage: new AssistantMessage({
						content: null,
						toolCalls: [
							{
								id: "toolB",
								type: "function",
								name: "toolB",
								arguments: "{}",
							},
						],
						media: [],
					}),
				}),
			])
			.build();
		expect(chatResponse.hasToolCalls()).toBe(true);
	});
});
