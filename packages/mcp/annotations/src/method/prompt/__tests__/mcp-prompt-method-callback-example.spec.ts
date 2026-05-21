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
  GetPromptResult,
  McpServer,
  PromptMessage,
} from "@modelcontextprotocol/server";
import { z } from "zod";
import { DefaultMetaProvider } from "../../../context/default-meta-provider.js";
import { McpServerExchange } from "@nestjs-ai/mcp-common";
import { McpPrompt } from "../../../mcp-prompt.js";
import type {
  McpPromptArgumentsFor,
  McpPromptMethodContext,
} from "../../../mcp-prompt.js";
import { McpPromptMethodCallback } from "../mcp-prompt-method-callback.js";

/**
 * Args schema reused across the example provider and dependent test suites.
 */
export const ExamplePromptArgsSchema = z.object({
  name: z.string(),
  enabled: z.boolean(),
});

/**
 * Reference provider exercised by {@link McpPromptMethodCallback} tests.
 *
 * Each method shows a distinct supported return shape, argument flavour, or
 * runtime context interaction. The class is intentionally exported so that
 * sibling specs can reuse it as a fixture instead of redeclaring identical
 * methods.
 */
export class ExamplePromptProvider {
  @McpPrompt({
    name: "prompt-result",
    description: "A prompt returning a Promise<GetPromptResult>",
  })
  async returnPromptResult(
    _methodContext: McpPromptMethodContext,
  ): Promise<GetPromptResult> {
    return {
      description: "Prompt result",
      messages: [
        {
          role: "assistant",
          content: { type: "text", text: "Async prompt result" },
        },
      ],
    };
  }

  @McpPrompt({
    name: "string",
    description: "A prompt returning Promise<string>",
  })
  async returnString(_methodContext: McpPromptMethodContext): Promise<string> {
    return "Async string response";
  }

  @McpPrompt({
    name: "single-message",
    description: "A prompt returning Promise<PromptMessage>",
  })
  async returnSingleMessage(
    _methodContext: McpPromptMethodContext,
  ): Promise<PromptMessage> {
    return {
      role: "assistant",
      content: { type: "text", text: "Async single message" },
    };
  }

  @McpPrompt({
    name: "message-list",
    description: "A prompt returning Promise<PromptMessage[]>",
  })
  async returnMessageList(
    _methodContext: McpPromptMethodContext,
  ): Promise<PromptMessage[]> {
    return [
      {
        role: "assistant",
        content: { type: "text", text: "Async message 1" },
      },
      {
        role: "assistant",
        content: { type: "text", text: "Async message 2" },
      },
    ];
  }

  @McpPrompt({
    name: "string-list",
    description: "A prompt returning Promise<string[]>",
  })
  async returnStringList(
    _methodContext: McpPromptMethodContext,
  ): Promise<string[]> {
    return ["Async string 1", "Async string 2", "Async string 3"];
  }

  @McpPrompt({
    name: "schema-prompt",
    description: "A prompt backed by args schema",
    argsSchema: ExamplePromptArgsSchema,
  })
  async useArgsSchema(
    args: McpPromptArgumentsFor<typeof ExamplePromptArgsSchema>,
    _methodContext: McpPromptMethodContext,
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
    name: "capture-exchange",
    description: "Reports the runtime type of the exchange",
  })
  async captureExchange(
    methodContext: McpPromptMethodContext,
  ): Promise<GetPromptResult> {
    const tag =
      methodContext.exchange instanceof McpServerExchange
        ? "McpServerExchange"
        : "other";
    return {
      messages: [
        {
          role: "assistant",
          content: { type: "text", text: `exchange=${tag}` },
        },
      ],
    };
  }

  @McpPrompt({
    name: "meta-prompt",
    description: "A prompt that reads ctx.mcpReq._meta",
  })
  async useMeta(
    methodContext: McpPromptMethodContext,
  ): Promise<GetPromptResult> {
    const metaInfo = JSON.stringify(methodContext.meta.meta);
    return {
      messages: [
        {
          role: "assistant",
          content: { type: "text", text: `Meta: ${metaInfo}` },
        },
      ],
    };
  }

  @McpPrompt({
    name: "progress-prompt",
    description: "Reports the progress token forwarded via _meta",
  })
  async useProgressToken(
    methodContext: McpPromptMethodContext,
  ): Promise<GetPromptResult> {
    return {
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `progressToken=${String(methodContext.progressToken ?? "missing")}`,
          },
        },
      ],
    };
  }

  @McpPrompt({
    name: "signal-prompt",
    description: "Reports the abort signal state",
  })
  async captureSignal(
    methodContext: McpPromptMethodContext,
  ): Promise<GetPromptResult> {
    const presence = methodContext.signal != null ? "present" : "missing";
    return {
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `signal=${presence} aborted=${methodContext.signal?.aborted ?? "n/a"}`,
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
    _methodContext: McpPromptMethodContext,
  ): Promise<GetPromptResult> {
    throw new Error("Test exception");
  }
}

