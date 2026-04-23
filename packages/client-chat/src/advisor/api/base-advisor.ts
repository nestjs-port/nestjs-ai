/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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

import type { ChatClientRequest } from "../../chat-client-request.js";
import type { ChatClientResponse } from "../../chat-client-response.js";
import { AdvisorUtils } from "../advisor-utils.js";
import type { AdvisorChain } from "./advisor-chain.js";
import type { CallAdvisor } from "./call-advisor.interface.js";
import type { CallAdvisorChain } from "./call-advisor-chain.interface.js";
import type { StreamAdvisor } from "./stream-advisor.interface.js";
import type { StreamAdvisorChain } from "./stream-advisor-chain.interface.js";

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
