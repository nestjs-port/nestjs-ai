import type { ModelRequest } from "../../model/model-request.interface.js";
import type { AudioTranscriptionOptions } from "./audio-transcription-options.js";

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
