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

import type { Observable } from "rxjs";
import { map } from "rxjs/operators";
import type { StreamingModel } from "../../model";
import type { TextToSpeechOptions } from "./text-to-speech-options.interface";
import { TextToSpeechPrompt } from "./text-to-speech-prompt";
import type { TextToSpeechResponse } from "./text-to-speech-response";

/**
 * Interface for the streaming text to speech model.
 */
export abstract class StreamingTextToSpeechModel
  implements StreamingModel<TextToSpeechPrompt, TextToSpeechResponse>
{
  stream(text: string): Observable<Uint8Array>;
  stream(text: string, options: TextToSpeechOptions): Observable<Uint8Array>;
  stream(prompt: TextToSpeechPrompt): Observable<TextToSpeechResponse>;
  stream(
    promptOrText: TextToSpeechPrompt | string,
    options?: TextToSpeechOptions,
  ): Observable<TextToSpeechResponse | Uint8Array> {
    if (promptOrText instanceof TextToSpeechPrompt) {
      return this.streamPrompt(promptOrText);
    }

    const prompt = new TextToSpeechPrompt({
      text: promptOrText,
      options: options,
    });

    return this.streamPrompt(prompt).pipe(
      map((response) => {
        const result = response.result;
        return result != null ? result.output : new Uint8Array(0);
      }),
    );
  }

  protected abstract streamPrompt(
    prompt: TextToSpeechPrompt,
  ): Observable<TextToSpeechResponse>;
}
