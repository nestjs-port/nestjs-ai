import type { ModelResponse } from "../model/model-response.interface.js";
import type { ModerationGeneration } from "./moderationGeneration.js";
import { ModerationResponseMetadata } from "./moderation-response-metadata.js";

/**
 * Represents a response from a moderation process, encapsulating the moderation metadata
 * and the generated content. This class provides access to both the single generation
 * result and a list containing that result, alongside the metadata associated with the
 * moderation response. Designed for flexibility, it allows retrieval of
 * moderation-specific metadata as well as the moderated content.
 */
export class ModerationResponse implements ModelResponse<ModerationGeneration> {
  private readonly _moderationResponseMetadata: ModerationResponseMetadata;
  private readonly _generation: ModerationGeneration | null;

  constructor(generation: ModerationGeneration | null);
  constructor(
    generation: ModerationGeneration | null,
    moderationResponseMetadata: ModerationResponseMetadata,
  );
  constructor(
    generation: ModerationGeneration | null,
    moderationResponseMetadata: ModerationResponseMetadata = new ModerationResponseMetadata(),
  ) {
    this._moderationResponseMetadata = moderationResponseMetadata;
    this._generation = generation;
  }

  get result(): ModerationGeneration | null {
    return this._generation;
  }

  get results(): ModerationGeneration[] {
    if (this._generation === null) {
      return [];
    }
    return [this._generation];
  }

  get metadata(): ModerationResponseMetadata {
    return this._moderationResponseMetadata;
  }
}
