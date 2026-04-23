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

import type { ModelOptions } from "../../model/index.js";

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
