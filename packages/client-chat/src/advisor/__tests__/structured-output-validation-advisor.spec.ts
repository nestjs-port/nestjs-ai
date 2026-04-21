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
  AssistantMessage,
  ChatResponse,
  Generation,
  Prompt,
} from "@nestjs-ai/model";
import {
  HIGHEST_PRECEDENCE,
  LOWEST_PRECEDENCE,
  NoopObservationRegistry,
} from "@nestjs-port/core";
import type { Observable } from "rxjs";
import { firstValueFrom } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ChatClientRequest } from "../../chat-client-request";
import { ChatClientResponse } from "../../chat-client-response";
import type {
  CallAdvisor,
  CallAdvisorChain,
  StreamAdvisor,
  StreamAdvisorChain,
} from "../api";
import { BaseAdvisorChain } from "../api";
import { DefaultAroundAdvisorChain } from "../default-around-advisor-chain";
import { StructuredOutputValidationAdvisor } from "../structured-output-validation-advisor";

class FakeCallAdvisorChain extends BaseAdvisorChain {
  private readonly _responses: ChatClientResponse[];
  readonly requestHistory: ChatClientRequest[] = [];

  constructor(responses: ChatClientResponse[]) {
    super();
    this._responses = [...responses];
  }

  async nextCall(
    chatClientRequest: ChatClientRequest,
  ): Promise<ChatClientResponse> {
    this.requestHistory.push(chatClientRequest);
    const response = this._responses.shift();
    if (response == null) {
      throw new Error("No response configured");
    }
    return response;
  }

  copy(_after: CallAdvisor): CallAdvisorChain;
  copy(_after: StreamAdvisor): StreamAdvisorChain;
  copy(
    _after: CallAdvisor | StreamAdvisor,
  ): CallAdvisorChain | StreamAdvisorChain {
    return this;
  }

  get callAdvisors(): CallAdvisor[] {
    return [];
  }

  get streamAdvisors(): StreamAdvisor[] {
    return [];
  }

  nextStream(
    _chatClientRequest: ChatClientRequest,
  ): Observable<ChatClientResponse> {
    throw new Error("Not implemented");
  }
}

