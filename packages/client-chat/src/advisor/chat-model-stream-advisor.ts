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
import type { ChatModel } from "@nestjs-ai/model";
import { LOWEST_PRECEDENCE } from "@nestjs-port/core";
import type { Observable } from "rxjs";
import { asyncScheduler, map, observeOn } from "rxjs";

import type { ChatClientRequest } from "../chat-client-request.js";
import { ChatClientResponse } from "../chat-client-response.js";
import type { StreamAdvisor, StreamAdvisorChain } from "./api/index.js";

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
