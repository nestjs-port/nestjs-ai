import assert from "node:assert/strict";
import type { ChatClient } from "@nestjs-ai/client-chat";
import { type Logger, LoggerFactory, StringUtils } from "@nestjs-ai/commons";
import { PromptTemplate } from "@nestjs-ai/model";
import { PromptAssert } from "../../../util";
import type { Query } from "../query";
import { QueryTransformer } from "./query-transformer";

export interface RewriteQueryTransformerProps {
  chatClientBuilder: ChatClient.Builder;
  promptTemplate?: PromptTemplate | null;
  targetSearchSystem?: string | null;
}

/**
 * Uses a large language model to rewrite a user query to provide better results when
 * querying a target system, such as a vector store or a web search engine.
 *
 * This transformer is useful when the user query is verbose, ambiguous, or contains
 * irrelevant information that may affect the quality of the search results.
 *
 * @author Thomas Vitale
 * @since 1.0.0
 * @see https://arxiv.org/pdf/2305.14283
 */
export class RewriteQueryTransformer extends QueryTransformer {
  private readonly logger: Logger = LoggerFactory.getLogger(
    RewriteQueryTransformer.name,
  );

  private static readonly DEFAULT_PROMPT_TEMPLATE = new PromptTemplate(
    `Given a user query, rewrite it to provide better results when querying a {target}.
Remove any irrelevant information, and ensure the query is concise and specific.

Original query:
{query}

Rewritten query:`,
  );

  private static readonly DEFAULT_TARGET = "vector store";

  readonly chatClient: ChatClient;

  readonly promptTemplate: PromptTemplate;

  readonly targetSearchSystem: string;

  constructor(props: RewriteQueryTransformerProps) {
    super();
    assert(props.chatClientBuilder, "chatClientBuilder cannot be null");

    this.chatClient = props.chatClientBuilder.build();
    this.promptTemplate =
      props.promptTemplate ?? RewriteQueryTransformer.DEFAULT_PROMPT_TEMPLATE;
    this.targetSearchSystem =
      props.targetSearchSystem ?? RewriteQueryTransformer.DEFAULT_TARGET;

    PromptAssert.templateHasRequiredPlaceholders(
      this.promptTemplate,
      "target",
      "query",
    );
  }

  override async transform(query: Query): Promise<Query> {
    assert(query, "query cannot be null");

    this.logger.debug(
      "Rewriting query to optimize for querying a {}.",
      this.targetSearchSystem,
    );

    const rewrittenQueryText = await this.chatClient
      .prompt()
      .user((user) =>
        user
          .text(this.promptTemplate.template)
          .param("target", this.targetSearchSystem)
          .param("query", query.text),
      )
      .call()
      .content();

    if (!StringUtils.hasText(rewrittenQueryText)) {
      this.logger.warn(
        "Query rewrite result is null/empty. Returning the input query unchanged.",
      );
      return query;
    }

    return query.mutate().text(rewrittenQueryText).build();
  }
}
