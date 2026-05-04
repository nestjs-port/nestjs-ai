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

import "reflect-metadata";

import type {
  GetPromptRequest,
  GetPromptResult,
  Prompt,
  PromptMessage,
} from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";

import { McpTransportContext } from "../../../context/index.js";
import { McpPrompt } from "../../../mcp-prompt.js";
import type { McpPromptMethodContext } from "../../../mcp-prompt.js";
import { McpStatelessPromptMethodCallback } from "../mcp-stateless-prompt-method-callback.js";

describe("McpStatelessPromptMethodCallback", () => {
  it("test callback with request parameter", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getPromptWithRequest",
      createPrompt("greeting", "A simple greeting prompt"),
    );

    const context = createContext();
    const request = createRequest("greeting", { name: "John" });

    const result = await callback.apply(context, request);

    expect(result.description).toBe("Greeting prompt");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.role).toBe("assistant");
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: "Hello from greeting",
    });
  });

  it("test callback with context and request parameters", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getPromptWithContext",
      createPrompt("context-greeting", "A greeting prompt with context"),
    );

    const context = createContext({ traceId: "trace-1" });
    const request = createRequest("context-greeting", { name: "John" });

    const result = await callback.apply(context, request);

    expect(result.description).toBe("Greeting with context");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: "Hello with context from context-greeting (trace-1)",
    });
  });

  it("test callback with arguments map", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getPromptWithArguments",
      createPrompt("arguments-greeting", "A greeting prompt with arguments"),
    );

    const context = createContext();
    const request = createRequest("arguments-greeting", { name: "John" });

    const result = await callback.apply(context, request);

    expect(result.description).toBe("Greeting with arguments");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: "Hello John from arguments",
    });
  });

  it("test callback with individual arguments", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getPromptWithIndividualArgs",
      createPrompt("individual-args", "A prompt with individual arguments"),
    );

    const context = createContext();
    const request = createRequest("individual-args", {
      name: "John",
      age: 30,
    });

    const result = await callback.apply(context, request);

    expect(result.description).toBe("Individual arguments prompt");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: "Hello John, you are 30 years old",
    });
  });

  it("test callback with mixed arguments", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getPromptWithMixedArgs",
      createPrompt("mixed-args", "A prompt with mixed argument types"),
    );

    const context = createContext({ traceId: "trace-1" });
    const request = createRequest("mixed-args", {
      name: "John",
      age: 30,
    });

    const result = await callback.apply(context, request);

    expect(result.description).toBe("Mixed arguments prompt");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: "Hello John, you are 30 years old (with context)",
    });
  });

  it("test callback with messages list", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getPromptMessagesList",
      createPrompt("list-messages", "A prompt returning a list of messages"),
    );

    const context = createContext();
    const request = createRequest("list-messages", { name: "John" });

    const result = await callback.apply(context, request);

    expect(result.description).toBeUndefined();
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0]?.role).toBe("assistant");
    expect(result.messages[1]?.role).toBe("assistant");
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: "Message 1 for John",
    });
    expect(result.messages[1]?.content).toMatchObject({
      type: "text",
      text: "Message 2 for John",
    });
  });

  it("test callback with string return", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getStringPrompt",
      createPrompt("string-prompt", "A prompt returning a string"),
    );

    const context = createContext();
    const request = createRequest("string-prompt", { name: "John" });

    const result = await callback.apply(context, request);

    expect(result.description).toBeUndefined();
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: "Simple string response for string-prompt",
    });
  });

  it("test callback with single message", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getSingleMessage",
      createPrompt("single-message", "A prompt returning a single message"),
    );

    const context = createContext();
    const request = createRequest("single-message", { name: "John" });

    const result = await callback.apply(context, request);

    expect(result.description).toBeUndefined();
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: "Single message for single-message",
    });
  });

  it("test callback with string list", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getStringList",
      createPrompt("string-list", "A prompt returning a list of strings"),
    );

    const context = createContext();
    const request = createRequest("string-list", { name: "John" });

    const result = await callback.apply(context, request);

    expect(result.description).toBeUndefined();
    expect(result.messages).toHaveLength(3);
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: "String 1 for John",
    });
    expect(result.messages[1]?.content).toMatchObject({
      type: "text",
      text: "String 2 for John",
    });
    expect(result.messages[2]?.content).toMatchObject({
      type: "text",
      text: "String 3 for John",
    });
  });

  it("test callback with mono prompt result", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getMonoPrompt",
      createPrompt("mono-prompt", "A prompt returning a Promise"),
    );

    const context = createContext();
    const request = createRequest("mono-prompt", { name: "John" });

    const result = await callback.apply(context, request);

    expect(result.description).toBe("Mono prompt");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: "Async response for John",
    });
  });

  it("test callback with mono string", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getMonoString",
      createPrompt("mono-string", "A prompt returning a Promise<string>"),
    );

    const context = createContext();
    const request = createRequest("mono-string", { name: "John" });

    const result = await callback.apply(context, request);

    expect(result.description).toBeUndefined();
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: "Async string response for John",
    });
  });

  it("test callback with mono message", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getMonoMessage",
      createPrompt(
        "mono-message",
        "A prompt returning a Promise<PromptMessage>",
      ),
    );

    const context = createContext();
    const request = createRequest("mono-message", { name: "John" });

    const result = await callback.apply(context, request);

    expect(result.description).toBeUndefined();
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: "Async single message for John",
    });
  });

  it("test callback with mono message list", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getMonoMessageList",
      createPrompt(
        "mono-message-list",
        "A prompt returning a Promise<PromptMessage[]>",
      ),
    );

    const context = createContext();
    const request = createRequest("mono-message-list", { name: "John" });

    const result = await callback.apply(context, request);

    expect(result.description).toBeUndefined();
    expect(result.messages).toHaveLength(2);
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
      "getMonoStringList",
      createPrompt(
        "mono-string-list",
        "A prompt returning a Promise<string[]>",
      ),
    );

    const context = createContext();
    const request = createRequest("mono-string-list", { name: "John" });

    const result = await callback.apply(context, request);

    expect(result.description).toBeUndefined();
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
      "getMonoPrompt",
      createPrompt("mono-prompt", "A prompt returning a Promise"),
    );

    await expect(
      callback.apply(createContext(), null as never),
    ).rejects.toThrow("Request must not be null");
  });

  it("test callback with async stateless meta", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getMonoPromptWithMeta",
      createPrompt(
        "async-stateless-meta-prompt",
        "A prompt with meta parameter",
      ),
    );

    const context = createContext();
    const request = createRequest(
      "async-stateless-meta-prompt",
      { name: "John" },
      {
        userId: "user123",
        sessionId: "session456",
      },
    );

    const result = await callback.apply(context, request);

    expect(result.description).toBe("Async stateless meta prompt");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: 'Hello John, Meta: {"userId":"user123","sessionId":"session456"}',
    });
  });

  it("test callback with async stateless meta null", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getMonoPromptWithMeta",
      createPrompt(
        "async-stateless-meta-prompt",
        "A prompt with meta parameter",
      ),
    );

    const context = createContext();
    const request = createRequest("async-stateless-meta-prompt", {
      name: "John",
    });

    const result = await callback.apply(context, request);

    expect(result.description).toBe("Async stateless meta prompt");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: "Hello John, Meta: {}",
    });
  });

  it("test callback with async stateless mixed and meta", async () => {
    const provider = new TestPromptProvider();
    const callback = createCallback(
      provider,
      "getMonoPromptWithMixedAndMeta",
      createPrompt(
        "async-stateless-mixed-with-meta",
        "A prompt with mixed args and meta",
      ),
    );

    const context = createContext();
    const request = createRequest(
      "async-stateless-mixed-with-meta",
      { name: "John" },
      {
        userId: "user123",
      },
    );

    const result = await callback.apply(context, request);

    expect(result.description).toBe("Async stateless mixed with meta prompt");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.content).toMatchObject({
      type: "text",
      text: 'Hello John from async-stateless-mixed-with-meta, Meta: {"userId":"user123"}',
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
      callback.apply(createContext(), request),
    ).rejects.toMatchObject({
      name: "McpPromptMethodException",
      message: "Error invoking prompt method: getFailingPrompt",
    });
  });
});

