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
import { z } from "zod";
import { describe, expect, it } from "vitest";

import {
  McpServerExchange,
  McpTransportContext,
} from "../../../context/index.js";
import { McpPrompt } from "../../../mcp-prompt.js";
import type {
  McpPromptArgumentsFor,
  McpPromptMethodContext,
} from "../../../mcp-prompt.js";
import { McpPromptMethodCallback } from "../mcp-prompt-method-callback.js";

const ExamplePromptArgsSchema = z.object({
  name: z.string(),
  enabled: z.boolean(),
});

describe("McpPromptMethodCallback", () => {
  describe("result conversion", () => {
    it("returns Promise<GetPromptResult> as-is", async () => {
      const provider = new TestPromptProvider();
      const callback = createCallback(
        provider,
        "returnPromptResult",
        createPrompt("prompt-result", "A prompt returning a Promise"),
      );

      const result = await callback.apply(
        createMockExchange(),
        createRequest("prompt-result", { name: "John" }),
      );

      expect(result.description).toBe("Prompt result");
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.role).toBe("assistant");
      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: "Async response for John",
      });
    });

    it("wraps Promise<string> as a single assistant message", async () => {
      const provider = new TestPromptProvider();
      const callback = createCallback(
        provider,
        "returnString",
        createPrompt("string", "A prompt returning Promise<string>"),
      );

      const result = await callback.apply(
        createMockExchange(),
        createRequest("string", { name: "John" }),
      );

      expect(result.description).toBeUndefined();
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.role).toBe("assistant");
      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: "Async string response for John",
      });
    });

    it("wraps Promise<PromptMessage> as a single-message array", async () => {
      const provider = new TestPromptProvider();
      const callback = createCallback(
        provider,
        "returnSingleMessage",
        createPrompt(
          "single-message",
          "A prompt returning Promise<PromptMessage>",
        ),
      );

      const result = await callback.apply(
        createMockExchange(),
        createRequest("single-message", { name: "John" }),
      );

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: "Async single message for John",
      });
    });

    it("returns Promise<PromptMessage[]> as the messages array", async () => {
      const provider = new TestPromptProvider();
      const callback = createCallback(
        provider,
        "returnMessageList",
        createPrompt(
          "message-list",
          "A prompt returning Promise<PromptMessage[]>",
        ),
      );

      const result = await callback.apply(
        createMockExchange(),
        createRequest("message-list", { name: "John" }),
      );

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

    it("wraps Promise<string[]> as multiple assistant messages", async () => {
      const provider = new TestPromptProvider();
      const callback = createCallback(
        provider,
        "returnStringList",
        createPrompt("string-list", "A prompt returning Promise<string[]>"),
      );

      const result = await callback.apply(
        createMockExchange(),
        createRequest("string-list", { name: "John" }),
      );

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
  });

  describe("argument resolution", () => {
    it("validates and exposes args via argsSchema", async () => {
      const provider = new TestPromptProvider();
      const callback = new McpPromptMethodCallback({
        provider,
        propertyKey: "useArgsSchema",
        prompt: createPrompt("schema-prompt", "A prompt backed by args schema"),
        argsSchema: ExamplePromptArgsSchema,
      });

      const result = await callback.apply(
        createMockExchange(),
        createRequest("schema-prompt", { name: "Jordan", enabled: true }),
      );

      expect(result.description).toBe("Schema prompt");
      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: "Jordan:true",
      });
    });

    it("exposes raw arguments via methodContext.request.params.arguments", async () => {
      const provider = new TestPromptProvider();
      const callback = createCallback(
        provider,
        "useArguments",
        createPrompt("arguments", "A prompt with arguments"),
      );

      const result = await callback.apply(
        createContext(),
        createRequest("arguments", { name: "John" }),
      );

      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: "Hello John from arguments",
      });
    });

    it("makes individual argument values available", async () => {
      const provider = new TestPromptProvider();
      const callback = createCallback(
        provider,
        "useIndividualArgs",
        createPrompt("individual-args", "A prompt with individual arguments"),
      );

      const result = await callback.apply(
        createContext(),
        createRequest("individual-args", { name: "John", age: 30 }),
      );

      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: "Hello John, you are 30 years old",
      });
    });
  });

  describe("context propagation", () => {
    it("populates exchange when called with McpServerExchange", async () => {
      const provider = new TestPromptProvider();
      const callback = createCallback(
        provider,
        "reportContextShape",
        createPrompt(
          "context-shape",
          "Reports which context fields are populated",
        ),
      );

      const result = await callback.apply(
        createMockExchange(),
        createRequest("context-shape", { name: "John" }),
      );

      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: "exchange=present transport=present",
      });
    });

    it("forwards transportContext from exchange.transportContext()", async () => {
      const provider = new TestPromptProvider();
      const callback = createCallback(
        provider,
        "useTransportContext",
        createPrompt(
          "transport-via-exchange",
          "Reads transportContext through exchange",
        ),
      );

      const exchange = createMockExchange(
        McpTransportContext.create({ traceId: "trace-1" }),
      );

      const result = await callback.apply(
        exchange,
        createRequest("transport-via-exchange", { name: "John" }),
      );

      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: "traceId=trace-1",
      });
    });

    it("populates transportContext when called with McpTransportContext", async () => {
      const provider = new TestPromptProvider();
      const callback = createCallback(
        provider,
        "useTransportContext",
        createPrompt("transport-direct", "Reads transportContext directly"),
      );

      const result = await callback.apply(
        createContext({ traceId: "trace-1" }),
        createRequest("transport-direct", { name: "John" }),
      );

      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: "traceId=trace-1",
      });
    });

    it("leaves exchange undefined when called with McpTransportContext", async () => {
      const provider = new TestPromptProvider();
      const callback = createCallback(
        provider,
        "reportContextShape",
        createPrompt(
          "context-shape-stateless",
          "Reports context fields in stateless mode",
        ),
      );

      const result = await callback.apply(
        createContext(),
        createRequest("context-shape-stateless", { name: "John" }),
      );

      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: "exchange=missing transport=present",
      });
    });
  });

  describe("meta and progress token", () => {
    it("forwards _meta into McpMeta", async () => {
      const provider = new TestPromptProvider();
      const callback = createCallback(
        provider,
        "useMeta",
        createPrompt("meta-prompt", "A prompt with meta parameter"),
      );

      const result = await callback.apply(
        createMockExchange(),
        createRequest(
          "meta-prompt",
          { name: "John" },
          { userId: "user123", sessionId: "session456" },
        ),
      );

      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: 'Hello John, Meta: {"userId":"user123","sessionId":"session456"}',
      });
    });

    it("yields an empty meta object when _meta is absent", async () => {
      const provider = new TestPromptProvider();
      const callback = createCallback(
        provider,
        "useMeta",
        createPrompt("meta-prompt", "A prompt with meta parameter"),
      );

      const result = await callback.apply(
        createContext(),
        createRequest("meta-prompt", { name: "John" }),
      );

      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: "Hello John, Meta: {}",
      });
    });

    it("combines meta with method arguments", async () => {
      const provider = new TestPromptProvider();
      const callback = createCallback(
        provider,
        "useMixedAndMeta",
        createPrompt("mixed-with-meta", "A prompt with mixed args and meta"),
      );

      const result = await callback.apply(
        createMockExchange(),
        createRequest(
          "mixed-with-meta",
          { name: "John" },
          { userId: "user123" },
        ),
      );

      expect(result.messages[0]?.content).toMatchObject({
        type: "text",
        text: 'Hello John from mixed-with-meta, Meta: {"userId":"user123"}',
      });
    });
  });

  describe("error handling", () => {
    it("rejects when request is null", async () => {
      const provider = new TestPromptProvider();
      const callback = createCallback(
        provider,
        "returnPromptResult",
        createPrompt("prompt-result", "A prompt returning a Promise"),
      );

      await expect(
        callback.apply(createMockExchange(), null as never),
      ).rejects.toThrow("Request must not be null");
    });

    it("wraps method exceptions in McpPromptMethodException", async () => {
      const provider = new TestPromptProvider();
      const callback = createCallback(
        provider,
        "failing",
        createPrompt("failing-prompt", "A prompt that throws an exception"),
      );

      await expect(
        callback.apply(
          createMockExchange(),
          createRequest("failing-prompt", { name: "John" }),
        ),
      ).rejects.toMatchObject({
        name: "McpPromptMethodException",
        message: "Error invoking prompt method: failing",
      });
    });
  });
});

