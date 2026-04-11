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

  setChatClientResponse(chatClientResponse: ChatClientResponse | null): void {
    this._chatClientResponse = chatClientResponse;
  }
}
