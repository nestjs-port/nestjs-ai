import assert from "node:assert/strict";
import type { ChatClient } from "@nestjs-ai/client-chat";
import { type Logger, LoggerFactory } from "@nestjs-ai/commons";
import type { Message } from "@nestjs-ai/model";
import { MessageType, PromptTemplate } from "@nestjs-ai/model";
import { PromptAssert } from "../../../util/prompt-assert";
import type { Query } from "../query";
import { QueryTransformer } from "./query-transformer";

const DEFAULT_PROMPT_TEMPLATE = new PromptTemplate(
  `Given the following conversation history and a follow-up query, your task is to synthesize
a concise, standalone query that incorporates the context from the history.
Ensure the standalone query is clear, specific, and maintains the user's intent.

Conversation history:
{history}

Follow-up query:
{query}

Standalone query:`,
);

/**
 * Uses a large language model to compress a conversation history and a follow-up query
 * into a standalone query that captures the essence of the conversation.
 *
 * This transformer is useful when the conversation history is long and the follow-up
 * query is related to the conversation context.
 *
 * @author Thomas Vitale
 * @since 1.0.0
 */
export class CompressionQueryTransformer extends QueryTransformer {
  private static readonly logger: Logger = LoggerFactory.getLogger(
    CompressionQueryTransformer.name,
  );

  readonly chatClient: ChatClient;

  readonly promptTemplate: PromptTemplate;

  /** @internal Use {@link CompressionQueryTransformer.builder} instead. */
  constructor(
    chatClientBuilder: ChatClient.Builder,
    promptTemplate?: PromptTemplate | null,
  ) {
    super();
    assert(chatClientBuilder, "chatClientBuilder cannot be null");

    this.chatClient = chatClientBuilder.build();
    this.promptTemplate = promptTemplate ?? DEFAULT_PROMPT_TEMPLATE;

    PromptAssert.templateHasRequiredPlaceholders(
      this.promptTemplate,
      "history",
      "query",
    );
  }

  override async transform(query: Query): Promise<Query> {
    assert(query, "query cannot be null");

    CompressionQueryTransformer.logger.debug(
      "Compressing conversation history and follow-up query into a standalone query",
    );

    const compressedQueryText = await this.chatClient
      .prompt()
      .user((user) =>
        user
          .text(this.promptTemplate.template)
          .param("history", this.formatConversationHistory(query.history))
          .param("query", query.text),
      )
      .call()
      .content();

    if (!compressedQueryText?.trim()) {
      CompressionQueryTransformer.logger.warn(
        "Query compression result is null/empty. Returning the input query unchanged.",
      );
      return query;
    }

    return query.mutate().text(compressedQueryText).build();
  }

  private formatConversationHistory(history: Message[]): string {
    if (history.length === 0) {
      return "";
    }

    return history
      .filter(
        (message) =>
          message.messageType === MessageType.USER ||
          message.messageType === MessageType.ASSISTANT,
      )
      .map((message) => `${message.messageType}: ${message.text}`)
      .join("\n");
  }

  static builder(): CompressionQueryTransformerBuilder {
    return new CompressionQueryTransformerBuilder();
  }
}

export class CompressionQueryTransformerBuilder {
  private _chatClientBuilder: ChatClient.Builder | null = null;

  private _promptTemplate: PromptTemplate | null = null;

  chatClientBuilder(chatClientBuilder: ChatClient.Builder): this {
    this._chatClientBuilder = chatClientBuilder;
    return this;
  }

  promptTemplate(promptTemplate: PromptTemplate): this {
    this._promptTemplate = promptTemplate;
    return this;
  }

  build(): CompressionQueryTransformer {
    assert(this._chatClientBuilder, "chatClientBuilder cannot be null");
    return new CompressionQueryTransformer(
      this._chatClientBuilder,
      this._promptTemplate,
    );
  }
}
