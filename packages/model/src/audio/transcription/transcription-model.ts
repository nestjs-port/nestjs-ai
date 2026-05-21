import type { Model } from "../../model/model.interface.js";
import type { AudioTranscriptionOptions } from "./audio-transcription-options.js";
import {
  type AudioResource,
  AudioTranscriptionPrompt,
} from "./audio-transcription-prompt.js";
import type { AudioTranscriptionResponse } from "./audio-transcription-response.js";

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
