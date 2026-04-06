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
  HIGHEST_PRECEDENCE,
  LOWEST_PRECEDENCE,
  NoopObservationRegistry,
} from "@nestjs-ai/commons";
import {
  AssistantMessage,
  type ChatOptions,
  ChatResponse,
  DefaultToolCallingChatOptions,
  DefaultToolExecutionResult,
  Generation,
  type Message,
  Prompt,
  SystemMessage,
  type ToolCallingManager,
  ToolResponseMessage,
  UserMessage,
} from "@nestjs-ai/model";
import { firstValueFrom, type Observable, of, toArray } from "rxjs";
import { describe, expect, it, vi } from "vitest";

import { ChatClientRequest } from "../../chat-client-request";
import { ChatClientResponse } from "../../chat-client-response";
import type {
  CallAdvisor,
  CallAdvisorChain,
  StreamAdvisor,
  StreamAdvisorChain,
} from "../api";
import { DefaultAroundAdvisorChain } from "../default-around-advisor-chain";
import {
  ToolCallAdvisor,
  type ToolCallAdvisorProps,
} from "../tool-call-advisor";

class TerminalCallAdvisor implements CallAdvisor {
  private readonly _responseFn: (
    req: ChatClientRequest,
    chain: CallAdvisorChain,
  ) => Promise<ChatClientResponse> | ChatClientResponse;

  constructor(
    responseFn: (
      req: ChatClientRequest,
      chain: CallAdvisorChain,
    ) => Promise<ChatClientResponse> | ChatClientResponse,
  ) {
    this._responseFn = responseFn;
  }

  get name(): string {
    return "terminal";
  }

  get order(): number {
    return 0;
  }

  async adviseCall(
    req: ChatClientRequest,
    chain: CallAdvisorChain,
  ): Promise<ChatClientResponse> {
    return await this._responseFn(req, chain);
  }
}

class TerminalStreamAdvisor implements StreamAdvisor {
  private readonly _responseFn: (
    req: ChatClientRequest,
    chain: StreamAdvisorChain,
  ) => Observable<ChatClientResponse>;

  constructor(
    responseFn: (
      req: ChatClientRequest,
      chain: StreamAdvisorChain,
    ) => Observable<ChatClientResponse>,
  ) {
    this._responseFn = responseFn;
  }

  get name(): string {
    return "terminal-stream";
  }

  get order(): number {
    return 0;
  }

  adviseStream(
    req: ChatClientRequest,
    chain: StreamAdvisorChain,
  ): Observable<ChatClientResponse> {
    return this._responseFn(req, chain);
  }
}

class TestableToolCallAdvisor extends ToolCallAdvisor {
  private readonly _hookCallCounts: [number, number, number] | null;

  constructor(
    props: ToolCallAdvisorProps,
    hookCallCounts: [number, number, number] | null,
  ) {
    super(props);
    this._hookCallCounts = hookCallCounts;
  }

  protected override async doInitializeLoop(
    chatClientRequest: ChatClientRequest,
    callAdvisorChain: CallAdvisorChain,
  ): Promise<ChatClientRequest> {
    if (this._hookCallCounts != null) {
      this._hookCallCounts[0]++;
    }
    return await super.doInitializeLoop(chatClientRequest, callAdvisorChain);
  }

  protected override async doBeforeCall(
    chatClientRequest: ChatClientRequest,
    callAdvisorChain: CallAdvisorChain,
  ): Promise<ChatClientRequest> {
    if (this._hookCallCounts != null) {
      this._hookCallCounts[1]++;
    }
    return await super.doBeforeCall(chatClientRequest, callAdvisorChain);
  }

  protected override async doAfterCall(
    chatClientResponse: ChatClientResponse,
    callAdvisorChain: CallAdvisorChain,
  ): Promise<ChatClientResponse> {
    if (this._hookCallCounts != null) {
      this._hookCallCounts[2]++;
    }
    return await super.doAfterCall(chatClientResponse, callAdvisorChain);
  }
}

