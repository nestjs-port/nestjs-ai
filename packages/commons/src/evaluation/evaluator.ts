import { EOL } from "node:os";

import { StringUtils } from "../util";
import type { EvaluationRequest } from "./evaluation-request";
import type { EvaluationResponse } from "./evaluation-response";

export abstract class Evaluator {
  abstract evaluate(evaluationRequest: EvaluationRequest): EvaluationResponse;

  protected doGetSupportingData(evaluationRequest: EvaluationRequest): string {
    return evaluationRequest.dataList
      .map((document) => document.text)
      .filter((text): text is string => StringUtils.hasText(text))
      .join(EOL);
  }
}
