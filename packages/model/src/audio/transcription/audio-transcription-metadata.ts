import type { ResultMetadata } from "../../model/result-metadata.interface.js";

/**
 * Metadata associated with an audio transcription result.
 */
export abstract class AudioTranscriptionMetadata implements ResultMetadata {
  /**
   * Factory method used to construct a new {@link AudioTranscriptionMetadata}
   * @returns a new {@link AudioTranscriptionMetadata}
   */
  static create(): AudioTranscriptionMetadata {
    return new (class extends AudioTranscriptionMetadata {})();
  }

  static readonly NULL: AudioTranscriptionMetadata =
    AudioTranscriptionMetadata.create();
}
