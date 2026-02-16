import assert from "node:assert/strict";
import { ObservationContext } from "@nestjs-ai/commons";

import type { ChatClientRequest } from "../../chat-client-request";
import type { ChatClientResponse } from "../../chat-client-response";

export class AdvisorObservationContext extends ObservationContext {
	private readonly _advisorName: string;
	private readonly _chatClientRequest: ChatClientRequest;
	private readonly _order: number;
	private _chatClientResponse: ChatClientResponse | null = null;

	constructor(
		advisorName: string,
		chatClientRequest: ChatClientRequest,
		order: number,
	) {
		super();
		assert(advisorName?.trim().length, "advisorName cannot be null or empty");
		assert(chatClientRequest, "chatClientRequest cannot be null");

		this._advisorName = advisorName;
		this._chatClientRequest = chatClientRequest;
		this._order = order;
	}

	get advisorName(): string {
		return this._advisorName;
	}

	get chatClientRequest(): ChatClientRequest {
		return this._chatClientRequest;
	}

	get order(): number {
		return this._order;
	}

	get chatClientResponse(): ChatClientResponse | null {
		return this._chatClientResponse;
	}

	set chatClientResponse(chatClientResponse: ChatClientResponse | null) {
		this._chatClientResponse = chatClientResponse;
	}
}
