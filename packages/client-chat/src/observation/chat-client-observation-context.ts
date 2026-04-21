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
  AiOperationMetadata,
  AiOperationType,
  AiProvider,
  ObservationContext,
} from "@nestjs-ai/commons";
import { StringUtils } from "@nestjs-port/core";
import type { Advisor } from "../advisor";
import { ChatClientAttributes } from "../chat-client-attributes";
import type { ChatClientRequest } from "../chat-client-request";
import type { ChatClientResponse } from "../chat-client-response";

export class ChatClientObservationContext extends ObservationContext {
  private readonly _request: ChatClientRequest;
  private _response: ChatClientResponse | null = null;
  private readonly _operationMetadata = new AiOperationMetadata(
    AiOperationType.FRAMEWORK.value,
    AiProvider.SPRING_AI.value,
  );
  private readonly _advisors: Advisor[];
  private readonly _stream: boolean;

  constructor(
    chatClientRequest: ChatClientRequest,
    advisors: Advisor[],
    isStream: boolean,
  ) {
    super();
    assert(chatClientRequest, "chatClientRequest cannot be null");
    assert(advisors, "advisors cannot be null");
    assert(
      advisors.every((advisor) => advisor != null),
      "advisors cannot contain null elements",
    );

    this._request = chatClientRequest;
    this._advisors = advisors;
    this._stream = isStream;
  }

  static builder(): ChatClientObservationContextBuilder {
    return new ChatClientObservationContextBuilder();
  }

  get request(): ChatClientRequest {
    return this._request;
  }

  get operationMetadata(): AiOperationMetadata {
    return this._operationMetadata;
  }

  get advisors(): Advisor[] {
    return this._advisors;
  }

  get isStream(): boolean {
    return this._stream;
  }

  get format(): string | null {
    const format = this.request.context.get(
      ChatClientAttributes.OUTPUT_FORMAT.key,
    );
    return typeof format === "string" ? format : null;
  }

  get response(): ChatClientResponse | null {
    return this._response;
  }

  setResponse(response: ChatClientResponse | null): void {
    this._response = response;
  }
}

export class ChatClientObservationContextBuilder {
  private _chatClientRequest: ChatClientRequest | null = null;
  private _advisors: Advisor[] = [];
  private _format: string | null = null;
  private _isStream = false;

  request(chatClientRequest: ChatClientRequest): this {
    this._chatClientRequest = chatClientRequest;
    return this;
  }

  format(format: string | null): this {
    this._format = format;
    return this;
  }

  advisors(advisors: Advisor[]): this {
    this._advisors = advisors;
    return this;
  }

  stream(isStream: boolean): this {
    this._isStream = isStream;
    return this;
  }

  build(): ChatClientObservationContext {
    assert(this._chatClientRequest, "chatClientRequest cannot be null");

    let chatClientRequest = this._chatClientRequest;
    if (StringUtils.hasText(this._format)) {
      const context = chatClientRequest.context;
      context.set(ChatClientAttributes.OUTPUT_FORMAT.key, this._format);
      chatClientRequest = chatClientRequest.mutate().context(context).build();
    }

    return new ChatClientObservationContext(
      chatClientRequest,
      this._advisors,
      this._isStream,
    );
  }
}
