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

import type { TextToSpeechOptions } from "./text-to-speech-options.interface";

export interface DefaultTextToSpeechOptionsProps {
  model?: string | null;
  voice?: string | null;
  format?: string | null;
  speed?: number | null;
}

/**
 * Default implementation for text-to-speech options.
 */
export class DefaultTextToSpeechOptions implements TextToSpeechOptions {
  private readonly _model: string | null;
  private readonly _voice: string | null;
  private readonly _format: string | null;
  private readonly _speed: number | null;

  constructor(options: DefaultTextToSpeechOptionsProps = {}) {
    this._model = options.model ?? null;
    this._voice = options.voice ?? null;
    this._format = options.format ?? null;
    this._speed = options.speed ?? null;
  }

  get model(): string | null {
    return this._model;
  }

  get voice(): string | null {
    return this._voice;
  }

  get format(): string | null {
    return this._format;
  }

  get speed(): number | null {
    return this._speed;
  }

  copy(): DefaultTextToSpeechOptions {
    return new DefaultTextToSpeechOptions({
      model: this._model,
      voice: this._voice,
      format: this._format,
      speed: this._speed,
    });
  }
}
