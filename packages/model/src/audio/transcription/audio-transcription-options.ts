import type { ModelOptions } from "../../model/model-options.interface.js";

/**
 * Options for audio transcription.
 */
export interface AudioTranscriptionOptions extends ModelOptions {
  get model(): string;
}
