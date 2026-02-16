import { type ChatResponse, MessageAggregator } from "@nestjs-ai/model";
import type { Observable } from "rxjs";
import { filter, map } from "rxjs";

import { ChatClientResponse } from "./chat-client-response";

/**
 * Helper that for streaming chat responses, aggregate the chat response messages into a
 * single AssistantMessage. Job is performed in parallel to the chat response processing.
 */
export class ChatClientMessageAggregator {
	aggregateChatClientResponse(
		chatClientResponses: Observable<ChatClientResponse>,
		aggregationHandler: (chatClientResponse: ChatClientResponse) => void,
	): Observable<ChatClientResponse> {
		const context = new Map<string, unknown>();

		return new MessageAggregator()
			.aggregate(
				chatClientResponses.pipe(
					map((chatClientResponse) => {
						for (const [key, value] of chatClientResponse.context.entries()) {
							context.set(key, value);
						}
						return chatClientResponse.chatResponse;
					}),
					filter(
						(chatResponse: ChatResponse | null): chatResponse is ChatResponse =>
							chatResponse != null,
					),
				),
				(aggregatedChatResponse: ChatResponse) => {
					const aggregatedChatClientResponse = ChatClientResponse.builder()
						.chatResponse(aggregatedChatResponse)
						.context(new Map(context))
						.build();
					aggregationHandler(aggregatedChatClientResponse);
				},
			)
			.pipe(
				map((chatResponse) =>
					ChatClientResponse.builder()
						.chatResponse(chatResponse)
						.context(new Map(context))
						.build(),
				),
			);
	}
}
