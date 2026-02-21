import assert from "node:assert/strict";
import type { ChatClient } from "@nestjs-ai/client-chat";
import { type Logger, LoggerFactory } from "@nestjs-ai/commons";
import { PromptTemplate } from "@nestjs-ai/model";
import { PromptAssert } from "../../../util/prompt-assert";
import type { Query } from "../query";
import { QueryTransformer } from "./query-transformer";

const DEFAULT_PROMPT_TEMPLATE = new PromptTemplate(
  `Given a user query, rewrite it to provide better results when querying a {target}.
Remove any irrelevant information, and ensure the query is concise and specific.

Original query:
{query}

Rewritten query:`,
);

const DEFAULT_TARGET = "vector store";

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
  private static readonly logger: Logger = LoggerFactory.getLogger(
    RewriteQueryTransformer.name,
  );

  readonly chatClient: ChatClient;

  readonly promptTemplate: PromptTemplate;

  readonly targetSearchSystem: string;

  /** @internal Use {@link RewriteQueryTransformer.builder} instead. */
  constructor(
    chatClientBuilder: ChatClient.Builder,
    promptTemplate?: PromptTemplate | null,
    targetSearchSystem?: string | null,
  ) {
    super();
    assert(chatClientBuilder, "chatClientBuilder cannot be null");

    this.chatClient = chatClientBuilder.build();
    this.promptTemplate = promptTemplate ?? DEFAULT_PROMPT_TEMPLATE;
    this.targetSearchSystem = targetSearchSystem ?? DEFAULT_TARGET;

    PromptAssert.templateHasRequiredPlaceholders(
      this.promptTemplate,
      "target",
      "query",
    );
  }

  override async transform(query: Query): Promise<Query> {
    assert(query, "query cannot be null");

    RewriteQueryTransformer.logger.debug(
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

    if (!rewrittenQueryText?.trim()) {
      RewriteQueryTransformer.logger.warn(
        "Query rewrite result is null/empty. Returning the input query unchanged.",
      );
      return query;
    }

    return query.mutate().text(rewrittenQueryText).build();
  }

  static builder(): RewriteQueryTransformerBuilder {
    return new RewriteQueryTransformerBuilder();
  }
}

export class RewriteQueryTransformerBuilder {
  private _chatClientBuilder: ChatClient.Builder | null = null;

  private _promptTemplate: PromptTemplate | null = null;

  private _targetSearchSystem: string | null = null;

  chatClientBuilder(chatClientBuilder: ChatClient.Builder): this {
    this._chatClientBuilder = chatClientBuilder;
    return this;
  }

  promptTemplate(promptTemplate: PromptTemplate): this {
    this._promptTemplate = promptTemplate;
    return this;
  }

  targetSearchSystem(targetSearchSystem: string): this {
    this._targetSearchSystem = targetSearchSystem;
    return this;
  }

  build(): RewriteQueryTransformer {
    assert(this._chatClientBuilder, "chatClientBuilder cannot be null");
    return new RewriteQueryTransformer(
      this._chatClientBuilder,
      this._promptTemplate,
      this._targetSearchSystem,
    );
  }
}
