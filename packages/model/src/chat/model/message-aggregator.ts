import { type Logger, LoggerFactory } from "@nestjs-ai/commons";
import type { Observable } from "rxjs";
import { defer } from "rxjs";
import { finalize, tap } from "rxjs/operators";
import { AssistantMessage, type ToolCall } from "../messages";
import {
	ChatGenerationMetadata,
	ChatResponseMetadata,
	DefaultUsage,
	EmptyRateLimit,
	PromptMetadata,
	type RateLimit,
} from "../metadata";
import { ChatResponse } from "./chat-response";
import { Generation } from "./generation";

/**
 * Helper that for streaming chat responses, aggregate the chat response messages into a
 * single AssistantMessage. Job is performed in parallel to the chat response processing.
 */
export class MessageAggregator {
	private static _logger: Logger | null = null;
	private static get logger(): Logger {
		if (!MessageAggregator._logger) {
			MessageAggregator._logger = LoggerFactory.getLogger(
				MessageAggregator.name,
			);
		}
		return MessageAggregator._logger;
	}

	aggregate(
		fluxChatResponse: Observable<ChatResponse>,
		onAggregationComplete: (chatResponse: ChatResponse) => void,
	): Observable<ChatResponse> {
		return defer(() => {
			// Initialize variables on each subscription (equivalent to doOnSubscribe in Reactor)
			// Assistant Message
			let messageTextContentRef = "";
			let messageMetadataMapRef: Record<string, unknown> = {};
			let toolCallsRef: ToolCall[] = [];

			// ChatGeneration Metadata
			let generationMetadataRef: ChatGenerationMetadata =
				ChatGenerationMetadata.NULL;

			// Usage
			let metadataUsagePromptTokensRef = 0;
			let metadataUsageGenerationTokensRef = 0;
			let metadataUsageTotalTokensRef = 0;

			let metadataPromptMetadataRef: PromptMetadata = PromptMetadata.empty();
			let metadataRateLimitRef: RateLimit = new EmptyRateLimit();

			let metadataIdRef = "";
			let metadataModelRef = "";

			return fluxChatResponse.pipe(
				tap((chatResponse) => {
					if (chatResponse.result) {
						if (
							chatResponse.result.metadata &&
							chatResponse.result.metadata !== ChatGenerationMetadata.NULL
						) {
							generationMetadataRef = chatResponse.result.metadata;
						}
						if (chatResponse.result.output.text) {
							messageTextContentRef += chatResponse.result.output.text;
						}
						if (chatResponse.result.output.metadata) {
							messageMetadataMapRef = {
								...messageMetadataMapRef,
								...chatResponse.result.output.metadata,
							};
						}
						const outputMessage = chatResponse.result.output;
						if (outputMessage.toolCalls && outputMessage.toolCalls.length > 0) {
							toolCallsRef = [...toolCallsRef, ...outputMessage.toolCalls];
						}
					}
					if (chatResponse.metadata) {
						if (chatResponse.metadata.usage) {
							const usage = chatResponse.metadata.usage;
							metadataUsagePromptTokensRef =
								usage.promptTokens > 0
									? usage.promptTokens
									: metadataUsagePromptTokensRef;
							metadataUsageGenerationTokensRef =
								usage.completionTokens > 0
									? usage.completionTokens
									: metadataUsageGenerationTokensRef;
							metadataUsageTotalTokensRef =
								usage.totalTokens > 0
									? usage.totalTokens
									: metadataUsageTotalTokensRef;
						}
						if (
							chatResponse.metadata.promptMetadata &&
							Array.from(chatResponse.metadata.promptMetadata).length > 0
						) {
							metadataPromptMetadataRef = chatResponse.metadata.promptMetadata;
						}
						if (
							chatResponse.metadata.rateLimit &&
							!(metadataRateLimitRef instanceof EmptyRateLimit)
						) {
							metadataRateLimitRef = chatResponse.metadata.rateLimit;
						}
						if (chatResponse.metadata.id) {
							metadataIdRef = chatResponse.metadata.id;
						}
						if (chatResponse.metadata.model) {
							metadataModelRef = chatResponse.metadata.model;
						}
						const toolCallsFromMetadata =
							chatResponse.metadata.get("toolCalls");
						if (Array.isArray(toolCallsFromMetadata)) {
							const toolCallsList = toolCallsFromMetadata as ToolCall[];
							toolCallsRef = [...toolCallsRef, ...toolCallsList];
						}
					}
				}),
				finalize(() => {
					const usage = new DefaultUsage({
						promptTokens: metadataUsagePromptTokensRef,
						completionTokens: metadataUsageGenerationTokensRef,
						totalTokens: metadataUsageTotalTokensRef,
					});

					const chatResponseMetadata = ChatResponseMetadata.builder()
						.id(metadataIdRef)
						.model(metadataModelRef)
						.rateLimit(metadataRateLimitRef)
						.usage(usage)
						.promptMetadata(metadataPromptMetadataRef)
						.build();

					let finalAssistantMessage: AssistantMessage;
					const collectedToolCalls = toolCallsRef;

					if (collectedToolCalls && collectedToolCalls.length > 0) {
						finalAssistantMessage = new AssistantMessage({
							content: messageTextContentRef,
							properties: messageMetadataMapRef,
							toolCalls: collectedToolCalls,
						});
					} else {
						finalAssistantMessage = new AssistantMessage({
							content: messageTextContentRef,
							properties: messageMetadataMapRef,
						});
					}
					onAggregationComplete(
						new ChatResponse({
							generations: [
								new Generation({
									assistantMessage: finalAssistantMessage,
									chatGenerationMetadata: generationMetadataRef,
								}),
							],
							chatResponseMetadata,
						}),
					);
				}),
				tap({
					error: (e) => {
						MessageAggregator.logger.error("Aggregation Error", e);
					},
				}),
			);
		});
	}
}
