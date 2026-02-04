import type {
	ChatCompletion,
	ChatCompletionChunk,
	ChatCompletionFunction,
	ChatCompletionMessage,
	Choice,
	ChunkChoice,
	ToolCall,
} from "./openai-api.types";
import {
	ChatCompletionFinishReason as FinishReasonEnum,
	Role as RoleEnum,
} from "./openai-api.types";

/**
 * Helper class to support Streaming function calling.
 *
 * It can merge the streamed ChatCompletionChunk in case of function calling message.
 */
export class OpenAiStreamFunctionCallingHelper {
	/**
	 * Merge the previous and current ChatCompletionChunk into a single one.
	 * @param previous - the previous ChatCompletionChunk
	 * @param current - the current ChatCompletionChunk
	 * @returns the merged ChatCompletionChunk
	 */
	merge(
		previous: ChatCompletionChunk,
		current: ChatCompletionChunk,
	): ChatCompletionChunk {
		if (previous === null) {
			return current;
		}

		if (current === null) {
			return previous;
		}

		const id = current.id ?? previous.id;
		const created = current.created ?? previous.created;
		const model = current.model ?? previous.model;
		const serviceTier = current.service_tier ?? previous.service_tier;
		const systemFingerprint =
			current.system_fingerprint ?? previous.system_fingerprint;
		const object = current.object ?? previous.object;
		const usage = current.usage ?? previous.usage;

		const previousChoice0 =
			!previous.choices || previous.choices.length === 0
				? null
				: previous.choices[0];
		const currentChoice0 =
			!current.choices || current.choices.length === 0
				? null
				: current.choices[0];

		const choice = this.mergeChunkChoice(previousChoice0, currentChoice0);
		const chunkChoices = choice === null ? [] : [choice];

		return {
			id,
			choices: chunkChoices,
			created,
			model,
			service_tier: serviceTier,
			system_fingerprint: systemFingerprint,
			object,
			usage,
		};
	}

	private mergeChunkChoice(
		previous: ChunkChoice | null,
		current: ChunkChoice | null,
	): ChunkChoice | null {
		if (previous === null) {
			return current;
		}

		if (current === null) {
			return previous;
		}

		const finishReason = current.finish_reason ?? previous.finish_reason;
		const index = current.index ?? previous.index;

		const message = this.mergeMessage(previous.delta, current.delta);

		const logprobs = current.logprobs ?? previous.logprobs;

		return {
			finish_reason: finishReason,
			index,
			delta: message,
			logprobs,
		};
	}

	private mergeMessage(
		previous: ChatCompletionMessage,
		current: ChatCompletionMessage,
	): ChatCompletionMessage {
		const content =
			current.content !== null
				? current.content
				: previous.content !== null
					? previous.content
					: "";

		const reasoningContent =
			current.reasoning_content !== undefined
				? current.reasoning_content
				: previous.reasoning_content !== undefined
					? previous.reasoning_content
					: "";

		let role = current.role ?? previous.role;
		role = role ?? RoleEnum.ASSISTANT; // default to ASSISTANT if null

		const name = current.name ?? previous.name;
		const toolCallId = current.tool_call_id ?? previous.tool_call_id;
		const refusal = current.refusal ?? previous.refusal;
		const audioOutput = current.audio ?? previous.audio;
		const annotations = current.annotations ?? previous.annotations;

		const toolCalls: ToolCall[] = [];
		let lastPreviousToolCall: ToolCall | null = null;

		if (previous.tool_calls && previous.tool_calls.length > 0) {
			lastPreviousToolCall =
				previous.tool_calls[previous.tool_calls.length - 1];
			if (previous.tool_calls.length > 1) {
				toolCalls.push(
					...previous.tool_calls.slice(0, previous.tool_calls.length - 1),
				);
			}
		}

		if (current.tool_calls && current.tool_calls.length > 0) {
			if (current.tool_calls.length > 1) {
				throw new Error(
					"Currently only one tool call is supported per message!",
				);
			}
			const currentToolCall = current.tool_calls[0];
			if (currentToolCall.id && currentToolCall.id.length > 0) {
				if (lastPreviousToolCall !== null) {
					toolCalls.push(lastPreviousToolCall);
				}
				toolCalls.push(currentToolCall);
			} else {
				toolCalls.push(
					this.mergeToolCall(lastPreviousToolCall, currentToolCall),
				);
			}
		} else {
			if (lastPreviousToolCall !== null) {
				toolCalls.push(lastPreviousToolCall);
			}
		}

		return {
			content,
			role,
			name,
			tool_call_id: toolCallId,
			tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
			refusal,
			audio: audioOutput,
			annotations,
			reasoning_content: reasoningContent || undefined,
		};
	}