class TestPromptProvider {
  @McpPrompt({
    name: "greeting",
    description: "A simple greeting prompt",
  })
  async getPromptWithRequest(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<GetPromptResult> {
    return {
      description: "Greeting prompt",
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `Hello from ${methodContext.request.params.name}`,
          },
        },
      ],
    };
  }

  @McpPrompt({
    name: "context-greeting",
    description: "A greeting prompt with context",
  })
  async getPromptWithContext(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<GetPromptResult> {
    const traceId = String(
      methodContext.transportContext?.get("traceId") ?? "",
    );
    return {
      description: "Greeting with context",
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `Hello with context from ${methodContext.request.params.name}${traceId ? ` (${traceId})` : ""}`,
          },
        },
      ],
    };
  }

  @McpPrompt({
    name: "arguments-greeting",
    description: "A greeting prompt with arguments",
  })
  async getPromptWithArguments(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<GetPromptResult> {
    const name = String(
      methodContext.request.params.arguments?.name ?? "unknown",
    );
    return {
      description: "Greeting with arguments",
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `Hello ${name} from arguments`,
          },
        },
      ],
    };
  }

  @McpPrompt({
    name: "individual-args",
    description: "A prompt with individual arguments",
  })
  async getPromptWithIndividualArgs(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<GetPromptResult> {
    const name = String(methodContext.request.params.arguments?.name ?? "");
    const age = Number(methodContext.request.params.arguments?.age ?? 0);
    return {
      description: "Individual arguments prompt",
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `Hello ${name}, you are ${age} years old`,
          },
        },
      ],
    };
  }

  @McpPrompt({
    name: "mixed-args",
    description: "A prompt with mixed argument types",
  })
  async getPromptWithMixedArgs(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<GetPromptResult> {
    const name = String(methodContext.request.params.arguments?.name ?? "");
    const age = Number(methodContext.request.params.arguments?.age ?? 0);
    return {
      description: "Mixed arguments prompt",
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `Hello ${name}, you are ${age} years old (with context)`,
          },
        },
      ],
    };
  }

  @McpPrompt({
    name: "list-messages",
    description: "A prompt returning a list of messages",
  })
  async getPromptMessagesList(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<PromptMessage[]> {
    const name = String(methodContext.request.params.arguments?.name ?? "");
    return [
      {
        role: "assistant",
        content: {
          type: "text",
          text: `Message 1 for ${name}`,
        },
      },
      {
        role: "assistant",
        content: {
          type: "text",
          text: `Message 2 for ${name}`,
        },
      },
    ];
  }

  @McpPrompt({
    name: "string-prompt",
    description: "A prompt returning a string",
  })
  async getStringPrompt(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<string> {
    return `Simple string response for ${methodContext.request.params.name}`;
  }

  @McpPrompt({
    name: "single-message",
    description: "A prompt returning a single message",
  })
  async getSingleMessage(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<PromptMessage> {
    return {
      role: "assistant",
      content: {
        type: "text",
        text: `Single message for ${methodContext.request.params.name}`,
      },
    };
  }

  @McpPrompt({
    name: "string-list",
    description: "A prompt returning a list of strings",
  })
  async getStringList(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<string[]> {
    const name = String(methodContext.request.params.arguments?.name ?? "");
    return [
      `String 1 for ${name}`,
      `String 2 for ${name}`,
      `String 3 for ${name}`,
    ];
  }

  @McpPrompt({
    name: "mono-prompt",
    description: "A prompt returning a Promise",
  })
  async getMonoPrompt(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<GetPromptResult> {
    const name = String(methodContext.request.params.arguments?.name ?? "");
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
  async getMonoString(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<string> {
    const name = String(methodContext.request.params.arguments?.name ?? "");
    return `Async string response for ${name}`;
  }

  @McpPrompt({
    name: "mono-message",
    description: "A prompt returning a Promise<PromptMessage>",
  })
  async getMonoMessage(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<PromptMessage> {
    const name = String(methodContext.request.params.arguments?.name ?? "");
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
  async getMonoMessageList(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<PromptMessage[]> {
    const name = String(methodContext.request.params.arguments?.name ?? "");
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
  async getMonoStringList(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<string[]> {
    const name = String(methodContext.request.params.arguments?.name ?? "");
    return [
      `Async string 1 for ${name}`,
      `Async string 2 for ${name}`,
      `Async string 3 for ${name}`,
    ];
  }

  @McpPrompt({
    name: "async-stateless-meta-prompt",
    description: "A prompt with meta parameter",
  })
  async getMonoPromptWithMeta(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<GetPromptResult> {
    const name = String(methodContext.request.params.arguments?.name ?? "");
    const metaInfo = JSON.stringify(methodContext.meta.meta);
    return {
      description: "Async stateless meta prompt",
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
    name: "async-stateless-mixed-with-meta",
    description: "A prompt with mixed args and meta",
  })
  async getMonoPromptWithMixedAndMeta(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<GetPromptResult> {
    const name = String(methodContext.request.params.arguments?.name ?? "");
    const metaInfo = JSON.stringify(methodContext.meta.meta);
    return {
      description: "Async stateless mixed with meta prompt",
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `Hello ${name} from ${methodContext.request.params.name}, Meta: ${metaInfo}`,
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
    _args: {},
    _methodContext: McpPromptMethodContext,
  ): Promise<GetPromptResult> {
    throw new Error("Test exception");
  }
}

function createCallback(
  provider: TestPromptProvider,
  propertyKey: keyof TestPromptProvider,
  prompt: Prompt,
): McpStatelessPromptMethodCallback {
  return new McpStatelessPromptMethodCallback({
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

function createContext(
  metadata: Record<string, unknown> = {},
): McpTransportContext {
  return McpTransportContext.create(metadata);
}
