/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
