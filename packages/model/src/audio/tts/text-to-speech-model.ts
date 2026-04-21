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
import { DefaultTextToSpeechOptions } from "./default-text-to-speech-options";
import { StreamingTextToSpeechModel } from "./streaming-text-to-speech-model";
import type { TextToSpeechOptions } from "./text-to-speech-options.interface";
import { TextToSpeechPrompt } from "./text-to-speech-prompt";
import type { TextToSpeechResponse } from "./text-to-speech-response";

export abstract class TextToSpeechModel
  extends StreamingTextToSpeechModel
  implements Model<TextToSpeechPrompt, TextToSpeechResponse>
{
  call(text: string): Promise<Uint8Array>;
  call(prompt: TextToSpeechPrompt): Promise<TextToSpeechResponse>;
  async call(
    promptOrText: TextToSpeechPrompt | string,
  ): Promise<TextToSpeechResponse | Uint8Array> {
    if (promptOrText instanceof TextToSpeechPrompt) {
      return this.callPrompt(promptOrText);
    }

    const prompt = new TextToSpeechPrompt({ text: promptOrText });
    const result = (await this.callPrompt(prompt)).result;
    return result != null ? result.output : new Uint8Array(0);
  }

  protected abstract callPrompt(
    prompt: TextToSpeechPrompt,
  ): Promise<TextToSpeechResponse>;

  get defaultOptions(): TextToSpeechOptions {
    return new DefaultTextToSpeechOptions();
  }
}
