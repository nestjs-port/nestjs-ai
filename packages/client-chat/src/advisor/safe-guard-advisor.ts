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
import { AssistantMessage, ChatResponse, Generation } from "@nestjs-ai/model";
import type { Observable } from "rxjs";
import { of } from "rxjs";

import type { ChatClientRequest } from "../chat-client-request.js";
import { ChatClientResponse } from "../chat-client-response.js";
import type {
  CallAdvisor,
  CallAdvisorChain,
  StreamAdvisor,
  StreamAdvisorChain,
} from "./api/index.js";

export interface SafeGuardAdvisorProps {
  sensitiveWords: string[];
  failureResponse?: string;
  order?: number;
}

export class SafeGuardAdvisor implements CallAdvisor, StreamAdvisor {
  static readonly DEFAULT_FAILURE_RESPONSE =
    "I'm unable to respond to that due to sensitive content. Could we rephrase or discuss something else?";
  static readonly DEFAULT_ORDER = 0;

  private readonly _failureResponse: string;
  private readonly _sensitiveWords: string[];
  private readonly _order: number;

  constructor(sensitiveWords: string[]);
  constructor(props: SafeGuardAdvisorProps);
  constructor(sensitiveWordsOrProps: string[] | SafeGuardAdvisorProps) {
    const props = Array.isArray(sensitiveWordsOrProps)
      ? ({
          sensitiveWords: sensitiveWordsOrProps,
          failureResponse: SafeGuardAdvisor.DEFAULT_FAILURE_RESPONSE,
          order: SafeGuardAdvisor.DEFAULT_ORDER,
        } satisfies SafeGuardAdvisorProps)
      : sensitiveWordsOrProps;

    assert(props.sensitiveWords != null, "Sensitive words must not be null!");
    assert(props.failureResponse != null, "Failure response must not be null!");

    this._sensitiveWords = [...props.sensitiveWords];
    this._failureResponse = props.failureResponse;
    this._order = props.order ?? SafeGuardAdvisor.DEFAULT_ORDER;
  }

  async adviseCall(
    chatClientRequest: ChatClientRequest,
    callAdvisorChain: CallAdvisorChain,
  ): Promise<ChatClientResponse> {
    if (this.hasSensitiveContent(chatClientRequest)) {
      return this.createFailureResponse(chatClientRequest);
    }

    return callAdvisorChain.nextCall(chatClientRequest);
  }

  adviseStream(
    chatClientRequest: ChatClientRequest,
    streamAdvisorChain: StreamAdvisorChain,
  ): Observable<ChatClientResponse> {
    if (this.hasSensitiveContent(chatClientRequest)) {
      return of(this.createFailureResponse(chatClientRequest));
    }

    return streamAdvisorChain.nextStream(chatClientRequest);
  }

  get name(): string {
    return this.constructor.name;
  }

  get order(): number {
    return this._order;
  }

  private hasSensitiveContent(chatClientRequest: ChatClientRequest): boolean {
    return (
      this._sensitiveWords.length > 0 &&
      this._sensitiveWords.some((word) =>
        chatClientRequest.prompt.contents.includes(word),
      )
    );
  }

  private createFailureResponse(
    chatClientRequest: ChatClientRequest,
  ): ChatClientResponse {
    return ChatClientResponse.builder()
      .chatResponse(
        ChatResponse.builder()
          .generations([
            new Generation({
              assistantMessage: new AssistantMessage({
                content: this._failureResponse,
              }),
            }),
          ])
          .build(),
      )
      .context(new Map(chatClientRequest.context))
      .build();
  }
}
