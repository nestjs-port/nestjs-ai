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

import type {
  GetPromptRequest,
  GetPromptResult,
  Prompt,
  PromptMessage,
} from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";

import {
  McpServerExchange,
  McpTransportContext,
} from "../../../context/index.js";
import { McpPrompt } from "../../../mcp-prompt.js";
import type { McpPromptMethodArguments } from "../../../mcp-prompt.js";
import { McpPromptMethodCallback } from "../mcp-prompt-method-callback.js";

describe("McpPromptMethodCallback", () => {
  it("test callback with mono prompt result", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getPromptWithRequest",
      createPrompt("mono-prompt", "A prompt returning a Promise"),
    );

    const request = createRequest("mono-prompt", { name: "John" });
    const result = await callback.apply(createMockExchange(), request);

    expect(result.description).toBe("Mono prompt");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.role).toBe("assistant");
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: "Async response for John",
    });
  });

  it("test callback with mono string", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getStringPrompt",
      createPrompt("mono-string", "A prompt returning a Promise<string>"),
    );

    const request = createRequest("mono-string", { name: "John" });
    const result = await callback.apply(createMockExchange(), request);

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.role).toBe("assistant");
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: "Async string response for John",
    });
  });

  it("test callback with mono message", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getSingleMessage",
      createPrompt(
        "mono-message",
        "A prompt returning a Promise<PromptMessage>",
      ),
    );

    const request = createRequest("mono-message", { name: "John" });
    const result = await callback.apply(createMockExchange(), request);

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.role).toBe("assistant");
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: "Async single message for John",
    });
  });

  it("test callback with mono message list", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getMessageList",
      createPrompt(
        "mono-message-list",
        "A prompt returning a Promise<PromptMessage[]>",
      ),
    );

    const request = createRequest("mono-message-list", { name: "John" });
    const result = await callback.apply(createMockExchange(), request);

    expect(result.messages).toHaveLength(2);
    expect(result.messages[0]?.role).toBe("assistant");
    expect(result.messages[1]?.role).toBe("assistant");
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: "Async message 1 for John",
    });
    expect(result.messages[1]?.content).toMatchObject({
      type: "text",
      text: "Async message 2 for John",
    });
  });

  it("test callback with mono string list", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getStringList",
      createPrompt(
        "mono-string-list",
        "A prompt returning a Promise<string[]>",
      ),
    );

    const request = createRequest("mono-string-list", { name: "John" });
    const result = await callback.apply(createMockExchange(), request);

    expect(result.messages).toHaveLength(3);
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: "Async string 1 for John",
    });
    expect(result.messages[1]?.content).toMatchObject({
      type: "text",
      text: "Async string 2 for John",
    });
    expect(result.messages[2]?.content).toMatchObject({
      type: "text",
      text: "Async string 3 for John",
    });
  });

  it("test null request", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getPromptWithRequest",
      createPrompt("mono-prompt", "A prompt returning a Promise"),
    );

    await expect(
      callback.apply(createMockExchange(), null as never),
    ).rejects.toThrow("Request must not be null");
  });

  it("test callback with mono meta", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getPromptWithMeta",
      createPrompt("mono-meta-prompt", "A prompt with meta parameter"),
    );

    const request = createRequest(
      "mono-meta-prompt",
      { name: "John" },
      {
        userId: "user123",
        sessionId: "session456",
      },
    );
    const result = await callback.apply(createMockExchange(), request);

    expect(result.description).toBe("Mono meta prompt");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: 'Hello John, Meta: {"userId":"user123","sessionId":"session456"}',
    });
  });

  it("test callback with mono meta null", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getPromptWithMeta",
      createPrompt("mono-meta-prompt", "A prompt with meta parameter"),
    );

    const request = createRequest("mono-meta-prompt", { name: "John" });
    const result = await callback.apply(createMockExchange(), request);

    expect(result.description).toBe("Mono meta prompt");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: "Hello John, Meta: {}",
    });
  });

  it("test callback with mono mixed and meta", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getPromptWithMixedAndMeta",
      createPrompt("mono-mixed-with-meta", "A prompt with mixed args and meta"),
    );

    const request = createRequest(
      "mono-mixed-with-meta",
      { name: "John" },
      {
        userId: "user123",
      },
    );
    const result = await callback.apply(createMockExchange(), request);

    expect(result.description).toBe("Mono mixed with meta prompt");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: 'Hello John from mono-mixed-with-meta, Meta: {"userId":"user123"}',
    });
  });

  it("test method invocation error", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getFailingPrompt",
      createPrompt("failing-prompt", "A prompt that throws an exception"),
    );

    const request = createRequest("failing-prompt", { name: "John" });

    await expect(
      callback.apply(createMockExchange(), request),
    ).rejects.toMatchObject({
      name: "McpPromptMethodException",
      message: "Error invoking prompt method: getFailingPrompt",
    });
  });

  it("test callback with transport context", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getPromptWithTransportContext",
      createPrompt(
        "transport-context-prompt",
        "A prompt with transport context",
      ),
    );

    const context = McpTransportContext.create({ traceId: "trace-1" });
    const exchange = createMockExchange(context);
    const request = createRequest("transport-context-prompt", { name: "John" });
    const result = await callback.apply(exchange, request);

    expect(result.description).toBe("Transport context prompt");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: "Hello with transport context from transport-context-prompt",
    });
  });

  it("test callback with async request context", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getPromptWithRequestContext",
      createPrompt(
        "async-request-context-prompt",
        "A prompt with request context",
      ),
    );

    const request = createRequest("async-request-context-prompt", {
      name: "John",
    });
    const result = await callback.apply(createMockExchange(), request);

    expect(result.description).toBe("Async request context prompt");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: "Hello with request context from async-request-context-prompt",
    });
  });

  it("test callback with async request context and args", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getPromptWithRequestContextAndArgs",
      createPrompt("async-context-with-args", "A prompt with context and args"),
    );

    const request = createRequest("async-context-with-args", { name: "John" });
    const result = await callback.apply(createMockExchange(), request);

    expect(result.description).toBe("Async context with args prompt");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: "Hello John with request context from async-context-with-args",
    });
  });
});

