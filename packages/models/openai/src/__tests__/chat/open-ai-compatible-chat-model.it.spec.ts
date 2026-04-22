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
  type Message,
  Prompt,
  SystemMessage,
  UserMessage,
} from "@nestjs-ai/model";
import { lastValueFrom, toArray } from "rxjs";
import { describe, expect, it } from "vitest";

import { OpenAiChatModel } from "../../open-ai-chat-model";
import { OpenAiChatOptions } from "../../open-ai-chat-options";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPEN_ROUTER_API_KEY = process.env.OPEN_ROUTER_API_KEY;

const conversation: Message[] = [
  new SystemMessage({ content: "You are a helpful assistant." }),
  new UserMessage({
    content: "Are you familiar with pirates from the Golden Age of Piracy?",
  }),
  new AssistantMessage({
    content:
      "Aye, I be well-versed in the legends of the Golden Age of Piracy!",
  }),
  new UserMessage({ content: "Tell me about 3 most famous ones." }),
];

function openAiCompatibleApis(): OpenAiChatModel[] {
  const models: OpenAiChatModel[] = [];

  models.push(
    new OpenAiChatModel({
      options: OpenAiChatOptions.builder()
        .apiKey(OPENAI_API_KEY ?? "")
        .model("gpt-3.5-turbo")
        .build(),
    }),
  );

  // (26.01.2025) Disable because the Groq API is down. TODO: Re-enable when the API
  // is back up.
  // if (System.getenv("GROQ_API_KEY") != null) {
  // builder.add(new OpenAiChatModel(new OpenAiApi("https://api.groq.com/openai",
  // System.getenv("GROQ_API_KEY")),
  // forModelName("llama3-8b-8192")));
  // }

  if (OPEN_ROUTER_API_KEY != null) {
    models.push(
      new OpenAiChatModel({
        options: OpenAiChatOptions.builder()
          .baseUrl("https://openrouter.ai/api")
          .apiKey(OPEN_ROUTER_API_KEY)
          .model("meta-llama/llama-3-8b-instruct")
          .build(),
      }),
    );
  }

  return models;
}

describe.skipIf(!OPENAI_API_KEY)("OpenAiCompatibleChatModel", () => {
  it.each(openAiCompatibleApis())("chat completion", async (chatModel) => {
    const prompt = new Prompt(conversation);
    const response = await chatModel.call(prompt);

    expect(response.results).toHaveLength(1);
    expect(response.results[0]?.output.text).toContain("Blackbeard");
  });

  it.each(openAiCompatibleApis())(
    "stream completion",
    async (streamingChatModel) => {
      const prompt = new Prompt(conversation);
      const responses = await lastValueFrom(
        streamingChatModel.stream(prompt).pipe(toArray()),
      );
      expect(responses.length).toBeGreaterThan(1);

      const stitchedResponseContent = responses
        .flatMap((response) => response.results)
        .map((generation) => generation.output.text ?? "")
        .join("");

      expect(stitchedResponseContent).toContain("Blackbeard");
    },
  );
});
