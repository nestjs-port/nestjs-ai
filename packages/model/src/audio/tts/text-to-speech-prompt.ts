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

import type { ModelRequest } from "../../model/index.js";
import { DefaultTextToSpeechOptions } from "./default-text-to-speech-options.js";
import { TextToSpeechMessage } from "./text-to-speech-message.js";
import type { TextToSpeechOptions } from "./text-to-speech-options.interface.js";

export interface TextToSpeechPromptProps {
  text?: string | null;
  message?: TextToSpeechMessage;
  options?: TextToSpeechOptions;
}

/**
 * Implementation of the {@link ModelRequest} interface for the text to speech prompt.
 */
export class TextToSpeechPrompt implements ModelRequest<TextToSpeechMessage> {
  private readonly _message: TextToSpeechMessage;
  private _options: TextToSpeechOptions;

  constructor(props: TextToSpeechPromptProps = {}) {
    this._message =
      props.message ?? new TextToSpeechMessage(props.text ?? null);
    this._options = props.options ?? new DefaultTextToSpeechOptions();
  }

  get instructions(): TextToSpeechMessage {
    return this._message;
  }

  get options(): TextToSpeechOptions {
    return this._options;
  }

  setOptions(options: TextToSpeechOptions): void {
    this._options = options;
  }
}
