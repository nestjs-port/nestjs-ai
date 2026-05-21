import { AbstractResponseMetadata } from "../model/abstract-response-metadata.js";

/**
 * Represents metadata associated with an image response.
 */
export class ImageResponseMetadata extends AbstractResponseMetadata {
  private readonly _created: number | null;

  constructor(created?: number | null) {
    super();
    this._created = created ?? Date.now();
  }

  get created(): number | null {
    return this._created;
  }
}
