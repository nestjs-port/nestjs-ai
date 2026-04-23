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

import { EOL } from "node:os";

import { StringUtils } from "@nestjs-port/core";
import type { EvaluationRequest } from "./evaluation-request.js";
import type { EvaluationResponse } from "./evaluation-response.js";

export abstract class Evaluator {
  abstract evaluate(
    evaluationRequest: EvaluationRequest,
  ): Promise<EvaluationResponse>;

  protected doGetSupportingData(evaluationRequest: EvaluationRequest): string {
    return evaluationRequest.dataList
      .map((document) => document.text)
      .filter((text): text is string => StringUtils.hasText(text))
      .join(EOL);
  }
}
