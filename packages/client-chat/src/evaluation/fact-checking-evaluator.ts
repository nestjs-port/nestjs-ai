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
import type { ChatClient } from "../chat-client.js";

export interface FactCheckingEvaluatorProps {
  chatClientBuilder: ChatClient.Builder;
  evaluationPrompt?: string | null;
}

export class FactCheckingEvaluator extends Evaluator {
  static readonly DEFAULT_EVALUATION_PROMPT_TEXT = `Evaluate whether or not the following claim is supported by the provided document.
Respond with "yes" if the claim is supported, or "no" if it is not.

Document:
{document}

Claim:
{claim}`;

  static readonly BESPOKE_EVALUATION_PROMPT_TEXT = `Document:
{document}

Claim:
{claim}`;

  private readonly _chatClientBuilder: ChatClient.Builder;

  private readonly _evaluationPrompt: string;

  constructor({
    chatClientBuilder,
    evaluationPrompt = null,
  }: FactCheckingEvaluatorProps) {
    super();
    assert(chatClientBuilder != null, "chatClientBuilder cannot be null");
    this._chatClientBuilder = chatClientBuilder;
    this._evaluationPrompt =
      evaluationPrompt ?? FactCheckingEvaluator.DEFAULT_EVALUATION_PROMPT_TEXT;
  }

  static forBespokeMinicheck(
    chatClientBuilder: ChatClient.Builder,
  ): FactCheckingEvaluator {
    return new FactCheckingEvaluator({
      chatClientBuilder,
      evaluationPrompt: FactCheckingEvaluator.BESPOKE_EVALUATION_PROMPT_TEXT,
    });
  }

  override async evaluate(
    evaluationRequest: EvaluationRequest,
  ): Promise<EvaluationResponse> {
    const response = evaluationRequest.responseContent;
    const context = this.doGetSupportingData(evaluationRequest);

    const evaluationResponse = await this._chatClientBuilder
      .build()
      .prompt()
      .user((userSpec) =>
        userSpec
          .text(this._evaluationPrompt)
          .param("document", context)
          .param("claim", response),
      )
      .call()
      .content();

    const passing = "yes" === (evaluationResponse ?? "").trim().toLowerCase();
    return new EvaluationResponse(passing, "", {});
  }
}
