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

import { type Logger, LoggerFactory } from "@nestjs-ai/commons";
import type { ChatResponse } from "@nestjs-ai/model";
import type { Observable } from "rxjs";

import { ChatClientMessageAggregator } from "../chat-client-message-aggregator";
import type { ChatClientRequest } from "../chat-client-request";
import type { ChatClientResponse } from "../chat-client-response";
import type {
  CallAdvisor,
  CallAdvisorChain,
  StreamAdvisor,
  StreamAdvisorChain,
} from "./api";

export interface SimpleLoggerAdvisorProps {
  requestToString?:
    | ((chatClientRequest: ChatClientRequest | null) => string)
    | null;
  responseToString?: ((chatResponse: ChatResponse | null) => string) | null;
  order?: number;
}

export class SimpleLoggerAdvisor implements CallAdvisor, StreamAdvisor {
  static readonly DEFAULT_REQUEST_TO_STRING = (
    chatClientRequest: ChatClientRequest | null,
  ): string => SimpleLoggerAdvisor.toPrettyJson(chatClientRequest);

  static readonly DEFAULT_RESPONSE_TO_STRING = (
    chatResponse: ChatResponse | null,
  ): string => SimpleLoggerAdvisor.toPrettyJson(chatResponse);

  private readonly _logger: Logger = LoggerFactory.getLogger(
    SimpleLoggerAdvisor.name,
  );

  private static readonly chatClientMessageAggregator =
    new ChatClientMessageAggregator();

  private readonly _requestToString: (
    chatClientRequest: ChatClientRequest | null,
  ) => string;
  private readonly _responseToString: (
    chatResponse: ChatResponse | null,
  ) => string;
  private readonly _order: number;

  constructor();
  constructor(order: number);
  constructor(props: SimpleLoggerAdvisorProps);
  constructor(orderOrProps: number | SimpleLoggerAdvisorProps = 0) {
    const props =
      typeof orderOrProps === "number"
        ? ({ order: orderOrProps } satisfies SimpleLoggerAdvisorProps)
        : orderOrProps;

    this._requestToString =
      props.requestToString ?? SimpleLoggerAdvisor.DEFAULT_REQUEST_TO_STRING;
    this._responseToString =
      props.responseToString ?? SimpleLoggerAdvisor.DEFAULT_RESPONSE_TO_STRING;
    this._order = props.order ?? 0;
  }

  async adviseCall(
    chatClientRequest: ChatClientRequest,
    callAdvisorChain: CallAdvisorChain,
  ): Promise<ChatClientResponse> {
    this.logRequest(chatClientRequest);
    const chatClientResponse =
      await callAdvisorChain.nextCall(chatClientRequest);
    this.logResponse(chatClientResponse);
    return chatClientResponse;
  }

  adviseStream(
    chatClientRequest: ChatClientRequest,
    streamAdvisorChain: StreamAdvisorChain,
  ): Observable<ChatClientResponse> {
    this.logRequest(chatClientRequest);
    const chatClientResponses =
      streamAdvisorChain.nextStream(chatClientRequest);
    return SimpleLoggerAdvisor.chatClientMessageAggregator.aggregateChatClientResponse(
      chatClientResponses,
      (chatClientResponse) => this.logResponse(chatClientResponse),
    );
  }

  protected logRequest(request: ChatClientRequest): void {
    this._logger.debug(`request: ${this._requestToString(request)}`);
  }

  protected logResponse(chatClientResponse: ChatClientResponse): void {
    this._logger.debug(
      `response: ${this._responseToString(chatClientResponse.chatResponse)}`,
    );
  }

  get name(): string {
    return this.constructor.name;
  }

  get order(): number {
    return this._order;
  }

  private static toPrettyJson(value: unknown): string {
    if (value == null) {
      return "null";
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
}
