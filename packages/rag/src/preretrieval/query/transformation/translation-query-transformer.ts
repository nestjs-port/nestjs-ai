import assert from "node:assert/strict";
import type { ChatClient } from "@nestjs-ai/client-chat";
import { type Logger, LoggerFactory, StringUtils } from "@nestjs-ai/commons";
import { PromptTemplate } from "@nestjs-ai/model";
import { PromptAssert } from "../../../util/prompt-assert";
import type { Query } from "../query";
import { QueryTransformer } from "./query-transformer";

const DEFAULT_PROMPT_TEMPLATE = new PromptTemplate(
  `Given a user query, translate it to {targetLanguage}.
If the query is already in {targetLanguage}, return it unchanged.
If you don't know the language of the query, return it unchanged.
Do not add explanations nor any other text.

Original query: {query}

Translated query:`,
);

/**
 * Uses a large language model to translate a query to a target language that is supported
 * by the embedding model used to generate the document embeddings. If the query is
 * already in the target language, it is returned unchanged. If the language of the query
 * is unknown, it is also returned unchanged.
 *
 * This transformer is useful when the embedding model is trained on a specific language
 * and the user query is in a different language.
 *
 * @example
 * ```typescript
 * const transformer = TranslationQueryTransformer.builder()
 *   .chatClientBuilder(chatClientBuilder)
 *   .targetLanguage("english")
 *   .build();
 * const transformedQuery = await transformer.transform(new Query("Hvad er Danmarks hovedstad?"));
 * ```
 *
 * @author Thomas Vitale
 * @since 1.0.0
 */
export class TranslationQueryTransformer extends QueryTransformer {
  private static readonly logger: Logger = LoggerFactory.getLogger(
    TranslationQueryTransformer.name,
  );

  readonly chatClient: ChatClient;

  readonly promptTemplate: PromptTemplate;

  readonly targetLanguage: string;

  /** @internal Use {@link TranslationQueryTransformer.builder} instead. */
  constructor(
    chatClientBuilder: ChatClient.Builder,
    promptTemplate: PromptTemplate | null,
    targetLanguage: string,
  ) {
    super();
    assert(chatClientBuilder, "chatClientBuilder cannot be null");
    assert(
      StringUtils.hasText(targetLanguage),
      "targetLanguage cannot be null or empty",
    );

    this.chatClient = chatClientBuilder.build();
    this.promptTemplate = promptTemplate ?? DEFAULT_PROMPT_TEMPLATE;
    this.targetLanguage = targetLanguage;

    PromptAssert.templateHasRequiredPlaceholders(
      this.promptTemplate,
      "targetLanguage",
      "query",
    );
  }

  override async transform(query: Query): Promise<Query> {
    assert(query, "query cannot be null");

    TranslationQueryTransformer.logger.debug(
      "Translating query to target language: {}",
      this.targetLanguage,
    );

    const translatedQueryText = await this.chatClient
      .prompt()
      .user((user) =>
        user
          .text(this.promptTemplate.template)
          .param("targetLanguage", this.targetLanguage)
          .param("query", query.text),
      )
      .call()
      .content();

    if (!translatedQueryText?.trim()) {
      TranslationQueryTransformer.logger.warn(
        "Query translation result is null/empty. Returning the input query unchanged.",
      );
      return query;
    }

    return query.mutate().text(translatedQueryText).build();
  }

  static builder(): TranslationQueryTransformerBuilder {
    return new TranslationQueryTransformerBuilder();
  }
}

export class TranslationQueryTransformerBuilder {
  private _chatClientBuilder: ChatClient.Builder | null = null;

  private _promptTemplate: PromptTemplate | null = null;

  private _targetLanguage: string | null = null;

  chatClientBuilder(chatClientBuilder: ChatClient.Builder): this {
    this._chatClientBuilder = chatClientBuilder;
    return this;
  }

  promptTemplate(promptTemplate: PromptTemplate): this {
    this._promptTemplate = promptTemplate;
    return this;
  }

  targetLanguage(targetLanguage: string): this {
    this._targetLanguage = targetLanguage;
    return this;
  }

  build(): TranslationQueryTransformer {
    assert(this._chatClientBuilder, "chatClientBuilder cannot be null");
    assert(
      StringUtils.hasText(this._targetLanguage),
      "targetLanguage cannot be null or empty",
    );
    const targetLanguage = this._targetLanguage;
    assert(
      StringUtils.hasText(targetLanguage),
      "targetLanguage cannot be null or empty",
    );
    return new TranslationQueryTransformer(
      this._chatClientBuilder,
      this._promptTemplate,
      targetLanguage,
    );
  }
}
