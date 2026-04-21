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

import assert from "node:assert/strict";
import type { ModelResponse } from "../../model";
import type { Speech } from "./speech";
import { TextToSpeechResponseMetadata } from "./text-to-speech-response-metadata";

export interface TextToSpeechResponseProps {
  results: Speech[];
  metadata?: TextToSpeechResponseMetadata;
}

/**
 * Response returned by a text-to-speech model.
 */
export class TextToSpeechResponse implements ModelResponse<Speech> {
  private readonly _results: Speech[];
  private readonly _metadata: TextToSpeechResponseMetadata;

  constructor(props: TextToSpeechResponseProps) {
    assert(props.results, "TextToSpeechResponse results must not be null");
    this._results = props.results;
    this._metadata = props.metadata ?? new TextToSpeechResponseMetadata();
  }

  get results(): Speech[] {
    return this._results;
  }

  get result(): Speech | null {
    assert(
      this._results.length > 0,
      "TextToSpeechResponse must contain at least one result",
    );
    return this._results[0];
  }

  get metadata(): TextToSpeechResponseMetadata {
    return this._metadata;
  }
}
