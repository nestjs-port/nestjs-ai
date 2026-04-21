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
import type { AudioTranscription } from "./audio-transcription";
import { AudioTranscriptionResponseMetadata } from "./audio-transcription-response-metadata";

/**
 * A response containing an audio transcription result.
 */
export class AudioTranscriptionResponse implements ModelResponse<AudioTranscription> {
  private readonly _transcript: AudioTranscription;
  private readonly _transcriptionResponseMetadata: AudioTranscriptionResponseMetadata;

  constructor(
    transcript: AudioTranscription,
    transcriptionResponseMetadata: AudioTranscriptionResponseMetadata = new AudioTranscriptionResponseMetadata(),
  ) {
    assert(transcript, "AudioTranscription must not be null");
    assert(
      transcriptionResponseMetadata,
      "AudioTranscriptionResponseMetadata must not be null",
    );
    this._transcript = transcript;
    this._transcriptionResponseMetadata = transcriptionResponseMetadata;
  }

  get result(): AudioTranscription {
    return this._transcript;
  }

  get results(): AudioTranscription[] {
    return [this._transcript];
  }

  get metadata(): AudioTranscriptionResponseMetadata {
    return this._transcriptionResponseMetadata;
  }
}
