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

import { ChatClient, MessageChatMemoryAdvisor } from "@nestjs-ai/client-chat";
import {
  InMemoryChatMemoryRepository,
  type Message,
  MessageWindowChatMemory,
  Prompt,
  UserMessage,
} from "@nestjs-ai/model";
import { describe, it } from "vitest";

import { OpenAiChatModel } from "../../../open-ai-chat-model";
import { OpenAiChatOptions } from "../../../open-ai-chat-options";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)("OpenAiChatClientMemoryAdvisorRepro", () => {
  const chatModel = new OpenAiChatModel({
    options: OpenAiChatOptions.builder()
      .apiKey(OPENAI_API_KEY ?? "")
      .build(),
  });

  it("message chat memory advisor with prompt messages throws exception", async () => {
    // Arrange: create a Prompt with a List<Message> (including UserMessage)
    const userMessage = new UserMessage({ content: "Tell me a joke." });
    const messages: Message[] = [userMessage];
    const prompt = new Prompt(messages);
    const chatMemory = new MessageWindowChatMemory({
      chatMemoryRepository: new InMemoryChatMemoryRepository(),
    });
    const advisor = new MessageChatMemoryAdvisor({ chatMemory });

    const chatClient = ChatClient.builder(chatModel)
      .defaultAdvisors(advisor)
      .build();

    // Act: call should succeed without exception (issue #2339 is fixed)
    await chatClient.prompt(prompt).call().chatResponse(); // Should not throw
  });
});
