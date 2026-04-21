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

import type { Model } from "../../model";
import type { AudioTranscriptionOptions } from "./audio-transcription-options";
import {
  type AudioResource,
  AudioTranscriptionPrompt,
} from "./audio-transcription-prompt";
import type { AudioTranscriptionResponse } from "./audio-transcription-response";

/**
 * A transcription model is a type of AI model that converts audio to text. This is also
 * known as Speech-to-Text.
 */
export abstract class TranscriptionModel implements Model<
  AudioTranscriptionPrompt,
  AudioTranscriptionResponse
> {
  /**
   * Transcribes the audio from the given prompt.
   * @param transcriptionPrompt The prompt containing the audio resource and options.
   * @returns The transcription response.
   */
  abstract call(
    transcriptionPrompt: AudioTranscriptionPrompt,
  ): Promise<AudioTranscriptionResponse>;

  /**
   * A convenience method for transcribing an audio resource with the given options.
   * @param resource The audio resource to transcribe.
   * @param options The transcription options.
   * @returns The transcribed text.
   */
  async transcribe(
    resource: AudioResource,
    options: AudioTranscriptionOptions | null = null,
  ): Promise<string> {
    const prompt = new AudioTranscriptionPrompt(resource, options);
    const result = (await this.call(prompt)).result;
    return result != null ? result.output : "";
  }
}
