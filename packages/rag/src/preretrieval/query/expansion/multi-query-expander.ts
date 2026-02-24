import assert from "node:assert/strict";
import type { ChatClient } from "@nestjs-ai/client-chat";
import { type Logger, LoggerFactory, StringUtils } from "@nestjs-ai/commons";
import { PromptTemplate } from "@nestjs-ai/model";
import type { Query } from "../../../query";
import { PromptAssert } from "../../../util";
import { QueryExpander } from "./query-expander";

export interface MultiQueryExpanderProps {
  chatClientBuilder: ChatClient.Builder;
  promptTemplate?: PromptTemplate | null;
  includeOriginal?: boolean | null;
  numberOfQueries?: number | null;
}

/**
 * Uses a large language model to expand a query into multiple semantically diverse
 * variations to capture different perspectives, useful for retrieving additional
 * contextual information and increasing the chances of finding relevant results.
 *
 * @example
 * ```typescript
 * const expander = new MultiQueryExpander({
 *   chatClientBuilder,
 *   numberOfQueries: 3,
 * });
 * const queries = await expander.expand(new Query("How to run a Spring Boot app?"));
 * ```
 *
 * @author Thomas Vitale
 * @since 1.0.0
 */
export class MultiQueryExpander extends QueryExpander {
  private readonly logger: Logger = LoggerFactory.getLogger(
    MultiQueryExpander.name,
  );

  private static readonly DEFAULT_PROMPT_TEMPLATE = new PromptTemplate(
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

  private static readonly DEFAULT_INCLUDE_ORIGINAL = true;

  private static readonly DEFAULT_NUMBER_OF_QUERIES = 3;

  readonly chatClient: ChatClient;

  readonly promptTemplate: PromptTemplate;

  readonly includeOriginal: boolean;

  readonly numberOfQueries: number;

  constructor(props: MultiQueryExpanderProps) {
    super();
    assert(props.chatClientBuilder, "chatClientBuilder cannot be null");

    this.chatClient = props.chatClientBuilder.build();
    this.promptTemplate =
      props.promptTemplate ?? MultiQueryExpander.DEFAULT_PROMPT_TEMPLATE;
    this.includeOriginal =
      props.includeOriginal ?? MultiQueryExpander.DEFAULT_INCLUDE_ORIGINAL;
    this.numberOfQueries =
      props.numberOfQueries ?? MultiQueryExpander.DEFAULT_NUMBER_OF_QUERIES;

    PromptAssert.templateHasRequiredPlaceholders(
      this.promptTemplate,
      "number",
      "query",
    );
  }

  override async expand(query: Query): Promise<Query[]> {
    assert(query, "query cannot be null");

    this.logger.debug("Generating {} query variants", this.numberOfQueries);

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
      this.logger.warn(
        "Query expansion result is null. Returning the input query unchanged.",
      );
      return [query];
    }

    const queryVariants = response.split("\n");

    if (
      queryVariants.length === 0 ||
      this.numberOfQueries !== queryVariants.length
    ) {
      this.logger.warn(
        "Query expansion result does not contain the requested {} variants. Returning the input query unchanged.",
        this.numberOfQueries,
      );
      return [query];
    }

    const queries = queryVariants
      .filter(StringUtils.hasText)
      .map((queryText) => query.mutate().text(queryText).build());

    if (this.includeOriginal) {
      this.logger.debug("Including the original query in the result");
      queries.unshift(query);
    }

    return queries;
  }
}