/**
 * Compile-time-only fixture that pins the decorator's type constraints.
 * None of these methods are intended to be called at runtime; the value of
 * this class is the `@ts-expect-error` directives below.
 */
export class InvalidPromptProvider {
  // @ts-expect-error @McpPrompt only supports methods returning GetPromptResult, PromptMessage, string, string[], PromptMessage[], or Promise thereof
  @McpPrompt({
    name: "invalid-return-type",
    description: "Invalid sync return type",
  })
  invalidReturnType(_ctx: McpPromptMethodContext): number {
    void _ctx;
    return 1;
  }

  // @ts-expect-error @McpPrompt only supports methods returning GetPromptResult, PromptMessage, string, string[], PromptMessage[], or Promise thereof
  @McpPrompt({
    name: "invalid-promise-return-type",
    description: "Invalid async return type",
  })
  async invalidPromiseReturnType(
    _ctx: McpPromptMethodContext,
  ): Promise<number> {
    void _ctx;
    return 1;
  }

  // @ts-expect-error @McpPrompt without argsSchema requires the context parameter to be McpPromptMethodContext
  @McpPrompt({
    name: "wrong-context-type",
    description: "Wrong context-parameter type",
  })
  wrongContextType(_ctx: string): Promise<GetPromptResult> {
    void _ctx;
    return Promise.resolve({ messages: [] });
  }

  // @ts-expect-error @McpPrompt without argsSchema does not allow extra required parameters
  @McpPrompt({
    name: "too-many-parameters",
    description: "Extra trailing parameter",
  })
  tooManyParameters(
    _ctx: McpPromptMethodContext,
    _extra: string,
  ): Promise<GetPromptResult> {
    void _ctx;
    void _extra;
    return Promise.resolve({ messages: [] });
  }
}

/**
 * Documentation example showing how to wire {@link McpPromptMethodCallback}
 * into an `McpServer` registration. Not exercised by the test suite.
 */
export class McpPromptMethodCallbackExample {
  private constructor() {}

  static main(mcpServer: McpServer): void {
    const provider = new ExamplePromptProvider();

    const greetingCallback = new McpPromptMethodCallback({
      provider,
      propertyKey: "returnPromptResult",
      metadata: {
        name: "greeting",
        title: "",
        description: "A friendly greeting prompt",
        metaProvider: DefaultMetaProvider,
        argsSchema: null,
      },
      mcpServer,
    });

    const reviewCallback = new McpPromptMethodCallback({
      provider,
      propertyKey: "useArgsSchema",
      metadata: {
        name: "review-code",
        title: "Code Review",
        description: "Review code for best practices",
        metaProvider: DefaultMetaProvider,
        argsSchema: ExamplePromptArgsSchema,
      },
      mcpServer,
    });

    // Each tuple can be spread directly into mcpServer.registerPrompt(...).
    const greetingRegistration = greetingCallback.apply();
    const reviewRegistration = reviewCallback.apply();

    console.log("=== Prompt Registrations ===");
    console.log("greeting:", greetingRegistration[0]);
    console.log("review-code:", reviewRegistration[0]);
  }
}
