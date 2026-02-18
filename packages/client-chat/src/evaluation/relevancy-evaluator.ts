import assert from "node:assert/strict";
import {
  type EvaluationRequest,
  EvaluationResponse,
  Evaluator,
} from "@nestjs-ai/commons";
import { PromptTemplate } from "@nestjs-ai/model";
import type { ChatClient } from "../chat-client";

export class RelevancyEvaluator extends Evaluator {
  static readonly DEFAULT_PROMPT_TEMPLATE =
    new PromptTemplate(`Your task is to evaluate if the response for the query
is in line with the context information provided.

You have two options to answer. Either YES or NO.

Answer YES, if the response for the query
is in line with context information otherwise NO.

Query:
{query}

Response:
{response}

Context:
{context}

Answer:`);

  private readonly _chatClientBuilder: ChatClient.Builder;

  private readonly _promptTemplate: PromptTemplate;

  constructor(
    chatClientBuilder: ChatClient.Builder,
    promptTemplate: PromptTemplate | null = RelevancyEvaluator.DEFAULT_PROMPT_TEMPLATE,
  ) {
    super();
    assert(chatClientBuilder != null, "chatClientBuilder cannot be null");
    this._chatClientBuilder = chatClientBuilder;
    this._promptTemplate =
      promptTemplate ?? RelevancyEvaluator.DEFAULT_PROMPT_TEMPLATE;
  }

  override async evaluate(
    evaluationRequest: EvaluationRequest,
  ): Promise<EvaluationResponse> {
    const response = evaluationRequest.responseContent;
    const context = this.doGetSupportingData(evaluationRequest);

    const userMessage = this._promptTemplate.render({
      query: evaluationRequest.userText,
      response,
      context,
    });

    const evaluationResponse = await this._chatClientBuilder
      .build()
      .prompt()
      .user(userMessage)
      .call()
      .content();

    const passing = "yes" === (evaluationResponse ?? "").toLowerCase();
    const score = passing ? 1 : 0;

    return new EvaluationResponse(passing, score, "", {});
  }
}
