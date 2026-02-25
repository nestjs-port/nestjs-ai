import assert from "node:assert/strict";
import { EOL } from "node:os";
import {
  type AdvisorChain,
  BaseAdvisor,
  type ChatClientRequest,
  ChatClientResponse,
} from "@nestjs-ai/client-chat";
import { type Document, StringUtils } from "@nestjs-ai/commons";
import { ChatResponse, PromptTemplate } from "@nestjs-ai/model";
import {
  type Filter,
  FilterExpressionTextParser,
  SearchRequest,
  type VectorStore,
} from "@nestjs-ai/vector-store";
import { queueScheduler, type SchedulerLike } from "rxjs";

export interface QuestionAnswerAdvisorProps {
  vectorStore: VectorStore;
  searchRequest: SearchRequest;
  promptTemplate?: PromptTemplate | null;
  scheduler?: SchedulerLike | null;
  order?: number | null;
}

export class QuestionAnswerAdvisor extends BaseAdvisor {
  static readonly RETRIEVED_DOCUMENTS = "qa_retrieved_documents";

  static readonly FILTER_EXPRESSION = "qa_filter_expression";

  private static readonly DEFAULT_PROMPT_TEMPLATE = new PromptTemplate(`
{query}

Context information is below, surrounded by ---------------------

---------------------
{question_answer_context}
---------------------

Given the context and provided history information and not prior knowledge,
reply to the user comment. If the answer is not in the context, inform
the user that you can't answer the question.
`);

  private static readonly DEFAULT_ORDER = 0;

  private readonly _vectorStore: VectorStore;
  private readonly _promptTemplate: PromptTemplate;
  private readonly _searchRequest: SearchRequest;
  private readonly _scheduler: SchedulerLike;
  private readonly _order: number;

  constructor(props: QuestionAnswerAdvisorProps) {
    super();
    assert(props.vectorStore != null, "vectorStore cannot be null");
    assert(props.searchRequest != null, "searchRequest cannot be null");

    this._vectorStore = props.vectorStore;
    this._searchRequest = props.searchRequest;
    this._promptTemplate =
      props.promptTemplate ?? QuestionAnswerAdvisor.DEFAULT_PROMPT_TEMPLATE;
    this._scheduler = props.scheduler ?? BaseAdvisor.DEFAULT_SCHEDULER;
    this._order = props.order ?? QuestionAnswerAdvisor.DEFAULT_ORDER;
  }

  static builder(vectorStore: VectorStore): QuestionAnswerAdvisor.Builder {
    return new QuestionAnswerAdvisor.Builder(vectorStore);
  }

  override get order(): number {
    return this._order;
  }

  override async before(
    chatClientRequest: ChatClientRequest,
    _advisorChain: AdvisorChain,
  ): Promise<ChatClientRequest> {
    // 1. Search for similar documents in the vector store.
    const searchRequestBuilder = SearchRequest.from(this._searchRequest).query(
      chatClientRequest.prompt.userMessage.text ?? "",
    );

    const filterExpr = this.doGetFilterExpression(chatClientRequest.context);
    if (filterExpr != null) {
      searchRequestBuilder.filterExpression(filterExpr);
    }

    const searchRequestToUse = searchRequestBuilder.build();
    const documents =
      await this._vectorStore.similaritySearch(searchRequestToUse);

    // 2. Create the context from the documents.
    const context = chatClientRequest.context;
    context.set(QuestionAnswerAdvisor.RETRIEVED_DOCUMENTS, documents);

    const documentContext = documents
      .map((document: Document) => document.text ?? "")
      .join(EOL);

    // 3. Augment the user prompt with the document context.
    const userMessage = chatClientRequest.prompt.userMessage;
    const augmentedUserText = this._promptTemplate.render({
      query: userMessage.text,
      question_answer_context: documentContext,
    });

    // 4. Update ChatClientRequest with augmented prompt.
    return chatClientRequest
      .mutate()
      .prompt(chatClientRequest.prompt.augmentUserMessage(augmentedUserText))
      .context(context)
      .build();
  }

  override async after(
    chatClientResponse: ChatClientResponse,
    _advisorChain: AdvisorChain,
  ): Promise<ChatClientResponse> {
    const chatResponseBuilder =
      chatClientResponse.chatResponse == null
        ? ChatResponse.builder().generations([])
        : ChatResponse.builder().from(chatClientResponse.chatResponse);

    const retrievedDocuments = chatClientResponse.context.get(
      QuestionAnswerAdvisor.RETRIEVED_DOCUMENTS,
    );
    if (retrievedDocuments != null) {
      chatResponseBuilder.metadata(
        QuestionAnswerAdvisor.RETRIEVED_DOCUMENTS,
        retrievedDocuments,
      );
    }

    return ChatClientResponse.builder()
      .chatResponse(chatResponseBuilder.build())
      .context(chatClientResponse.context)
      .build();
  }

  protected doGetFilterExpression(
    context: Map<string, unknown>,
  ): Filter.Expression | null {
    const contextFilterExpression = context.get(
      QuestionAnswerAdvisor.FILTER_EXPRESSION,
    );
    if (
      contextFilterExpression == null ||
      !StringUtils.hasText(String(contextFilterExpression))
    ) {
      return this._searchRequest.filterExpression;
    }

    return new FilterExpressionTextParser().parse(
      String(contextFilterExpression),
    );
  }

  override get scheduler(): SchedulerLike {
    return this._scheduler;
  }
}

export namespace QuestionAnswerAdvisor {
  export class Builder {
    private readonly _vectorStore: VectorStore;
    private _searchRequest: SearchRequest = SearchRequest.builder().build();
    private _promptTemplate: PromptTemplate | null = null;
    private _scheduler: SchedulerLike | null = null;
    private _order = 0;

    constructor(vectorStore: VectorStore) {
      assert(vectorStore != null, "The vectorStore must not be null!");
      this._vectorStore = vectorStore;
    }

    promptTemplate(promptTemplate: PromptTemplate): this {
      assert(promptTemplate != null, "promptTemplate cannot be null");
      this._promptTemplate = promptTemplate;
      return this;
    }

    searchRequest(searchRequest: SearchRequest): this {
      assert(searchRequest != null, "The searchRequest must not be null!");
      this._searchRequest = searchRequest;
      return this;
    }

    protectFromBlocking(protectFromBlocking: boolean): this {
      this._scheduler = protectFromBlocking
        ? BaseAdvisor.DEFAULT_SCHEDULER
        : queueScheduler;
      return this;
    }

    scheduler(scheduler: SchedulerLike): this {
      this._scheduler = scheduler;
      return this;
    }

    order(order: number): this {
      this._order = order;
      return this;
    }

    build(): QuestionAnswerAdvisor {
      return new QuestionAnswerAdvisor({
        vectorStore: this._vectorStore,
        searchRequest: this._searchRequest,
        promptTemplate: this._promptTemplate,
        scheduler: this._scheduler,
        order: this._order,
      });
    }
  }
}
