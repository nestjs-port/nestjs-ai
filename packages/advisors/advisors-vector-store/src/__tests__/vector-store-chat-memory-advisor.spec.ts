import { PromptTemplate } from "@nestjs-ai/model";
import type { VectorStore } from "@nestjs-ai/vector-store";
import type { SchedulerLike } from "rxjs";
import { queueScheduler } from "rxjs";
import { describe, expect, it } from "vitest";
import { VectorStoreChatMemoryAdvisor } from "../vector-store-chat-memory-advisor";

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

    expect(advisor).toBeDefined();
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

    expect(advisor).toBeDefined();
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

    expect(advisor).toBeDefined();
  });

  it("when builder with valid top k then success", () => {
    const vectorStore = createVectorStore();

    const advisor = VectorStoreChatMemoryAdvisor.builder(vectorStore)
      .defaultTopK(10)
      .build();

    expect(advisor).toBeDefined();
  });

  it("when builder with minimum top k then success", () => {
    const vectorStore = createVectorStore();

    const advisor = VectorStoreChatMemoryAdvisor.builder(vectorStore)
      .defaultTopK(1)
      .build();

    expect(advisor).toBeDefined();
  });

  it("when builder with large top k then success", () => {
    const vectorStore = createVectorStore();

    const advisor = VectorStoreChatMemoryAdvisor.builder(vectorStore)
      .defaultTopK(1000)
      .build();

    expect(advisor).toBeDefined();
  });

  it("when builder called multiple times with same vector store then success", () => {
    const vectorStore = createVectorStore();

    const advisor1 = VectorStoreChatMemoryAdvisor.builder(vectorStore).build();
    const advisor2 = VectorStoreChatMemoryAdvisor.builder(vectorStore).build();

    expect(advisor1).toBeDefined();
    expect(advisor2).toBeDefined();
    expect(advisor1).not.toBe(advisor2);
  });

  it("when builder with custom scheduler then success", () => {
    const vectorStore = createVectorStore();
    const customScheduler = queueScheduler;

    const advisor = VectorStoreChatMemoryAdvisor.builder(vectorStore)
      .scheduler(customScheduler)
      .build();

    expect(advisor).toBeDefined();
  });

  it("when builder with custom system prompt template then success", () => {
    const vectorStore = createVectorStore();
    const customTemplate = new PromptTemplate("{instructions}");

    const advisor = VectorStoreChatMemoryAdvisor.builder(vectorStore)
      .systemPromptTemplate(customTemplate)
      .build();

    expect(advisor).toBeDefined();
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

    expect(advisor).toBeDefined();
  });

  it("when builder with max integer top k then success", () => {
    const vectorStore = createVectorStore();

    const advisor = VectorStoreChatMemoryAdvisor.builder(vectorStore)
      .defaultTopK(2147483647)
      .build();

    expect(advisor).toBeDefined();
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

    expect(advisor).toBeDefined();
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

    expect(advisor).toBeDefined();
  });

  it("when builder with overridden parameters then use last value", () => {
    const vectorStore = createVectorStore();

    const advisor = VectorStoreChatMemoryAdvisor.builder(vectorStore)
      .conversationId("first-id")
      .conversationId("second-id") // This should override the first
      .defaultTopK(5)
      .defaultTopK(10) // This should override the first
      .build();

    expect(advisor).toBeDefined();
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

    expect(advisor1).toBeDefined();
    expect(advisor2).toBeDefined();
    expect(advisor1).not.toBe(advisor2);
  });

  it("when builder with long conversation id then success", () => {
    const vectorStore = createVectorStore();
    const longId = "a".repeat(1000); // 1000 character conversation ID

    const advisor = VectorStoreChatMemoryAdvisor.builder(vectorStore)
      .conversationId(longId)
      .build();

    expect(advisor).toBeDefined();
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

    expect(advisor1).toBeDefined();
    expect(advisor2).toBeDefined();
  });
});
