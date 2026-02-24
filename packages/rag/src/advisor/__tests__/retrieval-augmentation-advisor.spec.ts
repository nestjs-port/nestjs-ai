import { ChatClient } from "@nestjs-ai/client-chat";
import { Document } from "@nestjs-ai/commons";
import {
  AssistantMessage,
  ChatModel,
  ChatResponse,
  Generation,
  type Prompt,
} from "@nestjs-ai/model";
import { describe, expect, it, vi } from "vitest";
import type { QueryTransformer } from "../../preretrieval";
import type { Query } from "../../query";
import { DocumentRetriever } from "../../retrieval";
import { RetrievalAugmentationAdvisor } from "../retrieval-augmentation-advisor";

class TestChatModel extends ChatModel {
  readonly chatPromptMock = vi.fn(
    async (prompt: Prompt): Promise<ChatResponse> => {
      this.lastCallPrompt = prompt;
      return createChatResponse("Felix Felicis");
    },
  );

  lastCallPrompt: Prompt | null = null;

  protected override async chatPrompt(prompt: Prompt): Promise<ChatResponse> {
    return this.chatPromptMock(prompt);
  }
}

class TestDocumentRetriever extends DocumentRetriever {
  readonly retrieveMock = vi.fn(async (query: Query): Promise<Document[]> => {
    this.lastQuery = query;
    return this.documents;
  });

  lastQuery: Query | null = null;
  documents: Document[] = [];

  override async retrieve(query: Query): Promise<Document[]> {
    return this.retrieveMock(query);
  }
}

describe("RetrievalAugmentationAdvisor", () => {
  it("whenQueryTransformersContainNullElementsThenThrow", () => {
    expect(
      () =>
        new RetrievalAugmentationAdvisor({
          queryTransformers: [
            { apply: vi.fn() } as unknown as QueryTransformer,
            null as unknown as QueryTransformer,
          ],
          documentRetriever: {} as DocumentRetriever,
        }),
    ).toThrow("queryTransformers cannot contain null elements");
  });

  it("whenDocumentRetrieverIsNullThenThrow", () => {
    expect(
      () =>
        new RetrievalAugmentationAdvisor({
          documentRetriever: null as unknown as DocumentRetriever,
        }),
    ).toThrow("documentRetriever cannot be null");
  });

  it("theOneWithTheDocumentRetriever", async () => {
    // Chat Model
    const chatModel = new TestChatModel();

    // Document Retriever
    const documentContext = [
      Document.builder().id("1").text("doc1").build(),
      Document.builder().id("2").text("doc2").build(),
    ];
    const documentRetriever = new TestDocumentRetriever();
    documentRetriever.documents = documentContext;

    // Advisor
    const advisor = new RetrievalAugmentationAdvisor({
      documentRetriever,
    });

    // Chat Client
    const chatClient = ChatClient.builder(chatModel)
      .defaultAdvisors(advisor)
      .defaultSystem("You are a wizard!")
      .build();

    // Call
    const chatResponse = await chatClient
      .prompt()
      .user((user) =>
        user
          .text("What would I get if I added {ingredient1} to {ingredient2}?")
          .param("ingredient1", "a pinch of Moonstone")
          .param("ingredient2", "a dash of powdered Gold"),
      )
      .call()
      .chatResponse();

    // Verify
    expect(chatResponse?.result?.output.text).toBe("Felix Felicis");
    expect(
      chatResponse?.metadata.get<Document[]>(
        RetrievalAugmentationAdvisor.DOCUMENT_CONTEXT,
      ),
    ).toEqual(expect.arrayContaining(documentContext));

    const query = documentRetriever.lastQuery;
    expect(query?.text).toBe(
      "What would I get if I added a pinch of Moonstone to a dash of powdered Gold?",
    );

    const prompt = chatModel.lastCallPrompt;
    const expectedPrompt = `Context information is below.

---------------------
doc1
doc2
---------------------

Given the context information and no prior knowledge, answer the query.

Follow these rules:

1. If the answer is not in the context, just say that you don't know.
2. Avoid statements like "Based on the context..." or "The provided information...".

Query: What would I get if I added a pinch of Moonstone to a dash of powdered Gold?

Answer:
`;
    expect(prompt?.contents).toContain(expectedPrompt.trimEnd());
  });
});

function createChatResponse(content: string): ChatResponse {
  return new ChatResponse({
    generations: [
      new Generation({
        assistantMessage: AssistantMessage.of(content),
      }),
    ],
  });
}