	private mergeToolCall(
		previous: ToolCall | null,
		current: ToolCall,
	): ToolCall {
		if (previous === null) {
			return current;
		}

		const id = current.id && current.id.length > 0 ? current.id : previous.id;
		const type = current.type ?? previous.type;
		const func = this.mergeFunction(previous.function, current.function);

		return {
			id,
			type,
			function: func,
		};
	}

	private mergeFunction(
		previous: ChatCompletionFunction,
		current: ChatCompletionFunction,
	): ChatCompletionFunction {
		if (previous === null) {
			return current;
		}

		const name =
			current.name && current.name.length > 0 ? current.name : previous.name;

		let args = "";
		if (previous.arguments) {
			args += previous.arguments;
		}
		if (current.arguments) {
			args += current.arguments;
		}

		return {
			name,
			arguments: args,
		};
	}

	/**
	 * Checks if the ChatCompletionChunk is a streaming tool function call.
	 * @param chatCompletion - the ChatCompletionChunk to check
	 * @returns true if the ChatCompletionChunk is a streaming tool function call
	 */
	isStreamingToolFunctionCall(
		chatCompletion: ChatCompletionChunk | null,
	): boolean {
		if (
			chatCompletion === null ||
			!chatCompletion.choices ||
			chatCompletion.choices.length === 0
		) {
			return false;
		}

		const choice = chatCompletion.choices[0];
		if (!choice || !choice.delta) {
			return false;
		}

		return (
			choice.delta.tool_calls !== undefined &&
			choice.delta.tool_calls.length > 0
		);
	}

	/**
	 * Checks if the ChatCompletionChunk is a streaming tool function call and it is the last one.
	 * @param chatCompletion - the ChatCompletionChunk to check
	 * @returns true if the ChatCompletionChunk is a streaming tool function call and it is the last one
	 */
	isStreamingToolFunctionCallFinish(
		chatCompletion: ChatCompletionChunk | null,
	): boolean {
		if (
			chatCompletion === null ||
			!chatCompletion.choices ||
			chatCompletion.choices.length === 0
		) {
			return false;
		}

		const choice = chatCompletion.choices[0];
		if (!choice || !choice.delta) {
			return false;
		}

		return choice.finish_reason === FinishReasonEnum.TOOL_CALLS;
	}

	/**
	 * Convert the ChatCompletionChunk into a ChatCompletion. The Usage is set to null.
	 * @param chunk - the ChatCompletionChunk to convert
	 * @returns the ChatCompletion
	 */
	chunkToChatCompletion(chunk: ChatCompletionChunk): ChatCompletion {
		const choices: Choice[] = chunk.choices.map((chunkChoice) => ({
			finish_reason: chunkChoice.finish_reason,
			index: chunkChoice.index,
			message: chunkChoice.delta,
			logprobs: chunkChoice.logprobs,
		}));

		return {
			id: chunk.id,
			choices,
			created: chunk.created,
			model: chunk.model,
			service_tier: chunk.service_tier,
			system_fingerprint: chunk.system_fingerprint,
			object: "chat.completion",
			usage: undefined,
		};
	}
}
