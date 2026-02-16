import assert from "node:assert/strict";
import {
  type AiOperationMetadata,
  ObservationContext,
} from "@nestjs-ai/commons";

export class ModelObservationContext<REQ, RES> extends ObservationContext {
  private readonly _request: REQ;
  private readonly _operationMetadata: AiOperationMetadata;
  private _response: RES | null = null;

  constructor(request: REQ, operationMetadata: AiOperationMetadata) {
    super();
    assert(request != null, "request cannot be null");
    assert(operationMetadata != null, "operationMetadata cannot be null");
    assert(
      operationMetadata.operationType != null &&
        operationMetadata.operationType.trim().length > 0,
      "operationType cannot be null or empty",
    );
    assert(
      operationMetadata.provider != null &&
        operationMetadata.provider.trim().length > 0,
      "provider cannot be null or empty",
    );
    this._request = request;
    this._operationMetadata = operationMetadata;
  }

  get request(): REQ {
    return this._request;
  }

  get operationMetadata(): AiOperationMetadata {
    return this._operationMetadata;
  }

  get response(): RES | null {
    return this._response;
  }

  set response(response: RES) {
    assert(response != null, "response cannot be null");
    this._response = response;
  }
}