describe("StructuredOutputValidationAdvisor", () => {
  it("when advisor order is out of range then throw", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    expect(() => {
      new StructuredOutputValidationAdvisor({
        outputSchema: schema,
        advisorOrder: HIGHEST_PRECEDENCE,
      });
    }).toThrow(
      "advisorOrder must be between HIGHEST_PRECEDENCE and LOWEST_PRECEDENCE",
    );

    expect(() => {
      new StructuredOutputValidationAdvisor({
        outputSchema: schema,
        advisorOrder: LOWEST_PRECEDENCE,
      });
    }).toThrow(
      "advisorOrder must be between HIGHEST_PRECEDENCE and LOWEST_PRECEDENCE",
    );
  });

  it("when repeat attempts is negative then throw", () => {
    const schema = z.object({
      name: z.string(),
    });

    expect(() => {
      new StructuredOutputValidationAdvisor({
        outputSchema: schema,
        maxRepeatAttempts: -1,
      });
    }).toThrow("maxRepeatAttempts must be greater than or equal to 0");
  });

  it("test default values", () => {
    const schema = z.object({
      name: z.string(),
    });
    const advisor = new StructuredOutputValidationAdvisor({
      outputSchema: schema,
    });

    expect(advisor.order).toBe(LOWEST_PRECEDENCE - 2000);
    expect(advisor.name).toBe("Structured Output Validation Advisor");
  });

  it("when chat client request is null then throw", async () => {
    const schema = z.object({
      name: z.string(),
    });
    const advisor = new StructuredOutputValidationAdvisor({
      outputSchema: schema,
    });
    const chain = new FakeCallAdvisorChain([
      createChatClientResponse('{"name":"John"}'),
    ]);

    await expect(
      advisor.adviseCall(null as unknown as ChatClientRequest, chain),
    ).rejects.toThrow("chatClientRequest must not be null");
  });

  it("when call advisor chain is null then throw", async () => {
    const schema = z.object({
      name: z.string(),
    });
    const advisor = new StructuredOutputValidationAdvisor({
      outputSchema: schema,
    });
    const request = ChatClientRequest.builder()
      .prompt(new Prompt("test message"))
      .build();

    await expect(
      advisor.adviseCall(request, null as unknown as CallAdvisorChain),
    ).rejects.toThrow("callAdvisorChain must not be null");
  });

  it("test advise call with valid json on first attempt", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const advisor = new StructuredOutputValidationAdvisor({
      outputSchema: schema,
      maxRepeatAttempts: 3,
    });
    const validResponse = createChatClientResponse(
      '{"name":"John Doe","age":30}',
    );
    const chain = new FakeCallAdvisorChain([validResponse]);
    const request = ChatClientRequest.builder()
      .prompt(new Prompt("test message"))
      .build();

    const result = await advisor.adviseCall(request, chain);

    expect(result).toBe(validResponse);
    expect(chain.requestHistory).toHaveLength(1);
  });

  it("when output schema is null then throw", () => {
    expect(() => {
      new StructuredOutputValidationAdvisor({
        outputSchema: null as unknown as z.ZodType<unknown>,
      });
    }).toThrow("outputSchema must not be null");
  });

  it("when output is invalid then retries with validation error in user message", async () => {
    const schema = z.object({
      name: z.string(),
    });
    const advisor = new StructuredOutputValidationAdvisor({
      outputSchema: schema,
      maxRepeatAttempts: 1,
    });
    const chain = new FakeCallAdvisorChain([
      createChatClientResponse('{"name":123}'),
      createChatClientResponse('{"name":"James"}'),
    ]);
    const request = ChatClientRequest.builder()
      .prompt(new Prompt("Return person json"))
      .build();

    const response = await advisor.adviseCall(request, chain);

    expect(response.chatResponse?.result?.output?.text).toBe(
      '{"name":"James"}',
    );
    expect(chain.requestHistory).toHaveLength(2);
    expect(chain.requestHistory[0]?.prompt.userMessage.text).toBe(
      "Return person json",
    );
    expect(chain.requestHistory[1]?.prompt.userMessage.text).toContain(
      "Output JSON validation failed because of:",
    );
  });

  it("when max repeat attempts is zero then does not retry", async () => {
    const schema = z.object({
      name: z.string(),
    });
    const advisor = new StructuredOutputValidationAdvisor({
      outputSchema: schema,
      maxRepeatAttempts: 0,
    });
    const chain = new FakeCallAdvisorChain([createChatClientResponse("{}")]);
    const request = ChatClientRequest.builder().prompt(new Prompt("Q")).build();

    await advisor.adviseCall(request, chain);

    expect(chain.requestHistory).toHaveLength(1);
  });

  it("test advise call exhausts all retries", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const advisor = new StructuredOutputValidationAdvisor({
      outputSchema: schema,
      maxRepeatAttempts: 2,
    });
    const invalidResponse = createChatClientResponse('{"invalid":"json"}');
    const chain = new FakeCallAdvisorChain([
      invalidResponse,
      invalidResponse,
      invalidResponse,
    ]);
    const request = ChatClientRequest.builder()
      .prompt(new Prompt("test message"))
      .build();

    const result = await advisor.adviseCall(request, chain);

    expect(result).toBe(invalidResponse);
    // Initial attempt + 2 retries = 3 total calls
    expect(chain.requestHistory).toHaveLength(3);
  });

  it("test advise call with null chat response", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const advisor = new StructuredOutputValidationAdvisor({
      outputSchema: schema,
      maxRepeatAttempts: 1,
    });
    const nullResponse = ChatClientResponse.builder()
      .chatResponse(null)
      .build();
    const validResponse = createChatClientResponse(
      '{"name":"John Doe","age":30}',
    );
    const chain = new FakeCallAdvisorChain([nullResponse, validResponse]);
    const request = ChatClientRequest.builder()
      .prompt(new Prompt("test message"))
      .build();

    const result = await advisor.adviseCall(request, chain);

    expect(result).toBe(validResponse);
    expect(chain.requestHistory).toHaveLength(2);
  });

  it("test advise call with null result", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const advisor = new StructuredOutputValidationAdvisor({
      outputSchema: schema,
      maxRepeatAttempts: 1,
    });
    const nullResultResponse = createChatClientResponseWithNoResult();
    const validResponse = createChatClientResponse(
      '{"name":"John Doe","age":30}',
    );
    const chain = new FakeCallAdvisorChain([nullResultResponse, validResponse]);
    const request = ChatClientRequest.builder()
      .prompt(new Prompt("test message"))
      .build();

    const result = await advisor.adviseCall(request, chain);

    expect(result).toBe(validResponse);
    expect(chain.requestHistory).toHaveLength(2);
  });

  it("test advise call with complex type", async () => {
    const schema = z.object({
      street: z.string(),
      city: z.string(),
      zipCode: z.string(),
    });
    const advisor = new StructuredOutputValidationAdvisor({
      outputSchema: schema,
      maxRepeatAttempts: 2,
    });
    const validResponse = createChatClientResponse(
      '{"street":"123 Main St","city":"Springfield","zipCode":"12345"}',
    );
    const chain = new FakeCallAdvisorChain([validResponse]);
    const request = ChatClientRequest.builder()
      .prompt(new Prompt("test message"))
      .build();

    const result = await advisor.adviseCall(request, chain);

    expect(result).toBe(validResponse);
  });

  it("stream is unsupported", async () => {
    const schema = z.object({
      name: z.string(),
    });
    const advisor = new StructuredOutputValidationAdvisor({
      outputSchema: schema,
    });

    await expect(
      firstValueFrom(
        advisor.adviseStream(
          ChatClientRequest.builder().prompt(new Prompt("Q")).build(),
          {} as StreamAdvisorChain,
        ),
      ),
    ).rejects.toThrow(
      "The Structured Output Validation Advisor does not support streaming.",
    );
  });

  it("returns fixed advisor name", () => {
    const schema = z.object({
      name: z.string(),
    });
    const advisor = new StructuredOutputValidationAdvisor({
      outputSchema: schema,
    });

    expect(advisor.name).toBe("Structured Output Validation Advisor");
  });

  it("test get order", () => {
    const schema = z.object({
      name: z.string(),
    });
    const customOrder = HIGHEST_PRECEDENCE + 1500;
    const advisor = new StructuredOutputValidationAdvisor({
      outputSchema: schema,
      advisorOrder: customOrder,
    });

    expect(advisor.order).toBe(customOrder);
  });

  it("test multiple retries with different invalid responses", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const advisor = new StructuredOutputValidationAdvisor({
      outputSchema: schema,
      maxRepeatAttempts: 3,
    });
    const chain = new FakeCallAdvisorChain([
      createChatClientResponse("{}"),
      createChatClientResponse('{"name":"John Doe"}'),
      createChatClientResponse('{"name":"John Doe","age":"thirty"}'),
      createChatClientResponse('{"name":"John Doe","age":30}'),
    ]);
    const request = ChatClientRequest.builder()
      .prompt(new Prompt("test message"))
      .build();

    const result = await advisor.adviseCall(request, chain);

    expect(result.chatResponse?.result?.output?.text).toBe(
      '{"name":"John Doe","age":30}',
    );
    expect(chain.requestHistory).toHaveLength(4);
  });

  it("test validation with empty json string", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const advisor = new StructuredOutputValidationAdvisor({
      outputSchema: schema,
      maxRepeatAttempts: 1,
    });
    const emptyResponse = createChatClientResponse("");
    const validResponse = createChatClientResponse(
      '{"name":"John Doe","age":30}',
    );
    const chain = new FakeCallAdvisorChain([emptyResponse, validResponse]);
    const request = ChatClientRequest.builder()
      .prompt(new Prompt("test message"))
      .build();

    const result = await advisor.adviseCall(request, chain);

    expect(result).toBe(validResponse);
    expect(chain.requestHistory).toHaveLength(2);
  });

  it("test validation with malformed json", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const advisor = new StructuredOutputValidationAdvisor({
      outputSchema: schema,
      maxRepeatAttempts: 1,
    });
    // Missing quotes around age key
    const malformedResponse = createChatClientResponse(
      '{"name":"John", age:30}',
    );
    const validResponse = createChatClientResponse(
      '{"name":"John Doe","age":30}',
    );
    const chain = new FakeCallAdvisorChain([malformedResponse, validResponse]);
    const request = ChatClientRequest.builder()
      .prompt(new Prompt("test message"))
      .build();

    const result = await advisor.adviseCall(request, chain);

    expect(result).toBe(validResponse);
    expect(chain.requestHistory).toHaveLength(2);
  });

  it("test validation with extra fields", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const advisor = new StructuredOutputValidationAdvisor({
      outputSchema: schema,
      maxRepeatAttempts: 0,
    });
    // JSON with extra fields that aren't in the Person class
    const response = createChatClientResponse(
      '{"name":"John Doe","age":30,"extraField":"value"}',
    );
    const chain = new FakeCallAdvisorChain([response]);
    const request = ChatClientRequest.builder()
      .prompt(new Prompt("test message"))
      .build();

    const result = await advisor.adviseCall(request, chain);

    // Should still be valid as extra fields are typically allowed
    expect(result).toBe(response);
  });

  it("test validation with nested object", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
      address: z.object({
        street: z.string(),
        city: z.string(),
        zipCode: z.string(),
      }),
    });
    const advisor = new StructuredOutputValidationAdvisor({
      outputSchema: schema,
      maxRepeatAttempts: 2,
    });
    const validResponse = createChatClientResponse(
      '{"name":"John Doe","age":30,"address":{"street":"123 Main St","city":"Springfield","zipCode":"12345"}}',
    );
    const chain = new FakeCallAdvisorChain([validResponse]);
    const request = ChatClientRequest.builder()
      .prompt(new Prompt("test message"))
      .build();

    const result = await advisor.adviseCall(request, chain);

    expect(result).toBe(validResponse);
  });

  it("test validation with invalid nested object", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
      address: z.object({
        street: z.string(),
        city: z.string(),
        zipCode: z.string(),
      }),
    });
    const advisor = new StructuredOutputValidationAdvisor({
      outputSchema: schema,
      maxRepeatAttempts: 1,
    });
    // Missing required fields in nested address object
    const invalidResponse = createChatClientResponse(
      '{"name":"John Doe","age":30,"address":{"street":"123 Main St"}}',
    );
    const validResponse = createChatClientResponse(
      '{"name":"John Doe","age":30,"address":{"street":"123 Main St","city":"Springfield","zipCode":"12345"}}',
    );
    const chain = new FakeCallAdvisorChain([invalidResponse, validResponse]);
    const request = ChatClientRequest.builder()
      .prompt(new Prompt("test message"))
      .build();

    const result = await advisor.adviseCall(request, chain);

    expect(result).toBe(validResponse);
    expect(chain.requestHistory).toHaveLength(2);
  });

  it("test validation with list type", async () => {
    const schema = z.array(
      z.object({
        name: z.string(),
        age: z.number(),
      }),
    );
    const advisor = new StructuredOutputValidationAdvisor({
      outputSchema: schema,
      maxRepeatAttempts: 1,
    });
    const validResponse = createChatClientResponse(
      '[{"name":"John Doe","age":30},{"name":"Jane Doe","age":25}]',
    );
    const chain = new FakeCallAdvisorChain([validResponse]);
    const request = ChatClientRequest.builder()
      .prompt(new Prompt("test message"))
      .build();

    const result = await advisor.adviseCall(request, chain);

    expect(result).toBe(validResponse);
  });

  it("test validation with invalid list type", async () => {
    const schema = z.array(
      z.object({
        name: z.string(),
        age: z.number(),
      }),
    );
    const advisor = new StructuredOutputValidationAdvisor({
      outputSchema: schema,
      maxRepeatAttempts: 1,
    });
    // One person in the list is missing the age field
    const invalidResponse = createChatClientResponse(
      '[{"name":"John Doe","age":30},{"name":"Jane Doe"}]',
    );
    const validResponse = createChatClientResponse(
      '[{"name":"John Doe","age":30},{"name":"Jane Doe","age":25}]',
    );
    const chain = new FakeCallAdvisorChain([invalidResponse, validResponse]);
    const request = ChatClientRequest.builder()
      .prompt(new Prompt("test message"))
      .build();

    const result = await advisor.adviseCall(request, chain);

    expect(result).toBe(validResponse);
    expect(chain.requestHistory).toHaveLength(2);
  });

  it("test validation with wrong type in field", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const advisor = new StructuredOutputValidationAdvisor({
      outputSchema: schema,
      maxRepeatAttempts: 1,
    });
    // Age is a string instead of an integer
    const invalidResponse = createChatClientResponse(
      '{"name":"John Doe","age":"thirty"}',
    );
    const validResponse = createChatClientResponse(
      '{"name":"John Doe","age":30}',
    );
    const chain = new FakeCallAdvisorChain([invalidResponse, validResponse]);
    const request = ChatClientRequest.builder()
      .prompt(new Prompt("test message"))
      .build();

    const result = await advisor.adviseCall(request, chain);

    expect(result).toBe(validResponse);
    expect(chain.requestHistory).toHaveLength(2);
  });

  it("test advisor ordering in chain", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const customOrder = HIGHEST_PRECEDENCE + 1000;
    const advisor = new StructuredOutputValidationAdvisor({
      outputSchema: schema,
      advisorOrder: customOrder,
    });
    const request = ChatClientRequest.builder()
      .prompt(new Prompt("test message"))
      .build();
    const validResponse = createChatClientResponse(
      '{"name":"John Doe","age":30}',
    );

    // Create another advisor with different order
    const otherAdvisor: CallAdvisor = {
      get name(): string {
        return "other";
      },
      get order(): number {
        return HIGHEST_PRECEDENCE + 500;
      },
      adviseCall(req, chain): Promise<ChatClientResponse> {
        return chain.nextCall(req);
      },
    };

    const terminalAdvisor: CallAdvisor = {
      get name(): string {
        return "terminal";
      },
      get order(): number {
        return LOWEST_PRECEDENCE;
      },
      async adviseCall(): Promise<ChatClientResponse> {
        return validResponse;
      },
    };

    const realChain = DefaultAroundAdvisorChain.builder(
      NoopObservationRegistry.INSTANCE,
    )
      .pushAll([otherAdvisor, advisor, terminalAdvisor])
      .build();

    const result = await realChain.nextCall(request);

    expect(result).toBe(validResponse);
  });

  it("copy is called for every invocation", async () => {
    const schema = z.object({
      name: z.string(),
    });
    const advisor = new StructuredOutputValidationAdvisor({
      outputSchema: schema,
      maxRepeatAttempts: 1,
    });
    const callAdvisorChain = {
      copy: vi.fn().mockReturnThis(),
      nextCall: vi
        .fn()
        .mockResolvedValueOnce(createChatClientResponse('{"name":123}'))
        .mockResolvedValueOnce(createChatClientResponse('{"name":"ok"}')),
      callAdvisors: [],
    } as unknown as CallAdvisorChain;
    const request = ChatClientRequest.builder().prompt(new Prompt("Q")).build();

    await advisor.adviseCall(request, callAdvisorChain);

    expect(callAdvisorChain.copy).toHaveBeenCalledTimes(2);
    expect(callAdvisorChain.nextCall).toHaveBeenCalledTimes(2);
  });
});

function createChatClientResponse(content: string): ChatClientResponse {
  return ChatClientResponse.builder()
    .chatResponse(
      new ChatResponse({
        generations: [
          new Generation({
            assistantMessage: AssistantMessage.of(content),
          }),
        ],
      }),
    )
    .build();
}

function createChatClientResponseWithNoResult(): ChatClientResponse {
  return ChatClientResponse.builder()
    .chatResponse(
      new ChatResponse({
        generations: [],
      }),
    )
    .build();
}
