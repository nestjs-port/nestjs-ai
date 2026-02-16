import assert from "node:assert/strict";
import { LOWEST_PRECEDENCE } from "@nestjs-ai/commons";
import type { ChatModel } from "@nestjs-ai/model";
import type { Observable } from "rxjs";
import { asyncScheduler, map, observeOn } from "rxjs";

import type { ChatClientRequest } from "../chat-client-request";
import { ChatClientResponse } from "../chat-client-response";
import type { StreamAdvisor, StreamAdvisorChain } from "./api";

export class ChatModelStreamAdvisor implements StreamAdvisor {
	private readonly _chatModel: ChatModel;

	constructor(chatModel: ChatModel) {
		assert(chatModel, "chatModel cannot be null");
		this._chatModel = chatModel;
	}

	adviseStream(
		chatClientRequest: ChatClientRequest,
		_streamAdvisorChain: StreamAdvisorChain,
	): Observable<ChatClientResponse> {
		assert(chatClientRequest, "the chatClientRequest cannot be null");

		return this._chatModel.stream(chatClientRequest.prompt).pipe(
			map((chatResponse) =>
				ChatClientResponse.builder()
					.chatResponse(chatResponse)
					.context(new Map(chatClientRequest.context))
					.build(),
			),
			observeOn(asyncScheduler), // TODO add option to disable
		);
	}

	get name(): string {
		return "stream";
	}

	get order(): number {
		return LOWEST_PRECEDENCE;
	}
}
