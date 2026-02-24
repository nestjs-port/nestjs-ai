import assert from "node:assert/strict";
import {
  type AdvisorChain,
  BaseAdvisor,
  type ChatClientRequest,
  ChatClientResponse,
} from "@nestjs-ai/client-chat";
import type { Document } from "@nestjs-ai/commons";
import { ChatResponse } from "@nestjs-ai/model";
import { ContextualQueryAugmenter, type QueryAugmenter } from "../generation";
import type { DocumentPostProcessor } from "../postretrieval";
import type { QueryExpander, QueryTransformer } from "../preretrieval";
import { Query } from "../query";
import {
  ConcatenationDocumentJoiner,
  type DocumentJoiner,
  type DocumentRetriever,
} from "../retrieval";

export interface RetrievalAugmentationAdvisorProps {
  queryTransformers?: QueryTransformer[] | null;
  queryExpander?: QueryExpander | null;
  documentRetriever: DocumentRetriever;
  documentJoiner?: DocumentJoiner | null;
  documentPostProcessors?: DocumentPostProcessor[] | null;
  queryAugmenter?: QueryAugmenter | null;
  scheduler?: BaseAdvisor["scheduler"] | null;
  order?: number | null;
}

/**
 * Advisor that implements common Retrieval Augmented Generation (RAG) flows using the
 * building blocks defined in the `@nestjs-ai/rag` package and following the Modular
 * RAG Architecture.
 */
export class RetrievalAugmentationAdvisor extends BaseAdvisor {
  static readonly DOCUMENT_CONTEXT = "rag_document_context";

  private readonly _queryTransformers: QueryTransformer[];
  private readonly _queryExpander: QueryExpander | null;
  private readonly _documentRetriever: DocumentRetriever;
  private readonly _documentJoiner: DocumentJoiner;
  private readonly _documentPostProcessors: DocumentPostProcessor[];
  private readonly _queryAugmenter: QueryAugmenter;
  private readonly _scheduler: BaseAdvisor["scheduler"];
  private readonly _order: number;

  constructor(props: RetrievalAugmentationAdvisorProps) {
    super();
    assert(props.documentRetriever != null, "documentRetriever cannot be null");

    if (props.queryTransformers != null) {
      for (const queryTransformer of props.queryTransformers) {
        assert(
          queryTransformer != null,
          "queryTransformers cannot contain null elements",
        );
      }
    }

    if (props.documentPostProcessors != null) {
      for (const documentPostProcessor of props.documentPostProcessors) {
        assert(
          documentPostProcessor != null,
          "documentPostProcessors cannot contain null elements",
        );
      }
    }

    this._queryTransformers = props.queryTransformers ?? [];
    this._queryExpander = props.queryExpander ?? null;
    this._documentRetriever = props.documentRetriever;
    this._documentJoiner =
      props.documentJoiner ?? new ConcatenationDocumentJoiner();
    this._documentPostProcessors = props.documentPostProcessors ?? [];
    this._queryAugmenter =
      props.queryAugmenter ?? new ContextualQueryAugmenter();
    this._scheduler = props.scheduler ?? BaseAdvisor.DEFAULT_SCHEDULER;
    this._order = props.order ?? 0;
  }

  override async before(
    chatClientRequest: ChatClientRequest,
    _advisorChain: AdvisorChain,
  ): Promise<ChatClientRequest> {
    const context = chatClientRequest.context;

    // 0. Create a query from the user text, parameters, and conversation history.
    const text = chatClientRequest.prompt.userMessage.text;
    const originalQuery = Query.builder()
      .text(text ?? "")
      .history(chatClientRequest.prompt.instructions)
      .context(Object.fromEntries(context))
      .build();

    // 1. Transform original user query based on a chain of query transformers.
    let transformedQuery = originalQuery;
    for (const queryTransformer of this._queryTransformers) {
      transformedQuery = await queryTransformer.apply(transformedQuery);
    }

    // 2. Expand query into one or multiple queries.
    const expandedQueries =
      this._queryExpander != null
        ? await this._queryExpander.expand(transformedQuery)
        : [transformedQuery];

    // 3. Get similar documents for each query.
    const documentsByQueryEntries = await Promise.all(
      expandedQueries.map((query) => this.getDocumentsForQuery(query)),
    );
    const documentsForQuery = new Map<Query, Document[][]>(
      documentsByQueryEntries.map(([query, documents]) => [query, [documents]]),
    );

    // 4. Combine documents retrieved based on multiple queries and from multiple data
    // sources.
    let documents = this._documentJoiner.join(documentsForQuery);

    // 5. Post-process the documents.
    for (const documentPostProcessor of this._documentPostProcessors) {
      documents = documentPostProcessor.process(originalQuery, documents);
    }
    context.set(RetrievalAugmentationAdvisor.DOCUMENT_CONTEXT, documents);

    // 6. Augment user query with the document contextual data.
    const augmentedQuery = this._queryAugmenter.augment(
      originalQuery,
      documents,
    );

    // 7. Update ChatClientRequest with augmented prompt.
    return chatClientRequest
      .mutate()
      .prompt(chatClientRequest.prompt.augmentUserMessage(augmentedQuery.text))
      .context(context)
      .build();
  }

  /**
   * Processes a single query by routing it to document retrievers and collecting
   * documents.
   */
  private async getDocumentsForQuery(
    query: Query,
  ): Promise<[Query, Document[]]> {
    const documents = await this._documentRetriever.retrieve(query);
    return [query, documents];
  }

  override async after(
    chatClientResponse: ChatClientResponse,
    _advisorChain: AdvisorChain,
  ): Promise<ChatClientResponse> {
    const chatResponseBuilder =
      chatClientResponse.chatResponse == null
        ? ChatResponse.builder().generations([])
        : ChatResponse.builder().from(chatClientResponse.chatResponse);

    const ctx = chatClientResponse.context.get(
      RetrievalAugmentationAdvisor.DOCUMENT_CONTEXT,
    );
    if (ctx != null) {
      chatResponseBuilder.metadata(
        RetrievalAugmentationAdvisor.DOCUMENT_CONTEXT,
        ctx,
      );
    }

    return ChatClientResponse.builder()
      .chatResponse(chatResponseBuilder.build())
      .context(chatClientResponse.context)
      .build();
  }

  override get scheduler(): BaseAdvisor["scheduler"] {
    return this._scheduler;
  }

  override get order(): number {
    return this._order;
  }
}
