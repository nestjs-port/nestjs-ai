import assert from "node:assert/strict";

export class AiOperationMetadata {
  private readonly _operationType: string;
  private readonly _provider: string;

  constructor(operationType: string, provider: string) {
    assert(
      operationType != null && operationType.trim().length > 0,
      "operationType cannot be null or empty",
    );
    assert(
      provider != null && provider.trim().length > 0,
      "provider cannot be null or empty",
    );
    this._operationType = operationType;
    this._provider = provider;
  }

  get operationType(): string {
    return this._operationType;
  }

  get provider(): string {
    return this._provider;
  }
}
