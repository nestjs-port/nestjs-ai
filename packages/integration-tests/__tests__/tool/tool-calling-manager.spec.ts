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
import {
  type ChatResponse,
  DefaultToolCallingManager,
  type Message,
  Prompt,
  Tool,
  ToolCallbacks,
  type ToolExecutionResult,
  ToolResponseMessage,
  UserMessage,
} from "@nestjs-ai/model";
import { OpenAiChatModel, OpenAiChatOptions } from "@nestjs-ai/model-openai";
import { firstValueFrom, from, of } from "rxjs";
import { map, mergeMap, tap, toArray } from "rxjs/operators";
import { assert, describe, expect, it } from "vitest";
import { z } from "zod";
import { Author } from "./domain/author.js";
import { BookService } from "./domain/book-service.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)("ToolCallingManagerTests", () => {
  const tools = new Tools();
  const toolCallingManager = new DefaultToolCallingManager();
  const openAiChatModel = new OpenAiChatModel({
    options: new OpenAiChatOptions({
      apiKey: OPENAI_API_KEY ?? "",
      model: "gpt-4o-mini",
    }),
  });

  it("explicitToolCallingExecutionWithNewOptions", async () => {
    const chatOptions = new OpenAiChatOptions({
      model: "gpt-4o-mini",
      toolCallbacks: ToolCallbacks.from(tools),
      internalToolExecutionEnabled: false,
    });
    const prompt = new Prompt(
      new UserMessage({
        content:
          "What books written by J.R.R. Tolkien are available in the library?",
      }),
      chatOptions,
    );
    await runExplicitToolCallingExecutionWithOptions(chatOptions, prompt);
  });

  it("explicitToolCallingExecutionWithNewOptionsStream", async () => {
    const chatOptions = new OpenAiChatOptions({
      model: "gpt-4o-mini",
      toolCallbacks: ToolCallbacks.from(tools),
      internalToolExecutionEnabled: false,
    });
    const prompt = new Prompt(
      new UserMessage({
        content:
          "What books written by J.R.R. Tolkien, Philip Pullman, and C.S. Lewis are available in the library?",
      }),
      chatOptions,
    );
    await runExplicitToolCallingExecutionWithOptionsStream(chatOptions, prompt);
  });

  async function runExplicitToolCallingExecutionWithOptions(
    chatOptions: OpenAiChatOptions,
    prompt: Prompt,
  ): Promise<void> {
    const chatResponse = (await openAiChatModel.call(prompt)) as ChatResponse;

    assert.exists(chatResponse);
    expect(chatResponse.hasToolCalls()).toBe(true);

    const toolExecutionResult = await toolCallingManager.executeToolCalls(
      prompt,
      chatResponse,
    );

    expect(toolExecutionResult.conversationHistory()).not.toHaveLength(0);
    expect(
      toolExecutionResult
        .conversationHistory()
        .some((message: Message) => message instanceof ToolResponseMessage),
    ).toBe(true);

    const secondPrompt = new Prompt(
      toolExecutionResult.conversationHistory(),
      chatOptions,
    );

    const secondChatResponse = await openAiChatModel.call(secondPrompt);

    assert.exists(secondChatResponse);
    expect(secondChatResponse.result?.output.text ?? "").not.toHaveLength(0);
    expect(secondChatResponse.result?.output.text ?? "").toContain(
      "The Hobbit",
    );
    expect(secondChatResponse.result?.output.text ?? "").toContain(
      "The Lord of The Rings",
    );
    expect(secondChatResponse.result?.output.text ?? "").toContain(
      "The Silmarillion",
    );
  }

  async function runExplicitToolCallingExecutionWithOptionsStream(
    chatOptions: OpenAiChatOptions,
    prompt: Prompt,
  ): Promise<void> {
    const joinedTextResponse = await firstValueFrom(
      openAiChatModel.stream(prompt).pipe(
        mergeMap((response: ChatResponse) => {
          if (response.hasToolCalls()) {
            return from(
              toolCallingManager.executeToolCalls(prompt, response),
            ).pipe(
              tap((toolExecutionResult: ToolExecutionResult) =>
                assertToolExecutionResult(toolExecutionResult),
              ),
              mergeMap((toolExecutionResult: ToolExecutionResult) => {
                const secondPrompt = new Prompt(
                  toolExecutionResult.conversationHistory(),
                  chatOptions,
                );
                return openAiChatModel.stream(secondPrompt);
              }),
            );
          }
          return of(response);
        }),
        map((response: ChatResponse) => response.result?.output.text ?? ""),
        toArray(),
        map((parts: string[]) => parts.join("")),
      ),
    );

    assert.exists(joinedTextResponse);
    expect(joinedTextResponse).not.toHaveLength(0);
    expect(joinedTextResponse).toContain("His Dark Materials");
    expect(joinedTextResponse).toContain("The Lion, the Witch and the Wardrob");
    expect(joinedTextResponse).toContain("The Hobbit");
    expect(joinedTextResponse).toContain("The Lord of The Rings");
    expect(joinedTextResponse).toContain("The Silmarillion");
  }

  function assertToolExecutionResult(
    toolExecutionResult: ToolExecutionResult,
  ): void {
    expect(toolExecutionResult.conversationHistory()).not.toHaveLength(0);
    expect(
      toolExecutionResult
        .conversationHistory()
        .some((message: Message) => message instanceof ToolResponseMessage),
    ).toBe(true);
  }
});

class Tools {
  private readonly bookService = new BookService();

  @Tool({
    description:
      "Get the list of books written by the given author available in the library",
    parameters: z.object({ author: z.string() }),
    returns: z.array(
      z.object({
        title: z.string(),
        author: z.string(),
      }),
    ),
  })
  booksByAuthor(input: { author: string }) {
    assert(input.author);
    return this.bookService.getBooksByAuthor(new Author(input.author));
  }
}