describe("ToolCallAdvisor", () => {
  it("when tool calling manager is null then throw", () => {
    expect(() => {
      new ToolCallAdvisor({
        toolCallingManager: null as unknown as ToolCallingManager,
      });
    }).toThrow("toolCallingManager must not be null");
  });

  it("when advisor order is out of range then throw", () => {
    expect(() => {
      new ToolCallAdvisor({ advisorOrder: HIGHEST_PRECEDENCE });
    }).toThrow(
      "advisorOrder must be between HIGHEST_PRECEDENCE and LOWEST_PRECEDENCE",
    );

    expect(() => {
      new ToolCallAdvisor({ advisorOrder: LOWEST_PRECEDENCE });
    }).toThrow(
      "advisorOrder must be between HIGHEST_PRECEDENCE and LOWEST_PRECEDENCE",
    );
  });

  it("test constructor props", () => {
    const customManager = createToolCallingManagerMock();
    const customOrder = HIGHEST_PRECEDENCE + 500;

    const advisor = new ToolCallAdvisor({
      toolCallingManager: customManager,
      advisorOrder: customOrder,
    });

    expect(advisor.order).toBe(customOrder);
    expect(advisor.name).toBe("Tool Calling Advisor");
  });

  it("test default values", () => {
    const advisor = new ToolCallAdvisor();

    expect(advisor.order).toBe(HIGHEST_PRECEDENCE + 300);
    expect(advisor.name).toBe("Tool Calling Advisor");
  });

  it("when chat client request is null then throw", async () => {
    const advisor = new ToolCallAdvisor();

    await expect(
      advisor.adviseCall(
        null as unknown as ChatClientRequest,
        {} as CallAdvisorChain,
      ),
    ).rejects.toThrow("chatClientRequest must not be null");
  });

  it("when call advisor chain is null then throw", async () => {
    const advisor = new ToolCallAdvisor();
    const request = createRequest(true);

    await expect(
      advisor.adviseCall(request, null as unknown as CallAdvisorChain),
    ).rejects.toThrow("callAdvisorChain must not be null");
  });

  it("when options are null then throw", async () => {
    const advisor = new ToolCallAdvisor();
    const request = ChatClientRequest.builder()
      .prompt(new Prompt([UserMessage.of("test")]))
      .build();

    await expect(
      advisor.adviseCall(request, {} as CallAdvisorChain),
    ).rejects.toThrow("ToolCall Advisor requires ToolCallingChatOptions");
  });

  it("when options are not ToolCallingChatOptions then throw", async () => {
    const advisor = new ToolCallAdvisor();
    const nonToolOptions = {
      copy: () => nonToolOptions,
    };
    const request = ChatClientRequest.builder()
      .prompt(
        new Prompt(
          [UserMessage.of("test")],
          nonToolOptions as unknown as ChatOptions,
        ),
      )
      .build();

    await expect(
      advisor.adviseCall(request, {} as CallAdvisorChain),
    ).rejects.toThrow("ToolCall Advisor requires ToolCallingChatOptions");
  });

  it("test advise call without tool calls", async () => {
    const toolCallingManager = createToolCallingManagerMock();
    const advisor = new ToolCallAdvisor({
      toolCallingManager: toolCallingManager,
    });

    const request = createRequest(true);
    const response = createResponse(false);
    const terminalAdvisor = new TerminalCallAdvisor(async () => response);
    const realChain = DefaultAroundAdvisorChain.builder(
      NoopObservationRegistry.INSTANCE,
    )
      .pushAll([advisor, terminalAdvisor])
      .build();

    const result = await advisor.adviseCall(request, realChain);

    expect(result).toBe(response);
    expect(toolCallingManager.executeToolCalls).not.toHaveBeenCalled();
  });

  it("test advise call with null chat response", async () => {
    const toolCallingManager = createToolCallingManagerMock();
    const advisor = new ToolCallAdvisor({
      toolCallingManager: toolCallingManager,
    });
    const request = createRequest(true);
    const responseWithNullChatResponse = ChatClientResponse.builder().build();
    const terminalAdvisor = new TerminalCallAdvisor(
      async () => responseWithNullChatResponse,
    );
    const realChain = DefaultAroundAdvisorChain.builder(
      NoopObservationRegistry.INSTANCE,
    )
      .pushAll([advisor, terminalAdvisor])
      .build();

    const result = await advisor.adviseCall(request, realChain);

    expect(result).toBe(responseWithNullChatResponse);
    expect(toolCallingManager.executeToolCalls).not.toHaveBeenCalled();
  });

  it("test advise call with single tool call iteration", async () => {
    const toolCallingManager = createToolCallingManagerMock();
    const advisor = new ToolCallAdvisor({
      toolCallingManager: toolCallingManager,
    });
    const request = createRequest(true);
    const responseWithToolCall = createResponse(true);
    const finalResponse = createResponse(false);
    let callCount = 0;
    const terminalAdvisor = new TerminalCallAdvisor(async () => {
      callCount++;
      return callCount === 1 ? responseWithToolCall : finalResponse;
    });
    const realChain = DefaultAroundAdvisorChain.builder(
      NoopObservationRegistry.INSTANCE,
    )
      .pushAll([advisor, terminalAdvisor])
      .build();

    toolCallingManager.executeToolCalls.mockResolvedValue(
      new DefaultToolExecutionResult({
        conversationHistory: [
          UserMessage.of("test"),
          AssistantMessage.of(""),
          new ToolResponseMessage(),
        ],
      }),
    );

    const result = await advisor.adviseCall(request, realChain);

    expect(result).toBe(finalResponse);
    expect(callCount).toBe(2);
    expect(toolCallingManager.executeToolCalls).toHaveBeenCalledTimes(1);
  });

  it("test advise call with multiple tool call iterations", async () => {
    const toolCallingManager = createToolCallingManagerMock();
    const advisor = new ToolCallAdvisor({
      toolCallingManager: toolCallingManager,
    });
    const request = createRequest(true);
    const firstToolCallResponse = createResponse(true);
    const secondToolCallResponse = createResponse(true);
    const finalResponse = createResponse(false);
    let callCount = 0;
    const terminalAdvisor = new TerminalCallAdvisor(async () => {
      callCount++;
      if (callCount === 1) return firstToolCallResponse;
      if (callCount === 2) return secondToolCallResponse;
      return finalResponse;
    });
    const realChain = DefaultAroundAdvisorChain.builder(
      NoopObservationRegistry.INSTANCE,
    )
      .pushAll([advisor, terminalAdvisor])
      .build();

    toolCallingManager.executeToolCalls.mockResolvedValue(
      new DefaultToolExecutionResult({
        conversationHistory: [
          UserMessage.of("test"),
          AssistantMessage.of(""),
          new ToolResponseMessage(),
        ],
      }),
    );

    const result = await advisor.adviseCall(request, realChain);

    expect(result).toBe(finalResponse);
    expect(callCount).toBe(3);
    expect(toolCallingManager.executeToolCalls).toHaveBeenCalledTimes(2);
  });

  it("test advise call with return direct tool execution", async () => {
    const toolCallingManager = createToolCallingManagerMock();
    const advisor = new ToolCallAdvisor({
      toolCallingManager: toolCallingManager,
    });
    const request = createRequest(true);
    const responseWithToolCall = createResponse(true);
    const terminalAdvisor = new TerminalCallAdvisor(
      async () => responseWithToolCall,
    );
    const realChain = DefaultAroundAdvisorChain.builder(
      NoopObservationRegistry.INSTANCE,
    )
      .pushAll([advisor, terminalAdvisor])
      .build();

    toolCallingManager.executeToolCalls.mockResolvedValue(
      new DefaultToolExecutionResult({
        conversationHistory: [
          UserMessage.of("test"),
          AssistantMessage.of(""),
          new ToolResponseMessage({
            responses: [
              {
                id: "tool-1",
                name: "testTool",
                responseData: "Tool result data",
              },
            ],
          }),
        ],
        returnDirect: true,
      }),
    );

    const result = await advisor.adviseCall(request, realChain);

    expect(toolCallingManager.executeToolCalls).toHaveBeenCalledTimes(1);
    expect(result.chatResponse).not.toBeNull();
    expect(result.chatResponse?.results).toHaveLength(1);
    expect(result.chatResponse?.results[0]?.output.text).toBe(
      "Tool result data",
    );
    expect(result.chatResponse?.results[0]?.metadata.finishReason).toBe(
      "returnDirect",
    );
  });

  it("test internal tool execution is disabled", async () => {
    const toolCallingManager = createToolCallingManagerMock();
    const advisor = new ToolCallAdvisor({
      toolCallingManager: toolCallingManager,
    });
    const request = createRequest(true);
    const response = createResponse(false);
    let capturedRequest!: ChatClientRequest;

    const capturingAdvisor = new TerminalCallAdvisor(async (req) => {
      capturedRequest = req;
      return response;
    });
    const chain = DefaultAroundAdvisorChain.builder(
      NoopObservationRegistry.INSTANCE,
    )
      .pushAll([advisor, capturingAdvisor])
      .build();

    await advisor.adviseCall(request, chain);

    const options = capturedRequest.prompt
      .options as DefaultToolCallingChatOptions;
    expect(options.internalToolExecutionEnabled).toBe(false);
  });

  it("test advise stream without tool calls", async () => {
    const toolCallingManager = createToolCallingManagerMock();
    const advisor = new ToolCallAdvisor({
      toolCallingManager,
    });
    const request = createRequest(true);
    const response = createResponse(false);
    const terminalAdvisor = new TerminalStreamAdvisor(() => of(response));
    const realChain = DefaultAroundAdvisorChain.builder(
      NoopObservationRegistry.INSTANCE,
    )
      .pushAll([advisor, terminalAdvisor])
      .build();

    const results = await firstValueFrom(
      advisor.adviseStream(request, realChain).pipe(toArray()),
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.chatResponse?.result?.output.text).toBe("response");
    expect(toolCallingManager.executeToolCalls).not.toHaveBeenCalled();
  });

  it("test advise stream with single tool call iteration", async () => {
    const toolCallingManager = createToolCallingManagerMock();
    const advisor = new ToolCallAdvisor({
      toolCallingManager,
    });
    const request = createRequest(true);
    const responseWithToolCall = createResponse(true);
    const finalResponse = createResponse(false);
    let callCount = 0;
    const terminalAdvisor = new TerminalStreamAdvisor(() => {
      callCount++;
      return of(callCount === 1 ? responseWithToolCall : finalResponse);
    });
    const realChain = DefaultAroundAdvisorChain.builder(
      NoopObservationRegistry.INSTANCE,
    )
      .pushAll([advisor, terminalAdvisor])
      .build();

    toolCallingManager.executeToolCalls.mockResolvedValue(
      new DefaultToolExecutionResult({
        conversationHistory: [
          UserMessage.of("test"),
          AssistantMessage.of(""),
          new ToolResponseMessage(),
        ],
      }),
    );

    const results = await firstValueFrom(
      advisor.adviseStream(request, realChain).pipe(toArray()),
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.chatResponse?.result?.output.text).toBe("response");
    expect(results[0]?.chatResponse?.hasToolCalls()).toBe(false);
    expect(callCount).toBe(2);
    expect(toolCallingManager.executeToolCalls).toHaveBeenCalledTimes(1);
  });

  it("test advise stream with stream tool call responses enabled", async () => {
    const toolCallingManager = createToolCallingManagerMock();
    const advisor = new ToolCallAdvisor({
      toolCallingManager,
      streamToolCallResponses: true,
    });
    const request = createRequest(true);
    const responseWithToolCall = createResponse(true);
    const finalResponse = createResponse(false);
    let callCount = 0;
    const terminalAdvisor = new TerminalStreamAdvisor(() => {
      callCount++;
      return of(callCount === 1 ? responseWithToolCall : finalResponse);
    });
    const realChain = DefaultAroundAdvisorChain.builder(
      NoopObservationRegistry.INSTANCE,
    )
      .pushAll([advisor, terminalAdvisor])
      .build();

    toolCallingManager.executeToolCalls.mockResolvedValue(
      new DefaultToolExecutionResult({
        conversationHistory: [
          UserMessage.of("test"),
          AssistantMessage.of(""),
          new ToolResponseMessage(),
        ],
      }),
    );

    const results = await firstValueFrom(
      advisor.adviseStream(request, realChain).pipe(toArray()),
    );

    expect(results).toHaveLength(2);
    expect(results[0]?.chatResponse?.result?.output.text).toBe("response");
    expect(results[0]?.chatResponse?.hasToolCalls()).toBe(true);
    expect(results[1]?.chatResponse?.result?.output.text).toBe("response");
    expect(results[1]?.chatResponse?.hasToolCalls()).toBe(false);
    expect(callCount).toBe(2);
    expect(toolCallingManager.executeToolCalls).toHaveBeenCalledTimes(1);
  });

  it("test get name", () => {
    const advisor = new ToolCallAdvisor();
    expect(advisor.name).toBe("Tool Calling Advisor");
  });

  it("test get order", () => {
    const customOrder = HIGHEST_PRECEDENCE + 400;
    const advisor = new ToolCallAdvisor({ advisorOrder: customOrder });
    expect(advisor.order).toBe(customOrder);
  });

  it("test conversation history enabled default value", async () => {
    const toolCallingManager = createToolCallingManagerMock();
    const advisor = new ToolCallAdvisor({
      toolCallingManager: toolCallingManager,
    });
    const request = createRequest(true);
    const responseWithToolCall = createResponse(true);
    const finalResponse = createResponse(false);
    let callCount = 0;
    const terminalAdvisor = new TerminalCallAdvisor(async () => {
      callCount++;
      return callCount === 1 ? responseWithToolCall : finalResponse;
    });
    const chain = DefaultAroundAdvisorChain.builder(
      NoopObservationRegistry.INSTANCE,
    )
      .pushAll([advisor, terminalAdvisor])
      .build();

    toolCallingManager.executeToolCalls.mockResolvedValue(
      new DefaultToolExecutionResult({
        conversationHistory: [
          UserMessage.of("test"),
          AssistantMessage.of(""),
          new ToolResponseMessage(),
        ],
      }),
    );

    const result = await advisor.adviseCall(request, chain);
    expect(result).toBe(finalResponse);
  });

  it("test conversation history enabled set to false", async () => {
    const toolCallingManager = createToolCallingManagerMock();
    const advisor = new ToolCallAdvisor({
      toolCallingManager: toolCallingManager,
      conversationHistoryEnabled: false,
    });
    const request = createRequest(true);
    const responseWithToolCall = createResponse(true);
    const finalResponse = createResponse(false);
    let callCount = 0;
    const terminalAdvisor = new TerminalCallAdvisor(async () => {
      callCount++;
      return callCount === 1 ? responseWithToolCall : finalResponse;
    });
    const chain = DefaultAroundAdvisorChain.builder(
      NoopObservationRegistry.INSTANCE,
    )
      .pushAll([advisor, terminalAdvisor])
      .build();

    toolCallingManager.executeToolCalls.mockResolvedValue(
      new DefaultToolExecutionResult({
        conversationHistory: [
          UserMessage.of("test"),
          AssistantMessage.of(""),
          new ToolResponseMessage(),
        ],
      }),
    );

    const result = await advisor.adviseCall(request, chain);
    expect(result).toBe(finalResponse);
    expect(toolCallingManager.executeToolCalls).toHaveBeenCalledTimes(1);
  });

  it("test conversation history disabled", async () => {
    const toolCallingManager = createToolCallingManagerMock();
    const advisor = new ToolCallAdvisor({
      toolCallingManager: toolCallingManager,
      conversationHistoryEnabled: false,
    });
    const request = createRequestWithSystemMessage();
    const responseWithToolCall = createResponse(true);
    const finalResponse = createResponse(false);
    let callCount = 0;
    let capturedRequest!: ChatClientRequest;
    const terminalAdvisor = new TerminalCallAdvisor(async (req) => {
      callCount++;
      if (callCount === 2) {
        capturedRequest = req;
      }
      return callCount === 1 ? responseWithToolCall : finalResponse;
    });
    const chain = DefaultAroundAdvisorChain.builder(
      NoopObservationRegistry.INSTANCE,
    )
      .pushAll([advisor, terminalAdvisor])
      .build();

    toolCallingManager.executeToolCalls.mockResolvedValue(
      new DefaultToolExecutionResult({
        conversationHistory: [
          UserMessage.of("test"),
          AssistantMessage.of("assistant response"),
          new ToolResponseMessage(),
        ],
      }),
    );

    await advisor.adviseCall(request, chain);

    const instructions = capturedRequest.prompt.instructions ?? [];
    expect(instructions).toHaveLength(2);
    expect(instructions[0]).toBeInstanceOf(SystemMessage);
    expect(instructions[1]).toBeInstanceOf(ToolResponseMessage);
  });

  it("test extended advisor with custom hooks", async () => {
    const toolCallingManager = createToolCallingManagerMock();
    const hookCallCounts: [number, number, number] = [0, 0, 0];
    const advisor = new TestableToolCallAdvisor(
      {
        toolCallingManager,
        advisorOrder: HIGHEST_PRECEDENCE + 300,
      },
      hookCallCounts,
    );
    const request = createRequest(true);
    const response = createResponse(false);
    const terminalAdvisor = new TerminalCallAdvisor(async () => response);
    const chain = DefaultAroundAdvisorChain.builder(
      NoopObservationRegistry.INSTANCE,
    )
      .pushAll([advisor, terminalAdvisor])
      .build();

    await advisor.adviseCall(request, chain);

    expect(hookCallCounts[0]).toBe(1);
    expect(hookCallCounts[1]).toBe(1);
    expect(hookCallCounts[2]).toBe(1);
  });

  it("test extended advisor hooks called multiple times with tool calls", async () => {
    const toolCallingManager = createToolCallingManagerMock();
    const hookCallCounts: [number, number, number] = [0, 0, 0];
    const advisor = new TestableToolCallAdvisor(
      {
        toolCallingManager,
        advisorOrder: HIGHEST_PRECEDENCE + 300,
      },
      hookCallCounts,
    );
    const request = createRequest(true);
    const responseWithToolCall = createResponse(true);
    const finalResponse = createResponse(false);
    let callCount = 0;
    const terminalAdvisor = new TerminalCallAdvisor(async () => {
      callCount++;
      return callCount === 1 ? responseWithToolCall : finalResponse;
    });
    const chain = DefaultAroundAdvisorChain.builder(
      NoopObservationRegistry.INSTANCE,
    )
      .pushAll([advisor, terminalAdvisor])
      .build();

    toolCallingManager.executeToolCalls.mockResolvedValue(
      new DefaultToolExecutionResult({
        conversationHistory: [
          UserMessage.of("test"),
          AssistantMessage.of(""),
          new ToolResponseMessage(),
        ],
      }),
    );

    await advisor.adviseCall(request, chain);

    expect(hookCallCounts[0]).toBe(1);
    expect(hookCallCounts[1]).toBe(2);
    expect(hookCallCounts[2]).toBe(2);
  });

  it("test extended advisor with constructor props", () => {
    const customManager = createToolCallingManagerMock();
    const customOrder = HIGHEST_PRECEDENCE + 450;

    const advisor = new TestableToolCallAdvisor(
      {
        toolCallingManager: customManager,
        advisorOrder: customOrder,
      },
      null,
    );

    expect(advisor.order).toBe(customOrder);
  });
});

