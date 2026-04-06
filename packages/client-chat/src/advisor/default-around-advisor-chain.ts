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
import type { ObservationRegistry } from "@nestjs-ai/commons";
import type { Observable } from "rxjs";
import { defer, throwError } from "rxjs";

import { ChatClientMessageAggregator } from "../chat-client-message-aggregator";
import type { ChatClientRequest } from "../chat-client-request";
import type { ChatClientResponse } from "../chat-client-response";
import type {
  Advisor,
  CallAdvisor,
  CallAdvisorChain,
  StreamAdvisor,
  StreamAdvisorChain,
} from "./api";
import { BaseAdvisorChain } from "./api";
import {
  AdvisorObservationContext,
  type AdvisorObservationConvention,
  AdvisorObservationDocumentation,
  DefaultAdvisorObservationConvention,
} from "./observation";

export interface DefaultAroundAdvisorChainProps {
  observationRegistry: ObservationRegistry;
  callAdvisors: CallAdvisor[];
  streamAdvisors: StreamAdvisor[];
  observationConvention?: AdvisorObservationConvention | null;
}

export class DefaultAroundAdvisorChain extends BaseAdvisorChain {
  static readonly DEFAULT_OBSERVATION_CONVENTION =
    new DefaultAdvisorObservationConvention();

  private static readonly CHAT_CLIENT_MESSAGE_AGGREGATOR =
    new ChatClientMessageAggregator();

  private readonly _originalCallAdvisors: CallAdvisor[];
  private readonly _originalStreamAdvisors: StreamAdvisor[];
  private readonly _callAdvisors: CallAdvisor[];
  private readonly _streamAdvisors: StreamAdvisor[];
  private readonly _observationRegistry: ObservationRegistry;
  private readonly _observationConvention: AdvisorObservationConvention;

  constructor(props: DefaultAroundAdvisorChainProps) {
    super();
    assert(
      props.observationRegistry,
      "the observationRegistry must be non-null",
    );
    assert(props.callAdvisors, "the callAdvisors must be non-null");
    assert(props.streamAdvisors, "the streamAdvisors must be non-null");

    this._observationRegistry = props.observationRegistry;
    this._callAdvisors = [...props.callAdvisors];
    this._streamAdvisors = [...props.streamAdvisors];
    this._originalCallAdvisors = [...props.callAdvisors];
    this._originalStreamAdvisors = [...props.streamAdvisors];
    this._observationConvention =
      props.observationConvention ??
      DefaultAroundAdvisorChain.DEFAULT_OBSERVATION_CONVENTION;
  }

  static builder(
    observationRegistry: ObservationRegistry,
  ): DefaultAroundAdvisorChainBuilder {
    return new DefaultAroundAdvisorChainBuilder(observationRegistry);
  }

  override async nextCall(
    chatClientRequest: ChatClientRequest,
  ): Promise<ChatClientResponse> {
    assert(chatClientRequest, "the chatClientRequest cannot be null");

    if (this._callAdvisors.length === 0) {
      throw new Error("No CallAdvisors available to execute");
    }

    // biome-ignore lint/style/noNonNullAssertion: validated by length check above
    const advisor = this._callAdvisors.shift()!;
    const observationContext = new AdvisorObservationContext(
      advisor.name,
      chatClientRequest,
      advisor.order,
    );

    const observation = new AdvisorObservationDocumentation().observation(
      this._observationConvention,
      DefaultAroundAdvisorChain.DEFAULT_OBSERVATION_CONVENTION,
      () => observationContext,
      this._observationRegistry,
    );

    return observation.observe(async () => {
      const chatClientResponse = await advisor.adviseCall(
        chatClientRequest,
        this,
      );
      observationContext.chatClientResponse = chatClientResponse;
      return chatClientResponse;
    });
  }

  override nextStream(
    chatClientRequest: ChatClientRequest,
  ): Observable<ChatClientResponse> {
    assert(chatClientRequest, "the chatClientRequest cannot be null");

    return defer(() => {
      if (this._streamAdvisors.length === 0) {
        return throwError(
          () => new Error("No StreamAdvisors available to execute"),
        );
      }

      // biome-ignore lint/style/noNonNullAssertion: validated by length check above
      const advisor = this._streamAdvisors.shift()!;
      const observationContext = new AdvisorObservationContext(
        advisor.name,
        chatClientRequest,
        advisor.order,
      );

      const observation = new AdvisorObservationDocumentation().observation(
        this._observationConvention,
        DefaultAroundAdvisorChain.DEFAULT_OBSERVATION_CONVENTION,
        () => observationContext,
        this._observationRegistry,
      );

      const chatClientResponse = observation.observeStream(() =>
        advisor.adviseStream(chatClientRequest, this),
      );

      return DefaultAroundAdvisorChain.CHAT_CLIENT_MESSAGE_AGGREGATOR.aggregateChatClientResponse(
        chatClientResponse,
        (aggregated) => {
          observationContext.chatClientResponse = aggregated;
        },
      );
    });
  }

