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
  TextContent,
} from "@modelcontextprotocol/server";

import {
  McpServerExchange,
  McpTransportContext,
} from "../../../context/index.js";
import { PromptAdapter } from "../../../adapter/prompt-adapter.js";
import { MCP_PROMPT_METADATA_KEY } from "../../../metadata.js";
import { McpPrompt } from "../../../mcp-prompt.js";
import type {
  McpPromptMetadata,
  McpPromptMethodArguments,
} from "../../../mcp-prompt.js";
import { McpPromptMethodCallback } from "../mcp-prompt-method-callback.js";

/**
 * Example demonstrating how to use the prompt method callback.
 */
export class McpPromptMethodCallbackExample {
  private constructor() {}

  static async main(): Promise<void> {
    const provider = new AsyncPromptProvider();

    console.log("Example 1: Method returning Promise<GetPromptResult>");
    await demonstrateAsyncGreetingPrompt(provider);

    console.log("\nExample 2: Method returning Promise<string>");
    await demonstrateAsyncStringPrompt(provider);

    console.log("\nExample 3: Method returning Promise<List<string>>");
    await demonstrateAsyncStringListPrompt(provider);

    console.log("\nExample 4: Prompt metadata arguments");
    await demonstrateMetadataArgumentsPrompt(provider);
  }
}

async function demonstrateAsyncGreetingPrompt(
  provider: AsyncPromptProvider,
): Promise<void> {
  const methodName = "asyncGreetingPrompt";
  const prompt = resolvePrompt(methodName);

  const callback = new McpPromptMethodCallback({
    provider,
    propertyKey: methodName,
    prompt,
  });

  const request = createPromptRequest(prompt.name, { name: "John" });
  const result = await callback.apply(createMockExchange(), request);

  console.log(`Description: ${result.description ?? ""}`);
  console.log("Messages:");
  for (const message of result.messages) {
    console.log(`  Role: ${message.role}`);
    if (isTextContent(message.content)) {
      console.log(`  Content: ${message.content.text}`);
    }
  }
}

async function demonstrateAsyncStringPrompt(
  provider: AsyncPromptProvider,
): Promise<void> {
  const methodName = "asyncStringPrompt";
  const prompt = resolvePrompt(methodName);

  const callback = new McpPromptMethodCallback({
    provider,
    propertyKey: methodName,
    prompt,
  });

  const request = createPromptRequest(prompt.name, { name: "Alice" });
  const result = await callback.apply(createMockExchange(), request);

  console.log("Messages:");
  for (const message of result.messages) {
    console.log(`  Role: ${message.role}`);
    if (isTextContent(message.content)) {
      console.log(`  Content: ${message.content.text}`);
    }
  }
}

async function demonstrateAsyncStringListPrompt(
  provider: AsyncPromptProvider,
): Promise<void> {
  const methodName = "asyncStringListPrompt";
  const prompt = resolvePrompt(methodName);

  const callback = new McpPromptMethodCallback({
    provider,
    propertyKey: methodName,
    prompt,
  });

  const request = createPromptRequest(prompt.name, { topic: "MCP" });
  const result = await callback.apply(createMockExchange(), request);

  console.log("Messages:");
  for (const message of result.messages) {
    console.log(`  Role: ${message.role}`);
    if (isTextContent(message.content)) {
      console.log(`  Content: ${message.content.text}`);
    }
  }
}

async function demonstrateMetadataArgumentsPrompt(
  provider: AsyncPromptProvider,
): Promise<void> {
  const methodName = "asyncPersonalizedMessage";
  const prompt = resolvePrompt(methodName);

  const callback = new McpPromptMethodCallback({
    provider,
    propertyKey: methodName,
    prompt,
  });

  const request = createPromptRequest(prompt.name, {
    name: "Jordan",
    age: 34,
    interests: "systems programming",
  });
  const result = await callback.apply(createMockExchange(), request);

  console.log("Description:", result.description ?? "");
  console.log("Messages:");
  for (const message of result.messages) {
    console.log(`  Role: ${message.role}`);
    if (isTextContent(message.content)) {
      console.log(`  Content: ${message.content.text}`);
    }
  }
}

