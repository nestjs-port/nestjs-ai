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

		it("should throw when generations is empty", () => {
			expect(() => {
				new ChatResponse({ generations: [] });
			}).toThrow("Generations must not be empty");
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
		it("should return false when no tool calls", () => {
			const generation = new Generation({
				assistantMessage: createAssistantMessage("Hello"),
			});
			const response = new ChatResponse({ generations: [generation] });

			expect(response.hasToolCalls()).toBe(false);
		});

		it("should return true when generation has tool calls", () => {
			const generation = new Generation({
				assistantMessage: createAssistantMessage(null, [
					{ id: "1", type: "function", name: "test", arguments: "{}" },
				]),
			});
			const response = new ChatResponse({ generations: [generation] });

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
				chatGenerationMetadata: new ChatGenerationMetadata({
					finishReason: "stop",
				}),
			});
			const gen2 = new Generation({
				assistantMessage: createAssistantMessage("World"),
				chatGenerationMetadata: new ChatGenerationMetadata({
					finishReason: "length",
				}),
			});
			const response = new ChatResponse({ generations: [gen1, gen2] });

			expect(response.hasFinishReasons("stop")).toBe(true);
			expect(response.hasFinishReasons("length")).toBe(true);
			expect(response.hasFinishReasons("stop", "length")).toBe(true);
			expect(response.hasFinishReasons("tool_calls")).toBe(false);
		});

		it("should return false when finish reason is null", () => {
			const generation = new Generation({
				assistantMessage: createAssistantMessage("Hello"),
			});
			const response = new ChatResponse({ generations: [generation] });

			expect(response.hasFinishReasons("stop")).toBe(false);
		});
	});

	describe("static factory methods", () => {
		it("should create ChatResponse using from()", () => {
			const generation = new Generation({
				assistantMessage: createAssistantMessage("Hello"),
			});
			const response = ChatResponse.from(generation);

			expect(response.results).toHaveLength(1);
			expect(response.result).toBe(generation);
		});

		it("should create ChatResponse using of()", () => {
			const gen1 = new Generation({
				assistantMessage: createAssistantMessage("Hello"),
			});
			const gen2 = new Generation({
				assistantMessage: createAssistantMessage("World"),
			});
			const response = ChatResponse.of(gen1, gen2);

			expect(response.results).toHaveLength(2);
		});
	});

	describe("builder", () => {
		it("should build ChatResponse using builder pattern", () => {
			const response = ChatResponse.builder()
				.generation(
					new Generation({
						assistantMessage: createAssistantMessage("Built"),
					}),
				)
				.chatResponseMetadata(
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