  override copy(after: CallAdvisor): CallAdvisorChain;
  override copy(after: StreamAdvisor): StreamAdvisorChain;
  override copy(
    after: CallAdvisor | StreamAdvisor,
  ): CallAdvisorChain | StreamAdvisorChain {
    assert(after, "The after advisor must not be null");

    const afterCallIndex = this.callAdvisors.indexOf(after as CallAdvisor);
    const afterStreamIndex = this.streamAdvisors.indexOf(
      after as StreamAdvisor,
    );

    if (afterCallIndex < 0 && afterStreamIndex < 0) {
      throw new TypeError(
        `The specified advisor is not part of the chain: ${after.name}`,
      );
    }

    const remainingCallAdvisors =
      afterCallIndex < 0
        ? this.callAdvisors
        : this.callAdvisors.slice(afterCallIndex + 1);
    const remainingStreamAdvisors =
      afterStreamIndex < 0
        ? this.streamAdvisors
        : this.streamAdvisors.slice(afterStreamIndex + 1);

    return new DefaultAroundAdvisorChain({
      observationRegistry: this.observationRegistry,
      callAdvisors: remainingCallAdvisors,
      streamAdvisors: remainingStreamAdvisors,
      observationConvention: this._observationConvention,
    });
  }

  override get callAdvisors(): CallAdvisor[] {
    return [...this._originalCallAdvisors];
  }

  override get streamAdvisors(): StreamAdvisor[] {
    return [...this._originalStreamAdvisors];
  }

  override get observationRegistry(): ObservationRegistry {
    return this._observationRegistry;
  }
}

export class DefaultAroundAdvisorChainBuilder {
  private readonly _observationRegistry: ObservationRegistry;
  private readonly _callAdvisors: CallAdvisor[] = [];
  private readonly _streamAdvisors: StreamAdvisor[] = [];
  private _observationConvention: AdvisorObservationConvention | null = null;

  constructor(observationRegistry: ObservationRegistry) {
    assert(observationRegistry, "the observationRegistry must be non-null");
    this._observationRegistry = observationRegistry;
  }

  observationConvention(
    observationConvention: AdvisorObservationConvention | null,
  ): this {
    this._observationConvention = observationConvention;
    return this;
  }

  push(advisor: Advisor): this {
    assert(advisor, "the advisor must be non-null");
    return this.pushAll([advisor]);
  }

  pushAll(advisors: Advisor[]): this {
    assert(advisors, "the advisors must be non-null");
    assert(
      advisors.every((advisor) => advisor != null),
      "the advisors must not contain null elements",
    );

    if (advisors.length === 0) {
      return this;
    }

    const callAdvisors = advisors.filter(this.isCallAdvisor);
    if (callAdvisors.length > 0) {
      for (const advisor of callAdvisors) {
        this._callAdvisors.unshift(advisor);
      }
    }

    const streamAdvisors = advisors.filter(this.isStreamAdvisor);
    if (streamAdvisors.length > 0) {
      for (const advisor of streamAdvisors) {
        this._streamAdvisors.unshift(advisor);
      }
    }

    this.reOrder();

    return this;
  }

  build(): DefaultAroundAdvisorChain {
    return new DefaultAroundAdvisorChain({
      observationRegistry: this._observationRegistry,
      callAdvisors: this._callAdvisors,
      streamAdvisors: this._streamAdvisors,
      observationConvention: this._observationConvention,
    });
  }

  private reOrder(): void {
    this._callAdvisors.sort((a, b) => a.order - b.order);
    this._streamAdvisors.sort((a, b) => a.order - b.order);
  }

  private isCallAdvisor(advisor: Advisor): advisor is CallAdvisor {
    return typeof (advisor as CallAdvisor).adviseCall === "function";
  }

  private isStreamAdvisor(advisor: Advisor): advisor is StreamAdvisor {
    return typeof (advisor as StreamAdvisor).adviseStream === "function";
  }
}
