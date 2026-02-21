import assert from "node:assert/strict";
import type { ChatClient } from "@nestjs-ai/client-chat";
import { type Logger, LoggerFactory } from "@nestjs-ai/commons";
import { PromptTemplate } from "@nestjs-ai/model";
import { PromptAssert } from "../../../util/prompt-assert";
import type { Query } from "../query";
import { QueryExpander } from "./query-expander";

const DEFAULT_PROMPT_TEMPLATE = new PromptTemplate(
  `You are an expert at information retrieval and search optimization.
Your task is to generate {number} different versions of the given query.

Each variant must cover different perspectives or aspects of the topic,
while maintaining the core intent of the original query. The goal is to
expand the search space and improve the chances of finding relevant information.

Do not explain your choices or add any other text.
Provide the query variants separated by newlines.

Original query: {query}

Query variants:`,
);

const DEFAULT_INCLUDE_ORIGINAL = true;

const DEFAULT_NUMBER_OF_QUERIES = 3;

/**
 * Uses a large language model to expand a query into multiple semantically diverse
 * variations to capture different perspectives, useful for retrieving additional
 * contextual information and increasing the chances of finding relevant results.
 *
 * @example
 * ```typescript
 * const expander = MultiQueryExpander.builder()
 *   .chatClientBuilder(chatClientBuilder)
 *   .numberOfQueries(3)
 *   .build();
 * const queries = await expander.expand(new Query("How to run a Spring Boot app?"));
 * ```
 *
 * @author Thomas Vitale
 * @since 1.0.0
 */
export class MultiQueryExpander extends QueryExpander {
  private static readonly logger: Logger = LoggerFactory.getLogger(
    MultiQueryExpander.name,
  );

  readonly chatClient: ChatClient;

  readonly promptTemplate: PromptTemplate;

  readonly includeOriginal: boolean;

  readonly numberOfQueries: number;

  /** @internal Use {@link MultiQueryExpander.builder} instead. */
  constructor(
    chatClientBuilder: ChatClient.Builder,
    promptTemplate?: PromptTemplate | null,
    includeOriginal?: boolean | null,
    numberOfQueries?: number | null,
  ) {
    super();
    assert(chatClientBuilder, "chatClientBuilder cannot be null");

    this.chatClient = chatClientBuilder.build();
    this.promptTemplate = promptTemplate ?? DEFAULT_PROMPT_TEMPLATE;
    this.includeOriginal = includeOriginal ?? DEFAULT_INCLUDE_ORIGINAL;
    this.numberOfQueries = numberOfQueries ?? DEFAULT_NUMBER_OF_QUERIES;

    PromptAssert.templateHasRequiredPlaceholders(
      this.promptTemplate,
      "number",
      "query",
    );
  }

  override async expand(query: Query): Promise<Query[]> {
    assert(query, "query cannot be null");

    MultiQueryExpander.logger.debug(
      "Generating {} query variants",
      this.numberOfQueries,
    );

    const response = await this.chatClient
      .prompt()
      .user((user) =>
        user
          .text(this.promptTemplate.template)
          .param("number", this.numberOfQueries)
          .param("query", query.text),
      )
      .call()
      .content();

    if (response == null) {
      MultiQueryExpander.logger.warn(
        "Query expansion result is null. Returning the input query unchanged.",
      );
      return [query];
    }

    const queryVariants = response.split("\n");

    if (
      queryVariants.length === 0 ||
      this.numberOfQueries !== queryVariants.length
    ) {
      MultiQueryExpander.logger.warn(
        "Query expansion result does not contain the requested {} variants. Returning the input query unchanged.",
        this.numberOfQueries,
      );
      return [query];
    }

    const queries = queryVariants
      .filter((text) => text.trim().length > 0)
      .map((queryText) => query.mutate().text(queryText).build());

    if (this.includeOriginal) {
      MultiQueryExpander.logger.debug(
        "Including the original query in the result",
      );
      queries.unshift(query);
    }

    return queries;
  }

  static builder(): MultiQueryExpanderBuilder {
    return new MultiQueryExpanderBuilder();
  }
}

export class MultiQueryExpanderBuilder {
  private _chatClientBuilder: ChatClient.Builder | null = null;

  private _promptTemplate: PromptTemplate | null = null;

  private _includeOriginal: boolean | null = null;

  private _numberOfQueries: number | null = null;

  chatClientBuilder(chatClientBuilder: ChatClient.Builder): this {
    this._chatClientBuilder = chatClientBuilder;
    return this;
  }

  promptTemplate(promptTemplate: PromptTemplate): this {
    this._promptTemplate = promptTemplate;
    return this;
  }

  includeOriginal(includeOriginal: boolean): this {
    this._includeOriginal = includeOriginal;
    return this;
  }

  numberOfQueries(numberOfQueries: number): this {
    this._numberOfQueries = numberOfQueries;
    return this;
  }

  build(): MultiQueryExpander {
    assert(this._chatClientBuilder, "chatClientBuilder cannot be null");
    return new MultiQueryExpander(
      this._chatClientBuilder,
      this._promptTemplate,
      this._includeOriginal,
      this._numberOfQueries,
    );
  }
}