class AsyncPromptProvider {
  @McpPrompt({
    name: "async-greeting",
    description: "An asynchronous greeting prompt",
  })
  async asyncGreetingPrompt(
    args: McpPromptMethodArguments,
  ): Promise<GetPromptResult> {
    const name = String(args.arguments.name ?? "");
    return Promise.resolve({
      description: "Async Greeting",
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `Hello, ${name}! Welcome to the MCP system. (async)`,
          },
        },
      ],
    });
  }

  @McpPrompt({
    name: "async-string",
    description: "A prompt returning a Mono<String>",
  })
  async asyncStringPrompt(args: McpPromptMethodArguments): Promise<string> {
    const request = args.request;
    const name = String(request.params.arguments?.name ?? "");
    return Promise.resolve(`Async string response for ${name}`);
  }

  @McpPrompt({
    name: "async-message",
    description: "A prompt returning a Mono<PromptMessage>",
  })
  async asyncMessagePrompt(
    args: McpPromptMethodArguments,
  ): Promise<PromptMessage> {
    const name = String(args.request.params.arguments?.name ?? "");
    return Promise.resolve({
      role: "assistant",
      content: {
        type: "text",
        text: `Async single message for ${name}`,
      },
    });
  }

  @McpPrompt({
    name: "async-message-list",
    description: "A prompt returning a Mono<List<PromptMessage>>",
  })
  async asyncMessageListPrompt(
    args: McpPromptMethodArguments,
  ): Promise<PromptMessage[]> {
    const name = String(args.request.params.arguments?.name ?? "");
    return Promise.resolve([
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
    ]);
  }

  @McpPrompt({
    name: "async-string-list",
    description: "A prompt returning a Mono<List<String>>",
  })
  async asyncStringListPrompt(
    args: McpPromptMethodArguments,
  ): Promise<string[]> {
    const topic = String(args.arguments.topic ?? "");
    return Promise.resolve(
      topic.toUpperCase() === "MCP"
        ? [
            "The Model Context Protocol (MCP) is a standardized way for servers to communicate with language models. (async)",
            "It provides a structured approach for exchanging information, making requests, and handling responses. (async)",
            "MCP allows servers to expose resources, tools, and prompts to clients in a consistent way. (async)",
          ]
        : [
            `I don't have specific information about ${topic}. (async)`,
            "Please try a different topic or ask a more specific question. (async)",
          ],
    );
  }

  @McpPrompt({
    name: "async-personalized-message",
    description:
      "Generates a personalized message based on user information asynchronously",
    arguments: {
      name: {
        description: "The user's name",
        required: true,
      },
      age: {
        description: "The user's age",
        required: false,
      },
      interests: {
        description: "The user's interests",
        required: false,
      },
    },
  })
  async asyncPersonalizedMessage(
    args: McpPromptMethodArguments,
  ): Promise<GetPromptResult> {
    const name = String(args.arguments.name ?? "");
    const ageValue = args.arguments.age;
    const interests = String(args.arguments.interests ?? "");
    const age =
      typeof ageValue === "number"
        ? ageValue
        : ageValue != null
          ? Number(ageValue)
          : undefined;

    const parts: string[] = [];
    parts.push(`Hello, ${name}! (async)\n\n`);

    if (age != null && !Number.isNaN(age)) {
      parts.push(`At ${age} years old, you have `);
      if (age < 30) {
        parts.push("so much ahead of you. (async)\n\n");
      } else if (age < 60) {
        parts.push("gained valuable life experience. (async)\n\n");
      } else {
        parts.push("accumulated wisdom to share with others. (async)\n\n");
      }
    }

    if (interests.length > 0) {
      parts.push(
        `Your interest in ${interests} shows your curiosity and passion for learning. (async)\n\n`,
      );
    }

    parts.push(
      "I'm here to assist you with any questions you might have about the Model Context Protocol. (async)",
    );

    return Promise.resolve({
      description: "Async Personalized Message",
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: parts.join(""),
          },
        },
      ],
    });
  }

  // Invalid signatures for compile-time validation only

  // @ts-expect-error @McpPrompt only supports methods returning GetPromptResult, PromptMessage, List<PromptMessage>, String, List<String>, or Promise thereof
  @McpPrompt({
    name: "invalid-return-type",
    description: "Invalid return type",
  })
  invalidReturnType(_args: McpPromptMethodArguments): number {
    // Invalid return type
    void _args;

    return 1;
  }

  // @ts-expect-error @McpPrompt only supports methods returning GetPromptResult, PromptMessage, List<PromptMessage>, String, List<String>, or Promise thereof
  @McpPrompt({
    name: "invalid-promise-return-type",
    description: "Invalid promise return type",
  })
  async invalidPromiseReturnType(
    _args: McpPromptMethodArguments,
  ): Promise<number> {
    void _args;

    return 1;
  }

  // @ts-expect-error @McpPrompt only supports methods with a single object parameter
  @McpPrompt({
    name: "no-arguments",
    description: "Invalid no argument prompt",
  })
  noParameters(): Promise<GetPromptResult> {
    return Promise.resolve({
      messages: [],
    });
  }

  // @ts-expect-error @McpPrompt only supports methods with a single object parameter
  @McpPrompt({
    name: "wrong-argument-type",
    description: "Invalid argument type prompt",
  })
  wrongArgumentType(_args: string): Promise<GetPromptResult> {
    void _args;

    return Promise.resolve({
      messages: [],
    });
  }

  // @ts-expect-error @McpPrompt only supports methods with a single object parameter
  @McpPrompt({
    name: "too-many-arguments",
    description: "Invalid too many arguments prompt",
  })
  tooManyParameters(
    _args: McpPromptMethodArguments,
    _extra: string,
  ): Promise<GetPromptResult> {
    void _args;
    void _extra;

    return Promise.resolve({
      messages: [],
    });
  }
}

function resolvePrompt(propertyKey: string): Prompt {
  const promptAnnotation = Reflect.getMetadata(
    MCP_PROMPT_METADATA_KEY,
    AsyncPromptProvider.prototype,
    propertyKey,
  ) as McpPromptMetadata | undefined;

  if (promptAnnotation == null) {
    throw new Error(`Missing prompt metadata for ${propertyKey}`);
  }

  return PromptAdapter.asPrompt(
    promptAnnotation,
    AsyncPromptProvider.prototype,
    propertyKey,
  );
}

function createPromptRequest(
  promptName: string,
  argumentsMap: Record<string, unknown>,
): GetPromptRequest {
  return {
    params: {
      name: promptName,
      arguments: argumentsMap,
      _meta: { progressToken: "prompt-token-1" },
    },
  } as unknown as GetPromptRequest;
}

function createMockExchange(): McpServerExchange {
  return Object.assign(Object.create(McpServerExchange.prototype), {
    transportContext: () => McpTransportContext.EMPTY,
  }) as McpServerExchange;
}

function isTextContent(content: unknown): content is TextContent {
  return (
    typeof content === "object" &&
    content != null &&
    "type" in content &&
    "text" in content
  );
}

void McpPromptMethodCallbackExample;
