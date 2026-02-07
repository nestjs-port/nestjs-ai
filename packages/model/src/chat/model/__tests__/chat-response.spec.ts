import { firstValueFrom, of } from "rxjs";
import { toArray } from "rxjs/operators";
import { describe, expect, it } from "vitest";
import { AssistantMessage, type ToolCall } from "../../messages";
import { ChatGenerationMetadata, ChatResponseMetadata } from "../../metadata";
import { ChatResponse } from "../chat-response";
import { Generation } from "../generation";
import { MessageAggregator } from "../message-aggregator";

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

	it("message aggregator should correctly aggregate tool calls from stream", async () => {
		const aggregator = new MessageAggregator();

		const chunk1 = new ChatResponse({
			generations: [
				new Generation({
					assistantMessage: new AssistantMessage({
						content: "Thinking about the weather... ",
						media: [],
					}),
				}),
			],
		});

		const weatherToolCall: ToolCall = {
			id: "tool-id-123",
			type: "function",
			name: "getCurrentWeather",
			arguments: '{"location": "Seoul"}',
		};

		const metadataWithToolCall = ChatResponseMetadata.builder()
			.keyValue("toolCalls", [weatherToolCall])
			.build();

		const chunk2 = new ChatResponse({
			generations: [
				new Generation({
					assistantMessage: new AssistantMessage({
						content: "",
						media: [],
					}),
				}),
			],
			chatResponseMetadata: metadataWithToolCall,
		});

		const streamingResponse = of(chunk1, chunk2);

		let aggregatedResponse: ChatResponse | null = null;

		await firstValueFrom(
			aggregator
				.aggregate(streamingResponse, (response) => {
					aggregatedResponse = response;
				})
				.pipe(toArray()),
		);

		expect(aggregatedResponse).not.toBeNull();

		const finalAssistantMessage = aggregatedResponse?.result?.output;

		expect(finalAssistantMessage).not.toBeNull();
		expect(finalAssistantMessage.text).toBe("Thinking about the weather... ");
		expect(finalAssistantMessage.hasToolCalls()).toBe(true);
		expect(finalAssistantMessage.toolCalls).toHaveLength(1);

		const resultToolCall = finalAssistantMessage.toolCalls[0];
		expect(resultToolCall.id).toBe("tool-id-123");
		expect(resultToolCall.name).toBe("getCurrentWeather");
		expect(resultToolCall.arguments).toBe('{"location": "Seoul"}');
	});
});
