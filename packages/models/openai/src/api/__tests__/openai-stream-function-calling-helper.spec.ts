import { describe, expect, it } from "vitest";
import type {
	ChatCompletionChunk,
	ChatCompletionMessage,
	ChunkChoice,
	ToolCall,
	Usage,
} from "../openai-api.types";
import { ChatCompletionFinishReason, Role } from "../openai-api.types";
import { OpenAiStreamFunctionCallingHelper } from "../openai-stream-function-calling-helper";

/**
 * Unit tests for {@link OpenAiStreamFunctionCallingHelper}.
 */
describe("OpenAiStreamFunctionCallingHelper", () => {
	const helper = new OpenAiStreamFunctionCallingHelper();

	describe("merge", () => {
		it("merges chunks when input is valid", () => {
			const now = Date.now();
			const expectedResult: ChatCompletionChunk = {
				id: "id",
				choices: [],
				created: now,
				model: "model",
				service_tier: "default",
				system_fingerprint: "fingerPrint",
				object: "object",
				usage: undefined,
			};

			const previous: ChatCompletionChunk = {
				id: "",
				choices: [],
				created: now,
				model: "model",
				service_tier: "default",
				system_fingerprint: "",
				object: "",
				usage: undefined,
			};

			const current: ChatCompletionChunk = {
				id: "id",
				choices: [],
				created: now,
				model: "model",
				service_tier: "default",
				system_fingerprint: "fingerPrint",
				object: "object",
				usage: undefined,
			};

			const result = helper.merge(previous, current);

			expect(result?.id).toBe(expectedResult.id);
			expect(result?.model).toBe(expectedResult.model);
			expect(result?.system_fingerprint).toBe(
				expectedResult.system_fingerprint,
			);
			expect(result?.object).toBe(expectedResult.object);
		});

		it("returns null when both chunks are null", () => {
			const result = helper.merge(null, null);
			expect(result).toBeNull();
		});

		it("returns current when previous is null", () => {
			const current: ChatCompletionChunk = {
				id: "id",
				choices: [],
				created: Date.now(),
				model: "model",
				service_tier: "default",
				system_fingerprint: "fingerprint",
				object: "object",
				usage: undefined,
			};

			const result = helper.merge(null, current);
			expect(result).toEqual(current);
		});

		it("returns previous when current is null", () => {
			const previous: ChatCompletionChunk = {
				id: "id",
				choices: [],
				created: Date.now(),
				model: "model",
				service_tier: "default",
				system_fingerprint: "fingerprint",
				object: "object",
				usage: undefined,
			};

			const result = helper.merge(previous, null);
			expect(result).toEqual(previous);
		});

		it("combines chunk fields correctly", () => {
			const previous: ChatCompletionChunk = {
				id: "",
				choices: [],
				created: 123456789,
				model: "gpt-4",
				service_tier: "default",
				system_fingerprint: "",
				object: "",
				usage: undefined,
			};

			const current: ChatCompletionChunk = {
				id: "chat-1",
				choices: [],
				created: 123456789,
				model: "gpt-4",
				service_tier: "default",
				system_fingerprint: "fp-456",
				object: "chat.completion.chunk",
				usage: undefined,
			};

			const result = helper.merge(previous, current);

			expect(result?.id).toBe("chat-1");
			expect(result?.created).toBe(123456789);
			expect(result?.model).toBe("gpt-4");
			expect(result?.system_fingerprint).toBe("fp-456");
		});

		it("merges partial fields from each chunk", () => {
			const delta: ChatCompletionMessage = {
				content: null,
				role: Role.ASSISTANT,
			};

			const choice: ChunkChoice = {
				finish_reason: null,
				index: 0,
				delta,
				logprobs: undefined,
			};

			const usage: Usage = {
				prompt_tokens: 10,
				total_tokens: 20,
				completion_tokens: 10,
			};

			const previous: ChatCompletionChunk = {
				id: "",
				choices: [choice],
				created: 1,
				model: "model1",
				service_tier: undefined,
				system_fingerprint: "fp1",
				object: "",
				usage: undefined,
			};

			const current: ChatCompletionChunk = {
				id: "id2",
				choices: [],
				created: 1,
				model: "model1",
				service_tier: "tier2",
				system_fingerprint: "fp1",
				object: "object2",
				usage,
			};

			const result = helper.merge(previous, current);

			expect(result?.id).toBe("id2");
			expect(result?.created).toBe(1);
			expect(result?.model).toBe("model1");
			expect(result?.service_tier).toBe("tier2");
			expect(result?.system_fingerprint).toBe("fp1");
			expect(result?.object).toBe("object2");
			expect(result?.usage).toEqual(usage);
		});
	});

	describe("isStreamingToolFunctionCall", () => {
		it("returns false when chunk is null", () => {
			expect(helper.isStreamingToolFunctionCall(null)).toBe(false);
		});

		it("returns false when chunk choices is empty", () => {
			const chunk: ChatCompletionChunk = {
				id: "",
				choices: [],
				created: 0,
				model: "",
				service_tier: undefined,
				system_fingerprint: "",
				object: "",
				usage: undefined,
			};
			expect(helper.isStreamingToolFunctionCall(chunk)).toBe(false);
		});

		it("returns false when first choice delta is null", () => {
			const choice: ChunkChoice = {
				finish_reason: null,
				index: 0,
				delta: null as unknown as ChatCompletionMessage,
				logprobs: undefined,
			};

			const chunk: ChatCompletionChunk = {
				id: "",
				choices: [choice],
				created: 0,
				model: "",
				service_tier: undefined,
				system_fingerprint: "",
				object: "",
				usage: undefined,
			};

			expect(helper.isStreamingToolFunctionCall(chunk)).toBe(false);
		});

		it("returns false when delta tool_calls is null or empty", () => {
			// Test for null/undefined tool_calls
			const deltaWithNullToolCalls: ChatCompletionMessage = {
				content: null,
				role: Role.ASSISTANT,
				tool_calls: undefined,
			};

			const choice1: ChunkChoice = {
				finish_reason: null,
				index: 0,
				delta: deltaWithNullToolCalls,
				logprobs: undefined,
			};

			const chunk1: ChatCompletionChunk = {
				id: "",
				choices: [choice1],
				created: 0,
				model: "",
				service_tier: undefined,
				system_fingerprint: "",
				object: "",
				usage: undefined,
			};

			expect(helper.isStreamingToolFunctionCall(chunk1)).toBe(false);

			// Test for empty tool_calls
			const deltaWithEmptyToolCalls: ChatCompletionMessage = {
				content: null,
				role: Role.ASSISTANT,
				tool_calls: [],
			};

			const choice2: ChunkChoice = {
				finish_reason: null,
				index: 0,
				delta: deltaWithEmptyToolCalls,
				logprobs: undefined,
			};

			const chunk2: ChatCompletionChunk = {
				id: "",
				choices: [choice2],
				created: 0,
				model: "",
				service_tier: undefined,
				system_fingerprint: "",
				object: "",
				usage: undefined,
			};

			expect(helper.isStreamingToolFunctionCall(chunk2)).toBe(false);
		});

		it("returns true when delta has non-empty tool_calls", () => {
			const toolCall: ToolCall = {
				id: "call_123",
				type: "function",
				function: {
					name: "test_function",
					arguments: "{}",
				},
			};

			const delta: ChatCompletionMessage = {
				content: null,
				role: Role.ASSISTANT,
				tool_calls: [toolCall],
			};

			const choice: ChunkChoice = {
				finish_reason: null,
				index: 0,
				delta,
				logprobs: undefined,
			};

			const chunk: ChatCompletionChunk = {
				id: "",
				choices: [choice],
				created: 0,
				model: "",
				service_tier: undefined,
				system_fingerprint: "",
				object: "",
				usage: undefined,
			};

			expect(helper.isStreamingToolFunctionCall(chunk)).toBe(true);
		});

		it("returns false for null or empty chunks", () => {
			expect(helper.isStreamingToolFunctionCall(null)).toBe(false);

			const emptyChunk: ChatCompletionChunk = {
				id: "",
				choices: [],
				created: 0,
				model: "",
				service_tier: undefined,
				system_fingerprint: "",
				object: "",
				usage: undefined,
			};

			expect(helper.isStreamingToolFunctionCall(emptyChunk)).toBe(false);
		});

		it("returns true for valid tool calls", () => {
			const toolCall: ToolCall = {
				id: "call_456",
				type: "function",
				function: {
					name: "get_weather",
					arguments: '{"location": "Paris"}',
				},
			};

			const delta: ChatCompletionMessage = {
				content: null,
				role: Role.ASSISTANT,
				tool_calls: [toolCall],
			};

			const choice: ChunkChoice = {
				finish_reason: null,
				index: 0,
				delta,
				logprobs: undefined,
			};

			const chunk: ChatCompletionChunk = {
				id: "",
				choices: [choice],
				created: 0,
				model: "",
				service_tier: undefined,
				system_fingerprint: "",
				object: "",
				usage: undefined,
			};

			expect(helper.isStreamingToolFunctionCall(chunk)).toBe(true);
		});

		it("returns true with multiple choices when only first has tool calls", () => {
			const toolCall: ToolCall = {
				id: "call_789",
				type: "function",
				function: {
					name: "calculate",
					arguments: "{}",
				},
			};

			const deltaWithToolCalls: ChatCompletionMessage = {
				content: null,
				role: Role.ASSISTANT,
				tool_calls: [toolCall],
			};

			const deltaWithoutToolCalls: ChatCompletionMessage = {
				content: "Hello",
				role: Role.ASSISTANT,
			};

			const choice1: ChunkChoice = {
				finish_reason: null,
				index: 0,
				delta: deltaWithToolCalls,
				logprobs: undefined,
			};

			const choice2: ChunkChoice = {
				finish_reason: null,
				index: 1,
				delta: deltaWithoutToolCalls,
				logprobs: undefined,
			};

			const chunk: ChatCompletionChunk = {
				id: "",
				choices: [choice1, choice2],
				created: 0,
				model: "",
				service_tier: undefined,
				system_fingerprint: "",
				object: "",
				usage: undefined,
			};

			expect(helper.isStreamingToolFunctionCall(chunk)).toBe(true);
		});

		it("returns false with multiple choices when none have tool calls", () => {
			const deltaWithoutToolCalls: ChatCompletionMessage = {
				content: "Hello",
				role: Role.ASSISTANT,
			};

			const choice1: ChunkChoice = {
				finish_reason: null,
				index: 0,
				delta: deltaWithoutToolCalls,
				logprobs: undefined,
			};

			const choice2: ChunkChoice = {
				finish_reason: null,
				index: 1,
				delta: deltaWithoutToolCalls,
				logprobs: undefined,
			};

			const chunk: ChatCompletionChunk = {
				id: "",
				choices: [choice1, choice2],
				created: 0,
				model: "",
				service_tier: undefined,
				system_fingerprint: "",
				object: "",
				usage: undefined,
			};

			expect(helper.isStreamingToolFunctionCall(chunk)).toBe(false);
		});

		it("returns false with null tool_calls list", () => {
			const delta: ChatCompletionMessage = {
				content: null,
				role: Role.ASSISTANT,
				name: undefined,
				tool_call_id: undefined,
				tool_calls: undefined,
				refusal: undefined,
				audio: undefined,
				annotations: undefined,
				reasoning_content: undefined,
			};

			const choice: ChunkChoice = {
				finish_reason: null,
				index: 0,
				delta,
				logprobs: undefined,
			};

			const chunk: ChatCompletionChunk = {
				id: "",
				choices: [choice],
				created: 0,
				model: "",
				service_tier: undefined,
				system_fingerprint: "",
				object: "",
				usage: undefined,
			};

			expect(helper.isStreamingToolFunctionCall(chunk)).toBe(false);
		});
	});

	describe("isStreamingToolFunctionCallFinish", () => {
		it("returns false when chunk is null", () => {
			expect(helper.isStreamingToolFunctionCallFinish(null)).toBe(false);
		});

		it("returns false when chunk choices is empty", () => {
			const chunk: ChatCompletionChunk = {
				id: "",
				choices: [],
				created: 0,
				model: "",
				service_tier: undefined,
				system_fingerprint: "",
				object: "",
				usage: undefined,
			};
			expect(helper.isStreamingToolFunctionCallFinish(chunk)).toBe(false);
		});

		it("returns false when first choice delta is null", () => {
			const choice: ChunkChoice = {
				finish_reason: null,
				index: 0,
				delta: null as unknown as ChatCompletionMessage,
				logprobs: undefined,
			};

			const chunk: ChatCompletionChunk = {
				id: "",
				choices: [choice],
				created: 0,
				model: "",
				service_tier: undefined,
				system_fingerprint: "",
				object: "",
				usage: undefined,
			};

			expect(helper.isStreamingToolFunctionCallFinish(chunk)).toBe(false);
		});

		it("returns false when first choice finish reason is not TOOL_CALLS", () => {
			const delta: ChatCompletionMessage = {
				content: null,
				role: Role.ASSISTANT,
			};

			const choice: ChunkChoice = {
				finish_reason: ChatCompletionFinishReason.STOP,
				index: 0,
				delta,
				logprobs: undefined,
			};

			const chunk: ChatCompletionChunk = {
				id: "",
				choices: [choice],
				created: 0,
				model: "",
				service_tier: undefined,
				system_fingerprint: "",
				object: "",
				usage: undefined,
			};

			expect(helper.isStreamingToolFunctionCallFinish(chunk)).toBe(false);
		});

		it("returns true when first choice finish reason is TOOL_CALLS", () => {
			const delta: ChatCompletionMessage = {
				content: null,
				role: Role.ASSISTANT,
			};

			const choice: ChunkChoice = {
				finish_reason: ChatCompletionFinishReason.TOOL_CALLS,
				index: 0,
				delta,
				logprobs: undefined,
			};

			const chunk: ChatCompletionChunk = {
				id: "",
				choices: [choice],
				created: 0,
				model: "",
				service_tier: undefined,
				system_fingerprint: "",
				object: "",
				usage: undefined,
			};

			expect(helper.isStreamingToolFunctionCallFinish(chunk)).toBe(true);
		});

		it("detects TOOL_CALLS finish reason", () => {
			const delta: ChatCompletionMessage = {
				content: null,
				role: Role.ASSISTANT,
			};

			const choice: ChunkChoice = {
				finish_reason: ChatCompletionFinishReason.TOOL_CALLS,
				index: 0,
				delta,
				logprobs: undefined,
			};

			const chunk: ChatCompletionChunk = {
				id: "",
				choices: [choice],
				created: 0,
				model: "",
				service_tier: undefined,
				system_fingerprint: "",
				object: "",
				usage: undefined,
			};

			expect(helper.isStreamingToolFunctionCallFinish(chunk)).toBe(true);
		});

		it("returns true with multiple choices when only first is TOOL_CALLS finish", () => {
			const delta: ChatCompletionMessage = {
				content: null,
				role: Role.ASSISTANT,
			};

			const choice1: ChunkChoice = {
				finish_reason: ChatCompletionFinishReason.TOOL_CALLS,
				index: 0,
				delta,
				logprobs: undefined,
			};

			const choice2: ChunkChoice = {
				finish_reason: ChatCompletionFinishReason.STOP,
				index: 1,
				delta,
				logprobs: undefined,
			};

			const chunk: ChatCompletionChunk = {
				id: "",
				choices: [choice1, choice2],
				created: 0,
				model: "",
				service_tier: undefined,
				system_fingerprint: "",
				object: "",
				usage: undefined,
			};

			expect(helper.isStreamingToolFunctionCallFinish(chunk)).toBe(true);
		});
	});

	describe("chunkToChatCompletion", () => {
		it("converts chunk to chat completion when input is valid", () => {
			const delta1: ChatCompletionMessage = {
				content: null,
				role: Role.ASSISTANT,
			};

			const delta2: ChatCompletionMessage = {
				content: null,
				role: Role.ASSISTANT,
			};

			const choice1: ChunkChoice = {
				finish_reason: ChatCompletionFinishReason.TOOL_CALLS,
				index: 1,
				delta: delta1,
				logprobs: undefined,
			};

			const choice2: ChunkChoice = {
				finish_reason: ChatCompletionFinishReason.TOOL_CALLS,
				index: 2,
				delta: delta2,
				logprobs: undefined,
			};

			const chunk: ChatCompletionChunk = {
				id: "",
				choices: [choice1, choice2],
				created: 0,
				model: "",
				service_tier: undefined,
				system_fingerprint: "",
				object: "",
				usage: undefined,
			};

			const result = helper.chunkToChatCompletion(chunk);

			expect(result.object).toBe("chat.completion");
			expect(result.choices).toHaveLength(2);
		});

		it("throws error when chunk is null", () => {
			expect(() =>
				helper.chunkToChatCompletion(null as unknown as ChatCompletionChunk),
			).toThrow();
		});

		it("converts chunk with empty choices", () => {
			const chunk: ChatCompletionChunk = {
				id: "id",
				choices: [],
				created: 1,
				model: "model",
				service_tier: "tier",
				system_fingerprint: "fp",
				object: "object",
				usage: undefined,
			};

			const result = helper.chunkToChatCompletion(chunk);

			expect(result.object).toBe("chat.completion");
			expect(result.choices).toHaveLength(0);
			expect(result.id).toBe("id");
			expect(result.created).toBe(1);
			expect(result.model).toBe("model");
		});

		it("handles empty string fields", () => {
			const chunk: ChatCompletionChunk = {
				id: "",
				choices: [],
				created: 0,
				model: "",
				service_tier: "",
				system_fingerprint: "",
				object: "",
				usage: undefined,
			};

			const result = helper.chunkToChatCompletion(chunk);

			expect(result.id).toBe("");
			expect(result.model).toBe("");
			expect(result.service_tier).toBe("");
			expect(result.system_fingerprint).toBe("");
			expect(result.created).toBe(0);
		});
	});
});
