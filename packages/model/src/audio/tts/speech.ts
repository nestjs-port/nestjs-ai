import type { ModelResult } from "../../model/model-result.interface.js";
import type { ResultMetadata } from "../../model/result-metadata.interface.js";

/**
 * Implementation of the {@link ModelResult} interface for the speech model.
 */
export class Speech implements ModelResult<Uint8Array> {
  private readonly _speech: Uint8Array;

  constructor(speech: Uint8Array) {
    this._speech = speech;
  }

  get output(): Uint8Array {
    return this._speech;
  }

  get metadata(): ResultMetadata {
    return new (class implements ResultMetadata {})();
  }
}