function createToolCallingManagerMock(): {
  executeToolCalls: ReturnType<typeof vi.fn>;
  resolveToolDefinitions: ReturnType<typeof vi.fn>;
} & ToolCallingManager {
  return {
    executeToolCalls: vi.fn(
      async () =>
        new DefaultToolExecutionResult({
          conversationHistory: [
            UserMessage.of("default"),
            new ToolResponseMessage(),
          ],
        }),
    ),
    resolveToolDefinitions: vi.fn(() => []),
  };
}

function createRequest(withToolCallingOptions: boolean): ChatClientRequest {
  const instructions: Message[] = [UserMessage.of("test message")];
  const options = withToolCallingOptions
    ? DefaultToolCallingChatOptions.builder()
        .internalToolExecutionEnabled(true)
        .build()
    : null;
  const prompt =
    options == null
      ? new Prompt(instructions)
      : new Prompt(instructions, options);
  return ChatClientRequest.builder().prompt(prompt).build();
}

function createRequestWithSystemMessage(): ChatClientRequest {
  const instructions: Message[] = [
    SystemMessage.of("You are a helpful assistant"),
    UserMessage.of("test message"),
  ];
  const options = DefaultToolCallingChatOptions.builder()
    .internalToolExecutionEnabled(true)
    .build();
  return ChatClientRequest.builder()
    .prompt(new Prompt(instructions, options))
    .build();
}

function createResponse(hasToolCalls: boolean): ChatClientResponse {
  const chatResponse = new ChatResponse({
    generations: [
      new Generation({
        assistantMessage: new AssistantMessage({
          content: "response",
          toolCalls: hasToolCalls
            ? [
                {
                  id: "tc-1",
                  type: "function",
                  name: "tool-a",
                  arguments: "{}",
                },
              ]
            : [],
        }),
      }),
    ],
  });

  return ChatClientResponse.builder().chatResponse(chatResponse).build();
}
