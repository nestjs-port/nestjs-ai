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

import type { ModelResponse } from "../model";
import type { ModerationGeneration } from "./moderationGeneration";
import { ModerationResponseMetadata } from "./moderation-response-metadata";

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
