import assert from "node:assert/strict";
import { AssistantMessage, ChatResponse, Generation } from "@nestjs-ai/model";
import type { Observable } from "rxjs";
import { of } from "rxjs";

import type { ChatClientRequest } from "../chat-client-request";
import { ChatClientResponse } from "../chat-client-response";
import type {
  CallAdvisor,
  CallAdvisorChain,
  StreamAdvisor,
  StreamAdvisorChain,
} from "./api";

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
