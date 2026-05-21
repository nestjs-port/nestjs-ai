import type { ModelResult } from "../model/model-result.interface.js";
import type { Moderation } from "./moderation.js";
import type { ModerationGenerationMetadata } from "./moderation-generation-metadata.js";

export interface ModerationGenerationProps {
  moderation: Moderation;
  moderationGenerationMetadata?: ModerationGenerationMetadata;
}

/**
 * The Generation class represents a response from a moderation process. It encapsulates
 * the moderation generation metadata and the moderation object.
 */
export class ModerationGeneration implements ModelResult<Moderation> {
  private static readonly NONE: ModerationGenerationMetadata = {};

  private _moderationGenerationMetadata: ModerationGenerationMetadata =
    ModerationGeneration.NONE;
  private readonly _moderation: Moderation;

  constructor(props: ModerationGenerationProps) {
    this._moderation = props.moderation;
    if (props.moderationGenerationMetadata !== undefined) {
      this._moderationGenerationMetadata = props.moderationGenerationMetadata;
    }
  }

  generationMetadata(
    moderationGenerationMetadata: ModerationGenerationMetadata,
  ): ModerationGeneration {
    this._moderationGenerationMetadata = moderationGenerationMetadata;
    return this;
  }

  get output(): Moderation {
    return this._moderation;
  }

  get metadata(): ModerationGenerationMetadata {
    return this._moderationGenerationMetadata;
  }
}
