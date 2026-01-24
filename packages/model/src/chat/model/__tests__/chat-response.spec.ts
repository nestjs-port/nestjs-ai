import { describe, expect, it } from "vitest";
import { AssistantMessage, type ToolCall } from "../../messages";
import {
	ChatGenerationMetadata,
	ChatResponseMetadata,
	DefaultUsage,
} from "../../metadata";
import { ChatResponse } from "../chat-response";
import { Generation } from "../generation";

function createAssistantMessage(
	content: string | null,
	toolCalls: ToolCall[] = [],
): AssistantMessage {
	return new AssistantMessage({ content, toolCalls, media: [] });
}

describe("ChatResponse", () => {
	describe("constructor", () => {
		it("should create ChatResponse with generations", () => {
			const generation = new Generation({
				assistantMessage: createAssistantMessage("Hello"),
			});
			const response = new ChatResponse({ generations: [generation] });

			expect(response.results).toHaveLength(1);
			expect(response.result?.output.text).toBe("Hello");
		});

		it("should throw when generations is null", () => {
			expect(() => {
				// @ts-expect-error - testing runtime validation
				new ChatResponse({ generations: null });
			}).toThrow();
		});
	});

	describe("ModelResponse interface", () => {
		it("should implement ModelResponse interface", () => {
			const generation = new Generation({
				assistantMessage: createAssistantMessage("Hello"),
			});
			const response = new ChatResponse({ generations: [generation] });

			expect(response.result).toBe(generation);
			expect(response.results).toEqual([generation]);
			expect(response.metadata).toBe(ChatResponseMetadata.EMPTY);
		});
	});

	describe("Spring AI compatible methods", () => {
		it("should provide getResult, getResults, getMetadata methods", () => {
			const generation = new Generation({
				assistantMessage: createAssistantMessage("Hello"),
			});
			const response = new ChatResponse({ generations: [generation] });

			expect(response.getResult()).toBe(generation);
			expect(response.getResults()).toEqual([generation]);
			expect(response.getMetadata()).toBe(ChatResponseMetadata.EMPTY);
		});
	});

	describe("hasToolCalls", () => {
		it("should return true when tool calls are present", () => {
			const response = ChatResponse.builder()
				.generations([
					new Generation({
						assistantMessage: createAssistantMessage(null, [
							{
								id: "toolA",
								type: "function",
								name: "toolA",
								arguments: "{}",
							},
						]),
					}),
				])
				.build();

			expect(response.hasToolCalls()).toBe(true);
		});

		it("should return false when no tool calls are present", () => {
			const response = ChatResponse.builder()
				.generations([
					new Generation({
						assistantMessage: createAssistantMessage("Result"),
					}),
				])
				.build();

			expect(response.hasToolCalls()).toBe(false);
		});

		it("should return false when generations list is empty", () => {
			// Note: Builder allows empty list, but constructor doesn't
			// This test verifies hasToolCalls handles empty list gracefully
			const response = ChatResponse.builder().generations([]).build();

			expect(response.hasToolCalls()).toBe(false);
		});

		it("should return true when multiple generations with tool calls", () => {
			const response = ChatResponse.builder()
				.generations([
					new Generation({
						assistantMessage: createAssistantMessage("First response"),
					}),
					new Generation({
						assistantMessage: createAssistantMessage(null, [
							{
								id: "toolB",
								type: "function",
								name: "toolB",
								arguments: "{}",
							},
						]),
					}),
				])
				.build();

			expect(response.hasToolCalls()).toBe(true);
		});
	});

	describe("getToolCalls", () => {
		it("should return all tool calls from all generations", () => {
			const gen1 = new Generation({
				assistantMessage: createAssistantMessage(null, [
					{ id: "1", type: "function", name: "func1", arguments: "{}" },
				]),
			});
			const gen2 = new Generation({
				assistantMessage: createAssistantMessage(null, [
					{ id: "2", type: "function", name: "func2", arguments: "{}" },
				]),
			});
			const response = new ChatResponse({ generations: [gen1, gen2] });

			const toolCalls = response.getToolCalls();
			expect(toolCalls).toHaveLength(2);
			expect(toolCalls[0].name).toBe("func1");
			expect(toolCalls[1].name).toBe("func2");
		});
	});

	describe("hasFinishReasons", () => {
		it("should return true if any generation has matching finish reason", () => {
			const gen1 = new Generation({
				assistantMessage: createAssistantMessage("Hello"),
				chatGenerationMetadata: ChatGenerationMetadata.builder()
					.finishReason("completed")
					.build(),
			});
			const gen2 = new Generation({
				assistantMessage: createAssistantMessage("World"),
				chatGenerationMetadata: ChatGenerationMetadata.builder()
					.finishReason("length")
					.build(),
			});
			const response = ChatResponse.builder().generations([gen1, gen2]).build();

			expect(response.hasFinishReasons("completed")).toBe(true);
			expect(response.hasFinishReasons("length")).toBe(true);
			expect(response.hasFinishReasons("completed", "length")).toBe(true);
			expect(response.hasFinishReasons("tool_calls")).toBe(false);
		});

		it("should throw when finishReasons is null", () => {
			const generation = new Generation({
				assistantMessage: createAssistantMessage("Result"),
				chatGenerationMetadata: ChatGenerationMetadata.builder()
					.finishReason("completed")
					.build(),
			});
			const response = ChatResponse.builder().generations([generation]).build();

			expect(() => {
				// @ts-expect-error - testing runtime validation
				response.hasFinishReasons(null);
			}).toThrow("finishReasons cannot be null");
		});

		it("should return false when finish reason is not present", () => {
			const generation = new Generation({
				assistantMessage: createAssistantMessage("Result"),
				chatGenerationMetadata: ChatGenerationMetadata.builder()
					.finishReason("failed")
					.build(),
			});
			const response = ChatResponse.builder().generations([generation]).build();

			expect(response.hasFinishReasons("completed")).toBe(false);
		});

		it("should return false when finish reason is null", () => {
			const generation = new Generation({
				assistantMessage: createAssistantMessage("Hello"),
			});
			const response = new ChatResponse({ generations: [generation] });

			expect(response.hasFinishReasons("stop")).toBe(false);
		});
	});

	describe("builder", () => {
		it("should build ChatResponse using builder pattern", () => {
			const response = ChatResponse.builder()
				.generations([
					new Generation({
						assistantMessage: createAssistantMessage("Built"),
					}),
				])
				.metadata(
					ChatResponseMetadata.builder()
						.id("resp-123")
						.model("gpt-4")
						.usage(
							new DefaultUsage({ promptTokens: 100, completionTokens: 50 }),
						)
						.build(),
				)
				.build();

			expect(response.metadata.id).toBe("resp-123");
			expect(response.metadata.model).toBe("gpt-4");
			expect(response.metadata.usage.promptTokens).toBe(100);
		});

		it("should build ChatResponse with multiple generations", () => {
			const response = ChatResponse.builder()
				.generations([
					new Generation({
						assistantMessage: createAssistantMessage("First"),
					}),
					new Generation({
						assistantMessage: createAssistantMessage("Second"),
					}),
				])
				.build();

			expect(response.results).toHaveLength(2);
		});
	});
});
