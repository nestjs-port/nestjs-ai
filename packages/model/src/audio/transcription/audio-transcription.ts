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

import type { ModelResult } from "../../model";
import { AudioTranscriptionMetadata } from "./audio-transcription-metadata";

/**
 * Represents a response returned by the AI.
 */
export class AudioTranscription implements ModelResult<string> {
  private readonly _text: string;
  private _transcriptionMetadata: AudioTranscriptionMetadata =
    AudioTranscriptionMetadata.NULL;

  constructor(text: string) {
    this._text = text;
  }

  get output(): string {
    return this._text;
  }

  get metadata(): AudioTranscriptionMetadata {
    return this._transcriptionMetadata;
  }

  withTranscriptionMetadata(
    transcriptionMetadata: AudioTranscriptionMetadata,
  ): this {
    this._transcriptionMetadata = transcriptionMetadata;
    return this;
  }
}
