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

import {
  AlsObservationRegistry,
  NoopObservationRegistry,
} from "@nestjs-ai/commons";
import {
  AssistantMessage,
  ChatGenerationMetadata,
  ChatResponse,
  Generation,
  Prompt,
} from "@nestjs-ai/model";
import { lastValueFrom, of } from "rxjs";
import { describe, expect, it } from "vitest";
import { ChatClientRequest } from "../../chat-client-request";
import { ChatClientResponse } from "../../chat-client-response";
import type { CallAdvisor, CallAdvisorChain, StreamAdvisor } from "../api";
import { DefaultAroundAdvisorChain } from "../default-around-advisor-chain";

describe("DefaultAroundAdvisorChain", () => {
  it("when observation registry is null then throw", () => {
    expect(() =>
      DefaultAroundAdvisorChain.builder(
        null as unknown as AlsObservationRegistry,
      ).build(),
    ).toThrow("the observationRegistry must be non-null");
  });

  it("when advisor is null then throw", () => {
    expect(() =>
      DefaultAroundAdvisorChain.builder(NoopObservationRegistry.INSTANCE)
        .push(null as unknown as CallAdvisor)
        .build(),
    ).toThrow("the advisor must be non-null");
  });

  it("when advisor list is null then throw", () => {
    expect(() =>
      DefaultAroundAdvisorChain.builder(NoopObservationRegistry.INSTANCE)
        .pushAll(null as unknown as CallAdvisor[])
        .build(),
    ).toThrow("the advisors must be non-null");
  });

  it("when advisor list contains null elements then throw", () => {
    const advisors = [null] as unknown as CallAdvisor[];

    expect(() =>
      DefaultAroundAdvisorChain.builder(NoopObservationRegistry.INSTANCE)
        .pushAll(advisors)
        .build(),
    ).toThrow("the advisors must not contain null elements");
  });

  it("get observation convention is null then use default", () => {
    const chain = DefaultAroundAdvisorChain.builder(
      new AlsObservationRegistry(),
    )
      .observationConvention(null)
      .build();

    expect(chain).toBeDefined();
  });

  it("get observation registry", () => {
    const observationRegistry = new AlsObservationRegistry();
    const chain =
      DefaultAroundAdvisorChain.builder(observationRegistry).build();

    expect(chain.observationRegistry).toBe(observationRegistry);
  });

  it("get call advisors", async () => {
    const mockAdvisor1: CallAdvisor = {
      get name(): string {
        return "advisor1";
      },
      get order(): number {
        return 1;
      },
      async adviseCall(): Promise<ChatClientResponse> {
        return ChatClientResponse.builder().build();
      },
    };
    const mockAdvisor2: CallAdvisor = {
      get name(): string {
        return "advisor2";
      },
      get order(): number {
        return 2;
      },
      async adviseCall(): Promise<ChatClientResponse> {
        return ChatClientResponse.builder().build();
      },
    };

    const advisors = [mockAdvisor1, mockAdvisor2];
    const chain = DefaultAroundAdvisorChain.builder(
      NoopObservationRegistry.INSTANCE,
    )
      .pushAll(advisors)
      .build();

    expect(chain.callAdvisors).toEqual(expect.arrayContaining(advisors));
    expect(chain.callAdvisors).toHaveLength(advisors.length);

    await chain.nextCall(createRequest());
    expect(chain.callAdvisors).toEqual(expect.arrayContaining(advisors));
    expect(chain.callAdvisors).toHaveLength(advisors.length);

    await chain.nextCall(createRequest());
    expect(chain.callAdvisors).toEqual(expect.arrayContaining(advisors));
    expect(chain.callAdvisors).toHaveLength(advisors.length);
  });

  it("get stream advisors", async () => {
    const mockAdvisor1: StreamAdvisor = {
      get name(): string {
        return "advisor1";
      },
      get order(): number {
        return 1;
      },
      adviseStream() {
        return of(createChatClientResponse());
      },
    };
    const mockAdvisor2: StreamAdvisor = {
      get name(): string {
        return "advisor2";
      },
      get order(): number {
        return 2;
      },
      adviseStream() {
        return of(createChatClientResponse());
      },
    };

    const advisors = [mockAdvisor1, mockAdvisor2];
    const chain = DefaultAroundAdvisorChain.builder(
      NoopObservationRegistry.INSTANCE,
    )
      .pushAll(advisors)
      .build();

    expect(chain.streamAdvisors).toEqual(expect.arrayContaining(advisors));
    expect(chain.streamAdvisors).toHaveLength(advisors.length);

    await lastValueFrom(chain.nextStream(createRequest()));
    expect(chain.streamAdvisors).toEqual(expect.arrayContaining(advisors));
    expect(chain.streamAdvisors).toHaveLength(advisors.length);

    await lastValueFrom(chain.nextStream(createRequest()));
    expect(chain.streamAdvisors).toEqual(expect.arrayContaining(advisors));
    expect(chain.streamAdvisors).toHaveLength(advisors.length);
  });

  it("when after advisor is null then throw exception", () => {
    const chain = DefaultAroundAdvisorChain.builder(
      NoopObservationRegistry.INSTANCE,
    ).build();

    expect(() => chain.copy(null as unknown as CallAdvisor)).toThrow(
      "The after advisor must not be null",
    );
  });

  it("when advisor not in chain then throw exception", () => {
    const advisor1 = createMockAdvisor("advisor1", 1);
    const advisor2 = createMockAdvisor("advisor2", 2);
    const notInChain = createMockAdvisor("notInChain", 3);

    const chain = DefaultAroundAdvisorChain.builder(
      NoopObservationRegistry.INSTANCE,
    )
      .pushAll([advisor1, advisor2])
      .build();

    expect(() => chain.copy(notInChain)).toThrow(
      "The specified advisor is not part of the chain",
    );
    expect(() => chain.copy(notInChain)).toThrow("notInChain");
  });

  it("when advisor is last in chain then return empty chain", () => {
    const advisor1 = createMockAdvisor("advisor1", 1);
    const advisor2 = createMockAdvisor("advisor2", 2);
    const advisor3 = createMockAdvisor("advisor3", 3);

    const chain = DefaultAroundAdvisorChain.builder(
      NoopObservationRegistry.INSTANCE,
    )
      .pushAll([advisor1, advisor2, advisor3])
      .build();

    const newChain = chain.copy(advisor3);

    expect(newChain.callAdvisors).toHaveLength(0);
  });

  it("when advisor is first in chain then return chain with remaining advisors", () => {
    const advisor1 = createMockAdvisor("advisor1", 1);
    const advisor2 = createMockAdvisor("advisor2", 2);
    const advisor3 = createMockAdvisor("advisor3", 3);

    const chain = DefaultAroundAdvisorChain.builder(
      NoopObservationRegistry.INSTANCE,
    )
      .pushAll([advisor1, advisor2, advisor3])
      .build();

    const newChain = chain.copy(advisor1);

    expect(newChain.callAdvisors).toHaveLength(2);
    expect(newChain.callAdvisors[0]?.name).toBe("advisor2");
    expect(newChain.callAdvisors[1]?.name).toBe("advisor3");
  });

  it("when advisor is in middle of chain then return chain with remaining advisors", () => {
    const advisor1 = createMockAdvisor("advisor1", 1);
    const advisor2 = createMockAdvisor("advisor2", 2);
    const advisor3 = createMockAdvisor("advisor3", 3);
    const advisor4 = createMockAdvisor("advisor4", 4);

    const chain = DefaultAroundAdvisorChain.builder(
      NoopObservationRegistry.INSTANCE,
    )
      .pushAll([advisor1, advisor2, advisor3, advisor4])
      .build();

    const newChain = chain.copy(advisor2);

    expect(newChain.callAdvisors).toHaveLength(2);
    expect(newChain.callAdvisors[0]?.name).toBe("advisor3");
    expect(newChain.callAdvisors[1]?.name).toBe("advisor4");
  });

  it("when copying chain then original chain remains unchanged", () => {
    const advisor1 = createMockAdvisor("advisor1", 1);
    const advisor2 = createMockAdvisor("advisor2", 2);
    const advisor3 = createMockAdvisor("advisor3", 3);

    const chain = DefaultAroundAdvisorChain.builder(
      NoopObservationRegistry.INSTANCE,
    )
      .pushAll([advisor1, advisor2, advisor3])
      .build();

    const newChain = chain.copy(advisor1);

    expect(chain.callAdvisors).toHaveLength(3);
    expect(chain.callAdvisors[0]?.name).toBe("advisor1");
    expect(chain.callAdvisors[1]?.name).toBe("advisor2");
    expect(chain.callAdvisors[2]?.name).toBe("advisor3");

    expect(newChain.callAdvisors).toHaveLength(2);
    expect(newChain.callAdvisors[0]?.name).toBe("advisor2");
    expect(newChain.callAdvisors[1]?.name).toBe("advisor3");
  });

  it("when copying chain then observation registry is preserved", () => {
    const advisor1 = createMockAdvisor("advisor1", 1);
    const advisor2 = createMockAdvisor("advisor2", 2);

    const customRegistry = new AlsObservationRegistry();
    const chain = DefaultAroundAdvisorChain.builder(customRegistry)
      .pushAll([advisor1, advisor2])
      .build();

    const newChain = chain.copy(advisor1);

    expect(newChain.observationRegistry).toBe(customRegistry);
  });
});

function createMockAdvisor(name: string, order: number): CallAdvisor {
  return {
    get name(): string {
      return name;
    },
    get order(): number {
      return order;
    },
    async adviseCall(
      request: ChatClientRequest,
      chain: CallAdvisorChain,
    ): Promise<ChatClientResponse> {
      return chain.nextCall(request);
    },
  };
}

function createRequest(): ChatClientRequest {
  return ChatClientRequest.builder().prompt(new Prompt("Hello")).build();
}

function createChatClientResponse(): ChatClientResponse {
  const generation = new Generation({
    assistantMessage: AssistantMessage.of("test"),
    chatGenerationMetadata: ChatGenerationMetadata.NULL,
  });
  const chatResponse = new ChatResponse({
    generations: [generation],
  });

  return ChatClientResponse.builder().chatResponse(chatResponse).build();
}
