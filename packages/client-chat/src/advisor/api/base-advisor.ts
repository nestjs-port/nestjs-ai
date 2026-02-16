import assert from "node:assert/strict";
import {
	asyncScheduler,
	catchError,
	mergeMap,
	type Observable,
	observeOn,
	of,
	type SchedulerLike,
	throwError,
} from "rxjs";

import type { ChatClientRequest } from "../../chat-client-request";
import type { ChatClientResponse } from "../../chat-client-response";
import { AdvisorUtils } from "../advisor-utils";
import type { AdvisorChain } from "./advisor-chain";
import type { CallAdvisor } from "./call-advisor.interface";
import type { CallAdvisorChain } from "./call-advisor-chain.interface";
import type { StreamAdvisor } from "./stream-advisor.interface";
import type { StreamAdvisorChain } from "./stream-advisor-chain.interface";

export abstract class BaseAdvisor implements CallAdvisor, StreamAdvisor {
	static readonly DEFAULT_SCHEDULER: SchedulerLike = asyncScheduler;

	abstract get order(): number;

	async adviseCall(
		chatClientRequest: ChatClientRequest,
		callAdvisorChain: CallAdvisorChain,
	): Promise<ChatClientResponse> {
		assert(chatClientRequest != null, "chatClientRequest cannot be null");
		assert(callAdvisorChain != null, "callAdvisorChain cannot be null");

		const processedChatClientRequest = await this.before(
			chatClientRequest,
			callAdvisorChain,
		);
		const chatClientResponse = await callAdvisorChain.nextCall(
			processedChatClientRequest,
		);
		return await this.after(chatClientResponse, callAdvisorChain);
	}

	adviseStream(
		chatClientRequest: ChatClientRequest,
		streamAdvisorChain: StreamAdvisorChain,
	): Observable<ChatClientResponse> {
		assert(chatClientRequest != null, "chatClientRequest cannot be null");
		assert(streamAdvisorChain != null, "streamAdvisorChain cannot be null");
		assert(this.scheduler != null, "scheduler cannot be null");

		return of(chatClientRequest).pipe(
			observeOn(this.scheduler),
			mergeMap((request) => this.before(request, streamAdvisorChain)),
			mergeMap((request) => streamAdvisorChain.nextStream(request)),
			mergeMap((response) =>
				AdvisorUtils.onFinishReason()(response)
					? this.after(response, streamAdvisorChain)
					: Promise.resolve(response),
			),
			catchError((error: unknown) =>
				throwError(
					() => new Error("Stream processing failed", { cause: error }),
				),
			),
		);
	}

	get name(): string {
		return this.constructor.name;
	}

	abstract before(
		chatClientRequest: ChatClientRequest,
		advisorChain: AdvisorChain,
	): Promise<ChatClientRequest>;

	abstract after(
		chatClientResponse: ChatClientResponse,
		advisorChain: AdvisorChain,
	): Promise<ChatClientResponse>;

	get scheduler(): SchedulerLike {
		return BaseAdvisor.DEFAULT_SCHEDULER;
	}
}
