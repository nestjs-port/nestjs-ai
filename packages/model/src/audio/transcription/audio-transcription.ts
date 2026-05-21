import type { ModelResult } from "../../model/model-result.interface.js";
import { AudioTranscriptionMetadata } from "./audio-transcription-metadata.js";

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
