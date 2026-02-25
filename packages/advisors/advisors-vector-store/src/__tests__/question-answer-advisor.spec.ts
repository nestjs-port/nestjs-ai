import { ChatClient } from "@nestjs-ai/client-chat";
import { Document, type Milliseconds, ms } from "@nestjs-ai/commons";
import {
  AssistantMessage,
  type ChatModel,
  ChatResponse,
  ChatResponseMetadata,
  DefaultUsage,
  Generation,
  MessageType,
  Prompt,
  PromptTemplate,
  type RateLimit,
} from "@nestjs-ai/model";
import {
  FilterExpressionBuilder,
  SearchRequest,
  type VectorStore,
} from "@nestjs-ai/vector-store";
import { describe, expect, it, vi } from "vitest";
import { QuestionAnswerAdvisor } from "../question-answer-advisor";

describe("QuestionAnswerAdvisorTests", () => {
  it("qa advisor with dynamic filter expressions", async () => {
    let capturedPrompt = {} as Prompt;
    let capturedSearchRequest = {} as SearchRequest;

    const rateLimit: RateLimit = {
      get requestsLimit() {
        return 5;
      },
      get requestsRemaining() {
        return 6;
      },
      get requestsReset() {
        return ms(7000);
      },
      get tokensLimit() {
        return 8;
      },
      get tokensRemaining() {
        return 8;
      },
      get tokensReset() {
        return 9000 as Milliseconds;
      },
    };

    const chatModel = createChatModel(async (prompt) => {
      capturedPrompt = prompt;
      return new ChatResponse({
        generations: [
          new Generation({
            assistantMessage: new AssistantMessage({
              content: "Your answer is ZXY",
            }),
          }),
        ],
        chatResponseMetadata: ChatResponseMetadata.builder()
          .id("678")
          .model("model1")
          .keyValue("key6", "value6")
          .metadata({ key1: "value1" })
          .rateLimit(rateLimit)
          .usage(new DefaultUsage({ promptTokens: 6, completionTokens: 7 }))
          .build(),
      });
    });

    const vectorStore = createVectorStore(async (searchRequest) => {
      capturedSearchRequest = searchRequest;
      return [new Document("doc1"), new Document("doc2")];
    });

    const qaAdvisor = QuestionAnswerAdvisor.builder(vectorStore)
      .searchRequest(
        SearchRequest.builder().similarityThreshold(0.99).topK(6).build(),
      )
      .build();

    const chatClient = ChatClient.builder(chatModel)
      .defaultSystem("Default system text.")
      .defaultAdvisors(qaAdvisor)
      .build();

    const response = await chatClient
      .prompt()
      .user("Please answer my question XYZ")
      .advisors((a) =>
        a.param(QuestionAnswerAdvisor.FILTER_EXPRESSION, "type == 'Spring'"),
      )
      .call()
      .chatResponse();

    expect(response).not.toBeNull();
    if (response == null) {
      throw new Error("Expected chat response");
    }
    const safeResponse = response;

    // Ensure the metadata is correctly copied over
    expect(safeResponse.metadata.model).toBe("model1");
    expect(safeResponse.metadata.id).toBe("678");
    expect(safeResponse.metadata.rateLimit.requestsLimit).toBe(5);
    expect(safeResponse.metadata.rateLimit.requestsRemaining).toBe(6);
    expect(safeResponse.metadata.rateLimit.requestsReset).toBe(7000);
    expect(safeResponse.metadata.rateLimit.tokensLimit).toBe(8);
    expect(safeResponse.metadata.rateLimit.tokensRemaining).toBe(8);
    expect(safeResponse.metadata.rateLimit.tokensReset).toBe(9000);
    expect(safeResponse.metadata.usage.promptTokens).toBe(6);
    expect(safeResponse.metadata.usage.completionTokens).toBe(7);
    expect(safeResponse.metadata.usage.totalTokens).toBe(13);
    expect(safeResponse.metadata.get("key6")).toBe("value6");
    expect(safeResponse.metadata.get("key1")).toBe("value1");

    const content = safeResponse.result?.output.text;
    expect(content).toBe("Your answer is ZXY");

    const systemMessage = capturedPrompt.instructions[0];
    expect(normalizeWhitespace(systemMessage.text ?? "")).toBe(
      normalizeWhitespace(`
        Default system text.
      `),
    );
    expect(systemMessage.messageType).toBe(MessageType.SYSTEM);

    const userMessage = capturedPrompt.instructions[1];
    expect(normalizeWhitespace(userMessage.text ?? "")).toBe(
      normalizeWhitespace(`
        Please answer my question XYZ
        Context information is below, surrounded by ---------------------

        ---------------------
        doc1
        doc2
        ---------------------

        Given the context and provided history information and not prior knowledge,
        reply to the user comment. If the answer is not in the context, inform
        the user that you can't answer the question.
      `),
    );

    expect(capturedSearchRequest.filterExpression).toEqual(
      new FilterExpressionBuilder().eq("type", "Spring").build(),
    );
    expect(capturedSearchRequest.similarityThreshold).toBe(0.99);
    expect(capturedSearchRequest.topK).toBe(6);
  });

  it("qa advisor takes user text parameters into account for similarity search", async () => {
    let capturedPrompt = {} as Prompt;
    let capturedSearchRequest = {} as SearchRequest;

    const chatModel = createChatModel(async (prompt) => {
      capturedPrompt = prompt;
      return createResponse("Your answer is ZXY");
    });

    const vectorStore = createVectorStore(async (searchRequest) => {
      capturedSearchRequest = searchRequest;
      return [new Document("doc1"), new Document("doc2")];
    });

    const chatClient = ChatClient.builder(chatModel).build();
    const qaAdvisor = QuestionAnswerAdvisor.builder(vectorStore)
      .searchRequest(SearchRequest.builder().build())
      .build();

    const userTextTemplate = "Please answer my question {question}";
    // @formatter:off
    await chatClient
      .prompt()
      .user((u) => u.text(userTextTemplate).param("question", "XYZ"))
      .advisors(qaAdvisor)
      .call()
      .chatResponse();
    //formatter:on

    const expectedQuery = "Please answer my question XYZ";
    const userPrompt = capturedPrompt.instructions[0].text ?? "";
    expect(userPrompt).not.toContain(userTextTemplate);
    expect(userPrompt).toContain(expectedQuery);
    expect(capturedSearchRequest.query).toBe(expectedQuery);
  });

  it("qa advisor takes user parameterized user messages into account for similarity search", async () => {
    let capturedPrompt = {} as Prompt;
    let capturedSearchRequest = {} as SearchRequest;

    const chatModel = createChatModel(async (prompt) => {
      capturedPrompt = prompt;
      return createResponse("Your answer is ZXY");
    });

    const vectorStore = createVectorStore(async (searchRequest) => {
      capturedSearchRequest = searchRequest;
      return [new Document("doc1"), new Document("doc2")];
    });

    const chatClient = ChatClient.builder(chatModel).build();
    const qaAdvisor = QuestionAnswerAdvisor.builder(vectorStore)
      .searchRequest(SearchRequest.builder().build())
      .build();

    const userTextTemplate = "Please answer my question {question}";
    const userPromptTemplate = PromptTemplate.builder()
      .template(userTextTemplate)
      .variables({ question: "XYZ" })
      .build();
    const userMessage = userPromptTemplate.createMessage();
    // @formatter:off
    await chatClient
      .prompt(new Prompt(userMessage))
      .advisors(qaAdvisor)
      .call()
      .chatResponse();
    //formatter:on

    const expectedQuery = "Please answer my question XYZ";
    const userPrompt = capturedPrompt.instructions[0].text ?? "";
    expect(userPrompt).not.toContain(userTextTemplate);
    expect(userPrompt).toContain(expectedQuery);
    expect(capturedSearchRequest.query).toBe(expectedQuery);
  });

  it("qa advisor with multiple filter parameters", async () => {
    let capturedSearchRequest = {} as SearchRequest;

    const chatModel = createChatModel(async () =>
      createResponse("Filtered response"),
    );
    const vectorStore = createVectorStore(async (searchRequest) => {
      capturedSearchRequest = searchRequest;
      return [new Document("doc1"), new Document("doc2")];
    });

    const qaAdvisor = QuestionAnswerAdvisor.builder(vectorStore)
      .searchRequest(SearchRequest.builder().topK(10).build())
      .build();

    const chatClient = ChatClient.builder(chatModel)
      .defaultAdvisors(qaAdvisor)
      .build();

    await chatClient
      .prompt()
      .user("Complex query")
      .advisors((a) =>
        a.param(
          QuestionAnswerAdvisor.FILTER_EXPRESSION,
          "type == 'Documentation' AND status == 'Published'",
        ),
      )
      .call()
      .chatResponse();

    const capturedFilter = capturedSearchRequest.filterExpression;
    expect(capturedFilter).not.toBeNull();
    // The filter should be properly constructed with AND operation
    expect(JSON.stringify(capturedFilter)).toContain("type");
    expect(JSON.stringify(capturedFilter)).toContain("Documentation");
  });

  it("qa advisor with different similarity thresholds", async () => {
    let capturedSearchRequest = {} as SearchRequest;

    const chatModel = createChatModel(async () =>
      createResponse("High threshold response"),
    );
    const vectorStore = createVectorStore(async (searchRequest) => {
      capturedSearchRequest = searchRequest;
      return [new Document("relevant doc")];
    });

    const qaAdvisor = QuestionAnswerAdvisor.builder(vectorStore)
      .searchRequest(
        SearchRequest.builder().similarityThreshold(0.95).topK(3).build(),
      )
      .build();

    const chatClient = ChatClient.builder(chatModel)
      .defaultAdvisors(qaAdvisor)
      .build();

    await chatClient
      .prompt()
      .user("Specific question requiring high similarity")
      .call()
      .chatResponse();

    expect(capturedSearchRequest.similarityThreshold).toBe(0.95);
    expect(capturedSearchRequest.topK).toBe(3);
  });

  it("qa advisor with complex parameterized template", async () => {
    let capturedPrompt = {} as Prompt;
    let capturedSearchRequest = {} as SearchRequest;

    const chatModel = createChatModel(async (prompt) => {
      capturedPrompt = prompt;
      return createResponse("Complex template response");
    });
    const vectorStore = createVectorStore(async (searchRequest) => {
      capturedSearchRequest = searchRequest;
      return [new Document("template doc")];
    });

    const qaAdvisor = QuestionAnswerAdvisor.builder(vectorStore)
      .searchRequest(SearchRequest.builder().build())
      .build();

    const chatClient = ChatClient.builder(chatModel)
      .defaultAdvisors(qaAdvisor)
      .build();

    const complexTemplate =
      "Please analyze {topic} considering {aspect1} and {aspect2} for user {userId}";
    await chatClient
      .prompt()
      .user((u) =>
        u
          .text(complexTemplate)
          .param("topic", "machine learning")
          .param("aspect1", "performance")
          .param("aspect2", "scalability")
          .param("userId", "user1"),
      )
      .call()
      .chatResponse();

    const expectedQuery =
      "Please analyze machine learning considering performance and scalability for user user1";
    expect(capturedSearchRequest.query).toBe(expectedQuery);

    const userMessage = capturedPrompt.instructions[0];
    expect(userMessage.text).toContain(expectedQuery);
    expect(userMessage.text).not.toContain("{topic}");
    expect(userMessage.text).not.toContain("{aspect1}");
    expect(userMessage.text).not.toContain("{aspect2}");
    expect(userMessage.text).not.toContain("{userId}");
  });

  it("qa advisor with documents containing metadata", async () => {
    let capturedPrompt = {} as Prompt;

    const chatModel = createChatModel(async (prompt) => {
      capturedPrompt = prompt;
      return createResponse("Metadata response");
    });

    const docWithMetadata1 = new Document("First document content", {
      source: "wiki",
      author: "John",
    });
    const docWithMetadata2 = new Document("Second document content", {
      source: "manual",
      version: "2.1",
    });

    const vectorStore = createVectorStore(async () => [
      docWithMetadata1,
      docWithMetadata2,
    ]);

    const qaAdvisor = QuestionAnswerAdvisor.builder(vectorStore)
      .searchRequest(SearchRequest.builder().topK(2).build())
      .build();

    const chatClient = ChatClient.builder(chatModel)
      .defaultAdvisors(qaAdvisor)
      .build();

    await chatClient
      .prompt()
      .user("Question about documents with metadata")
      .call()
      .chatResponse();

    const userMessage = capturedPrompt.instructions[0];
    expect(userMessage.text).toContain("First document content");
    expect(userMessage.text).toContain("Second document content");
  });

  it("qa advisor builder validation", () => {
    // Test that builder validates required parameters
    expect(() =>
      QuestionAnswerAdvisor.builder(null as unknown as VectorStore),
    ).toThrow();

    // Test successful builder creation
    const advisor = QuestionAnswerAdvisor.builder(
      createVectorStore(async () => []),
    ).build();
    expect(advisor).not.toBeNull();
  });

  it("qa advisor with zero top k", async () => {
    let capturedSearchRequest = {} as SearchRequest;

    const chatModel = createChatModel(async () =>
      createResponse("Zero docs response"),
    );
    const vectorStore = createVectorStore(async (searchRequest) => {
      capturedSearchRequest = searchRequest;
      return [];
    });

    const qaAdvisor = QuestionAnswerAdvisor.builder(vectorStore)
      .searchRequest(SearchRequest.builder().topK(0).build())
      .build();

    const chatClient = ChatClient.builder(chatModel)
      .defaultAdvisors(qaAdvisor)
      .build();

    await chatClient
      .prompt()
      .user("Question with zero topK")
      .call()
      .chatResponse();

    expect(capturedSearchRequest.topK).toBe(0);
  });
});

function createChatModel(
  onCall: (prompt: Prompt) => Promise<ChatResponse>,
): ChatModel {
  return {
    call: vi.fn(onCall),
    stream: vi.fn(),
  } as unknown as ChatModel;
}

function createVectorStore(
  onSimilaritySearch: (request: SearchRequest) => Promise<Document[]>,
): VectorStore {
  return {
    similaritySearch: vi.fn(async (request: SearchRequest | string) => {
      if (typeof request === "string") {
        throw new Error("Expected SearchRequest");
      }
      return onSimilaritySearch(request);
    }),
  } as unknown as VectorStore;
}

function createResponse(content: string): ChatResponse {
  return new ChatResponse({
    generations: [
      new Generation({
        assistantMessage: new AssistantMessage({ content }),
      }),
    ],
  });
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
