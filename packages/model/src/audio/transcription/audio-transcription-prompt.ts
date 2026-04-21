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

import type { ModelRequest } from "../../model";
import type { AudioTranscriptionOptions } from "./audio-transcription-options";

export type AudioResource = string | URL | Buffer;

/**
 * Represents an audio transcription prompt for an AI model. It implements the
 * {@link ModelRequest} interface and provides the necessary information required to
 * interact with an AI model, including the audio resource and model options.
 */
export class AudioTranscriptionPrompt implements ModelRequest<AudioResource> {
  private readonly _audioResource: AudioResource;
  private readonly _modelOptions: AudioTranscriptionOptions | null;

  /**
   * Construct a new AudioTranscriptionPrompt given the resource representing the audio
   * file. The following input file types are supported: mp3, mp4, mpeg, mpga, m4a, wav,
   * and webm.
   * @param audioResource resource of the audio file.
   * @param modelOptions
   */
  constructor(
    audioResource: AudioResource,
    modelOptions: AudioTranscriptionOptions | null = null,
  ) {
    this._audioResource = audioResource;
    this._modelOptions = modelOptions;
  }

  get instructions(): AudioResource {
    return this._audioResource;
  }

  get options(): AudioTranscriptionOptions | null {
    return this._modelOptions;
  }
}
