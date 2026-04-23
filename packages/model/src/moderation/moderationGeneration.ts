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

import type { ModelResult } from "../model/index.js";
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
