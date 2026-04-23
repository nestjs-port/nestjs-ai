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

import { PromptTemplate } from "@nestjs-ai/model";
import type { VectorStore } from "@nestjs-ai/vector-store";
import type { SchedulerLike } from "rxjs";
import { queueScheduler } from "rxjs";
import { assert, describe, expect, it } from "vitest";
import { VectorStoreChatMemoryAdvisor } from "../vector-store-chat-memory-advisor.js";

function createVectorStore(): VectorStore {
  return {} as VectorStore;
}

describe("VectorStoreChatMemoryAdvisorTests", () => {
  it("when vector store is null then throw", () => {
    expect(() =>
      VectorStoreChatMemoryAdvisor.builder(
        null as unknown as VectorStore,
      ).build(),
    ).toThrowError(/vectorStore cannot be null/);
  });

  it("when default conversation id is null then throw", () => {
    const vectorStore = createVectorStore();

    expect(() =>
      VectorStoreChatMemoryAdvisor.builder(vectorStore)
        .conversationId(null as unknown as string)
        .build(),
    ).toThrowError(/defaultConversationId cannot be null or empty/);
  });

  it("when default conversation id is empty then throw", () => {
    const vectorStore = createVectorStore();

    expect(() =>
      VectorStoreChatMemoryAdvisor.builder(vectorStore)
        .conversationId(null as unknown as string)
        .build(),
    ).toThrowError(/defaultConversationId cannot be null or empty/);
  });

  it("when scheduler is null then throw", () => {
    const vectorStore = createVectorStore();

    expect(() =>
      VectorStoreChatMemoryAdvisor.builder(vectorStore)
        .scheduler(null as unknown as SchedulerLike)
        .build(),
    ).toThrowError(/scheduler cannot be null/);
  });

  it("when system prompt template is null then throw", () => {
    const vectorStore = createVectorStore();

    expect(() =>
      VectorStoreChatMemoryAdvisor.builder(vectorStore)
        .systemPromptTemplate(null as unknown as PromptTemplate)
        .build(),
    ).toThrowError(/systemPromptTemplate cannot be null/);
  });

  it("when default top k is zero then throw", () => {
    const vectorStore = createVectorStore();

    expect(() =>
      VectorStoreChatMemoryAdvisor.builder(vectorStore).defaultTopK(0).build(),
    ).toThrowError(/topK must be greater than 0/);
  });

  it("when default top k is negative then throw", () => {
    const vectorStore = createVectorStore();

    expect(() =>
      VectorStoreChatMemoryAdvisor.builder(vectorStore).defaultTopK(-1).build(),
    ).toThrowError(/topK must be greater than 0/);
  });

  it("when builder with valid vector store then success", () => {
    const vectorStore = createVectorStore();

    const advisor = VectorStoreChatMemoryAdvisor.builder(vectorStore).build();

    assert.exists(advisor);
  });

  it("when builder with all valid parameters then success", () => {
    const vectorStore = createVectorStore();
    const scheduler = queueScheduler;
    const systemPromptTemplate = new PromptTemplate("{instructions}");

    const advisor = VectorStoreChatMemoryAdvisor.builder(vectorStore)
      .conversationId("test-conversation")
      .scheduler(scheduler)
      .systemPromptTemplate(systemPromptTemplate)
      .defaultTopK(5)
      .build();

    assert.exists(advisor);
  });

  it("when default conversation id is blank then throw", () => {
    const vectorStore = createVectorStore();

    expect(() =>
      VectorStoreChatMemoryAdvisor.builder(vectorStore)
        .conversationId("   ")
        .build(),
    ).toThrowError(/defaultConversationId cannot be null or empty/);
  });

  it("when builder with valid conversation id then success", () => {
    const vectorStore = createVectorStore();

    const advisor = VectorStoreChatMemoryAdvisor.builder(vectorStore)
      .conversationId("valid-id")
      .build();

    assert.exists(advisor);
  });

  it("when builder with valid top k then success", () => {
    const vectorStore = createVectorStore();

    const advisor = VectorStoreChatMemoryAdvisor.builder(vectorStore)
      .defaultTopK(10)
      .build();

    assert.exists(advisor);
  });

  it("when builder with minimum top k then success", () => {
    const vectorStore = createVectorStore();

    const advisor = VectorStoreChatMemoryAdvisor.builder(vectorStore)
      .defaultTopK(1)
      .build();

    assert.exists(advisor);
  });

  it("when builder with large top k then success", () => {
    const vectorStore = createVectorStore();

    const advisor = VectorStoreChatMemoryAdvisor.builder(vectorStore)
      .defaultTopK(1000)
      .build();

    assert.exists(advisor);
  });

  it("when builder called multiple times with same vector store then success", () => {
    const vectorStore = createVectorStore();

    const advisor1 = VectorStoreChatMemoryAdvisor.builder(vectorStore).build();
    const advisor2 = VectorStoreChatMemoryAdvisor.builder(vectorStore).build();

    assert.exists(advisor1);
    assert.exists(advisor2);
    expect(advisor1).not.toBe(advisor2);
  });

  it("when builder with custom scheduler then success", () => {
    const vectorStore = createVectorStore();
    const customScheduler = queueScheduler;

    const advisor = VectorStoreChatMemoryAdvisor.builder(vectorStore)
      .scheduler(customScheduler)
      .build();

    assert.exists(advisor);
  });

  it("when builder with custom system prompt template then success", () => {
    const vectorStore = createVectorStore();
    const customTemplate = new PromptTemplate("{instructions}");

    const advisor = VectorStoreChatMemoryAdvisor.builder(vectorStore)
      .systemPromptTemplate(customTemplate)
      .build();

    assert.exists(advisor);
  });

  it("when builder with empty string conversation id then throw", () => {
    const vectorStore = createVectorStore();

    expect(() =>
      VectorStoreChatMemoryAdvisor.builder(vectorStore)
        .conversationId("")
        .build(),
    ).toThrowError(/defaultConversationId cannot be null or empty/);
  });

  it("when builder with whitespace only conversation id then throw", () => {
    const vectorStore = createVectorStore();

    expect(() =>
      VectorStoreChatMemoryAdvisor.builder(vectorStore)
        .conversationId("\t\n\r ")
        .build(),
    ).toThrowError(/defaultConversationId cannot be null or empty/);
  });

  it("when builder with special characters in conversation id then success", () => {
    const vectorStore = createVectorStore();

    const advisor = VectorStoreChatMemoryAdvisor.builder(vectorStore)
      .conversationId("conversation-id_123@domain.com")
      .build();

    assert.exists(advisor);
  });

  it("when builder with max integer top k then success", () => {
    const vectorStore = createVectorStore();

    const advisor = VectorStoreChatMemoryAdvisor.builder(vectorStore)
      .defaultTopK(2147483647)
      .build();

    assert.exists(advisor);
  });

  it("when builder with negative top k then throw", () => {
    const vectorStore = createVectorStore();

    expect(() =>
      VectorStoreChatMemoryAdvisor.builder(vectorStore)
        .defaultTopK(-100)
        .build(),
    ).toThrowError(/topK must be greater than 0/);
  });

  it("when builder chained with all parameters then success", () => {
    const vectorStore = createVectorStore();
    const scheduler = queueScheduler;
    const systemPromptTemplate = new PromptTemplate("{instructions}");

    const advisor = VectorStoreChatMemoryAdvisor.builder(vectorStore)
      .conversationId("chained-test")
      .defaultTopK(42)
      .scheduler(scheduler)
      .systemPromptTemplate(systemPromptTemplate)
      .build();

    assert.exists(advisor);
  });

  it("when builder parameters set in different order then success", () => {
    const vectorStore = createVectorStore();
    const scheduler = queueScheduler;
    const systemPromptTemplate = new PromptTemplate("{instructions}");

    const advisor = VectorStoreChatMemoryAdvisor.builder(vectorStore)
      .systemPromptTemplate(systemPromptTemplate)
      .defaultTopK(7)
      .scheduler(scheduler)
      .conversationId("order-test")
      .build();

    assert.exists(advisor);
  });

  it("when builder with overridden parameters then use last value", () => {
    const vectorStore = createVectorStore();

    const advisor = VectorStoreChatMemoryAdvisor.builder(vectorStore)
      .conversationId("first-id")
      .conversationId("second-id") // This should override the first
      .defaultTopK(5)
      .defaultTopK(10) // This should override the first
      .build();

    assert.exists(advisor);
  });

  it("when builder reused then creates separate instances", () => {
    const vectorStore = createVectorStore();

    // Simulate builder reuse (if the builder itself is stateful)
    const builder =
      VectorStoreChatMemoryAdvisor.builder(vectorStore).conversationId(
        "shared-config",
      );

    const advisor1 = builder.build();
    const advisor2 = builder.build();

    assert.exists(advisor1);
    assert.exists(advisor2);
    expect(advisor1).not.toBe(advisor2);
  });

  it("when builder with long conversation id then success", () => {
    const vectorStore = createVectorStore();
    const longId = "a".repeat(1000); // 1000 character conversation ID

    const advisor = VectorStoreChatMemoryAdvisor.builder(vectorStore)
      .conversationId(longId)
      .build();

    assert.exists(advisor);
  });

  it("when builder called with null after valid value then throw", () => {
    const vectorStore = createVectorStore();

    expect(() =>
      VectorStoreChatMemoryAdvisor.builder(vectorStore)
        .conversationId("valid-id")
        .conversationId(null as unknown as string) // Set to null after valid value
        .build(),
    ).toThrowError(/defaultConversationId cannot be null or empty/);
  });

  it("when builder with top k boundary values then success", () => {
    const vectorStore = createVectorStore();

    // Test with value 1 (minimum valid)
    const advisor1 = VectorStoreChatMemoryAdvisor.builder(vectorStore)
      .defaultTopK(1)
      .build();

    // Test with a reasonable upper bound
    const advisor2 = VectorStoreChatMemoryAdvisor.builder(vectorStore)
      .defaultTopK(10000)
      .build();

    assert.exists(advisor1);
    assert.exists(advisor2);
  });
});