class TestPromptProvider {
  @McpPrompt({
    name: "prompt-result",
    description: "A prompt returning a Promise",
  })
  async returnPromptResult(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<GetPromptResult> {
    const name = String(methodContext.request.params.arguments?.name ?? "");
    return {
      description: "Prompt result",
      messages: [
        {
          role: "assistant",
          content: { type: "text", text: `Async response for ${name}` },
        },
      ],
    };
  }

  @McpPrompt({
    name: "string",
    description: "A prompt returning Promise<string>",
  })
  async returnString(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<string> {
    const name = String(methodContext.request.params.arguments?.name ?? "");
    return `Async string response for ${name}`;
  }

  @McpPrompt({
    name: "single-message",
    description: "A prompt returning Promise<PromptMessage>",
  })
  async returnSingleMessage(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<PromptMessage> {
    const name = String(methodContext.request.params.arguments?.name ?? "");
    return {
      role: "assistant",
      content: { type: "text", text: `Async single message for ${name}` },
    };
  }

  @McpPrompt({
    name: "message-list",
    description: "A prompt returning Promise<PromptMessage[]>",
  })
  async returnMessageList(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<PromptMessage[]> {
    const name = String(methodContext.request.params.arguments?.name ?? "");
    return [
      {
        role: "assistant",
        content: { type: "text", text: `Async message 1 for ${name}` },
      },
      {
        role: "assistant",
        content: { type: "text", text: `Async message 2 for ${name}` },
      },
    ];
  }

  @McpPrompt({
    name: "string-list",
    description: "A prompt returning Promise<string[]>",
  })
  async returnStringList(
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
    name: "schema-prompt",
    description: "A prompt backed by args schema",
    argsSchema: ExamplePromptArgsSchema,
  })
  async useArgsSchema(
    args: McpPromptArgumentsFor<typeof ExamplePromptArgsSchema>,
    _methodContext?: McpPromptMethodContext,
  ): Promise<GetPromptResult> {
    return {
      description: "Schema prompt",
      messages: [
        {
          role: "assistant",
          content: { type: "text", text: `${args.name}:${args.enabled}` },
        },
      ],
    };
  }

  @McpPrompt({
    name: "arguments",
    description: "A prompt that reads request arguments",
  })
  async useArguments(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<GetPromptResult> {
    const name = String(methodContext.request.params.arguments?.name ?? "");
    return {
      description: "Greeting with arguments",
      messages: [
        {
          role: "assistant",
          content: { type: "text", text: `Hello ${name} from arguments` },
        },
      ],
    };
  }

  @McpPrompt({
    name: "individual-args",
    description: "A prompt with individual arguments",
  })
  async useIndividualArgs(
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
    name: "context-shape",
    description: "Reports which context fields are populated",
  })
  async reportContextShape(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<GetPromptResult> {
    const exchangePresence =
      methodContext.exchange != null ? "present" : "missing";
    const transportPresence =
      methodContext.transportContext != null ? "present" : "missing";
    return {
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `exchange=${exchangePresence} transport=${transportPresence}`,
          },
        },
      ],
    };
  }

  @McpPrompt({
    name: "transport-context",
    description: "Reads a value out of the transport context",
  })
  async useTransportContext(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<GetPromptResult> {
    const traceId = String(
      methodContext.transportContext?.get("traceId") ?? "",
    );
    return {
      messages: [
        {
          role: "assistant",
          content: { type: "text", text: `traceId=${traceId}` },
        },
      ],
    };
  }

  @McpPrompt({
    name: "meta-prompt",
    description: "A prompt with meta parameter",
  })
  async useMeta(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<GetPromptResult> {
    const name = String(methodContext.request.params.arguments?.name ?? "");
    const metaInfo = JSON.stringify(methodContext.meta.meta);
    return {
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
    name: "mixed-with-meta",
    description: "A prompt with mixed args and meta",
  })
  async useMixedAndMeta(
    args: {},
    methodContext: McpPromptMethodContext,
  ): Promise<GetPromptResult> {
    const name = String(methodContext.request.params.arguments?.name ?? "");
    const metaInfo = JSON.stringify(methodContext.meta.meta);
    return {
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
  async failing(
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
): McpPromptMethodCallback {
  return new McpPromptMethodCallback({
    provider,
    propertyKey,
    prompt,
  });
}

function createPrompt(name: string, description: string): Prompt {
  return { name, description };
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

function createContext(
  metadata: Record<string, unknown> = {},
): McpTransportContext {
  return McpTransportContext.create(metadata);
}