class TestPromptProvider {
  @McpPrompt({
    name: "mono-prompt",
    description: "A prompt returning a Promise",
  })
  async getPromptWithRequest(
    args: McpPromptMethodArguments,
  ): Promise<GetPromptResult> {
    const name = String(args.arguments.name ?? "");
    return {
      description: "Mono prompt",
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `Async response for ${name}`,
          },
        },
      ],
    };
  }

  @McpPrompt({
    name: "mono-string",
    description: "A prompt returning a Promise<string>",
  })
  async getStringPrompt(args: McpPromptMethodArguments): Promise<string> {
    const name = String(args.arguments.name ?? "");
    return `Async string response for ${name}`;
  }

  @McpPrompt({
    name: "mono-message",
    description: "A prompt returning a Promise<PromptMessage>",
  })
  async getSingleMessage(
    args: McpPromptMethodArguments,
  ): Promise<PromptMessage> {
    const name = String(args.arguments.name ?? "");
    return {
      role: "assistant",
      content: {
        type: "text",
        text: `Async single message for ${name}`,
      },
    };
  }

  @McpPrompt({
    name: "mono-message-list",
    description: "A prompt returning a Promise<PromptMessage[]>",
  })
  async getMessageList(
    args: McpPromptMethodArguments,
  ): Promise<PromptMessage[]> {
    const name = String(args.arguments.name ?? "");
    return [
      {
        role: "assistant",
        content: {
          type: "text",
          text: `Async message 1 for ${name}`,
        },
      },
      {
        role: "assistant",
        content: {
          type: "text",
          text: `Async message 2 for ${name}`,
        },
      },
    ];
  }

  @McpPrompt({
    name: "mono-string-list",
    description: "A prompt returning a Promise<string[]>",
  })
  async getStringList(args: McpPromptMethodArguments): Promise<string[]> {
    const name = String(args.arguments.name ?? "");
    return [
      `Async string 1 for ${name}`,
      `Async string 2 for ${name}`,
      `Async string 3 for ${name}`,
    ];
  }

  @McpPrompt({
    name: "mono-meta-prompt",
    description: "A prompt with meta parameter",
  })
  async getPromptWithMeta(
    args: McpPromptMethodArguments,
  ): Promise<GetPromptResult> {
    const name = String(args.arguments.name ?? "");
    const metaInfo = JSON.stringify(args.meta.meta);
    return {
      description: "Mono meta prompt",
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `Hello ${name}, Meta: ${metaInfo}`,
          },
        },
      ],
    };
  }

  @McpPrompt({
    name: "mono-mixed-with-meta",
    description: "A prompt with mixed args and meta",
  })
  async getPromptWithMixedAndMeta(
    args: McpPromptMethodArguments,
  ): Promise<GetPromptResult> {
    const name = String(args.arguments.name ?? "");
    const metaInfo = JSON.stringify(args.meta.meta);
    return {
      description: "Mono mixed with meta prompt",
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `Hello ${name} from ${args.request.params.name}, Meta: ${metaInfo}`,
          },
        },
      ],
    };
  }

  @McpPrompt({
    name: "failing-prompt",
    description: "A prompt that throws an exception",
  })
  async getFailingPrompt(
    _args: McpPromptMethodArguments,
  ): Promise<GetPromptResult> {
    throw new Error("Test exception");
  }

  @McpPrompt({
    name: "transport-context-prompt",
    description: "A prompt with transport context",
  })
  async getPromptWithTransportContext(
    args: McpPromptMethodArguments,
  ): Promise<GetPromptResult> {
    const hasTransportContext = args.context?.get("traceId") === "trace-1";
    return {
      description: "Transport context prompt",
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `Hello ${hasTransportContext ? "with" : "without"} transport context from ${args.request.params.name}`,
          },
        },
      ],
    };
  }

  @McpPrompt({
    name: "async-request-context-prompt",
    description: "A prompt with request context",
  })
  async getPromptWithRequestContext(
    args: McpPromptMethodArguments,
  ): Promise<GetPromptResult> {
    return {
      description: "Async request context prompt",
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `Hello with request context from ${args.request.params.name}`,
          },
        },
      ],
    };
  }

  @McpPrompt({
    name: "async-context-with-args",
    description: "A prompt with context and arguments",
  })
  async getPromptWithRequestContextAndArgs(
    args: McpPromptMethodArguments,
  ): Promise<GetPromptResult> {
    const name = String(args.arguments.name ?? "");
    return {
      description: "Async context with args prompt",
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `Hello ${name} with request context from ${args.request.params.name}`,
          },
        },
      ],
    };
  }
}

function createCallback(
  provider: TestPromptProvider,
  propertyKey: keyof TestPromptProvider,
  prompt: Prompt,
): McpPromptMethodCallback {
  return new McpPromptMethodCallback({
    provider,
    propertyKey,
    prompt,
  });
}

function createPrompt(name: string, description: string): Prompt {
  return {
    name,
    description,
  };
}

function createRequest(
  promptName: string,
  argumentsMap: Record<string, unknown>,
  meta?: Record<string, unknown>,
): GetPromptRequest {
  return {
    params: {
      name: promptName,
      arguments: argumentsMap,
      ...(meta == null ? {} : { _meta: meta }),
    },
  } as unknown as GetPromptRequest;
}

function createMockExchange(
  context: McpTransportContext = McpTransportContext.EMPTY,
): McpServerExchange {
  return Object.assign(Object.create(McpServerExchange.prototype), {
    transportContext: () => context,
  }) as McpServerExchange;
}
