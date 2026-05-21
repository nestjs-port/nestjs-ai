import type { ModelOptions } from "../../model/model-options.interface.js";

/**
 * Interface for text-to-speech model options. Defines the common, portable options that
 * should be supported by all implementations.
 */
export interface TextToSpeechOptions extends ModelOptions {
  /**
   * Returns the model to use for text-to-speech.
   */
  model?: string | null;

  /**
   * Returns the voice to use for text-to-speech.
   */
  voice?: string | null;

  /**
   * Returns the output format for the generated audio.
   */
  format?: string | null;

  /**
   * Returns the speed of the generated speech.
   */
  speed?: number | null;

  /**
   * Returns a copy of this {@link TextToSpeechOptions}.
   */
  copy(): TextToSpeechOptions;
}
