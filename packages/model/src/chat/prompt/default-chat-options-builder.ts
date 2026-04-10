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

import type { ChatOptions } from "./chat-options.interface";
import { DefaultChatOptions } from "./default-chat-options";

export class DefaultChatOptionsBuilder implements ChatOptions.BuilderType {
  protected _model: string | null = null;
  protected _frequencyPenalty: number | null = null;
  protected _maxTokens: number | null = null;
  protected _presencePenalty: number | null = null;
  protected _stopSequences: string[] | null = null;
  protected _temperature: number | null = null;
  protected _topK: number | null = null;
  protected _topP: number | null = null;

  clone(): this {
    const copy = Object.assign(
      Object.create(Object.getPrototypeOf(this)),
      this,
    ) as this;
    if (this._stopSequences != null) {
      copy._stopSequences = [...this._stopSequences];
    }
    return copy;
  }

  protected self(): this {
    return this;
  }

  model(model: string | null): this {
    this._model = model;
    return this.self();
  }

  frequencyPenalty(frequencyPenalty: number | null): this {
    this._frequencyPenalty = frequencyPenalty;
    return this.self();
  }

  maxTokens(maxTokens: number | null): this {
    this._maxTokens = maxTokens;
    return this.self();
  }

  presencePenalty(presencePenalty: number | null): this {
    this._presencePenalty = presencePenalty;
    return this.self();
  }

  stopSequences(stopSequences: string[] | null): this {
    this._stopSequences = stopSequences != null ? [...stopSequences] : null;
    return this.self();
  }

  temperature(temperature: number | null): this {
    this._temperature = temperature;
    return this.self();
  }

  topK(topK: number | null): this {
    this._topK = topK;
    return this.self();
  }

  topP(topP: number | null): this {
    this._topP = topP;
    return this.self();
  }

  combineWith(other: ChatOptions.BuilderType): this {
    if (other instanceof DefaultChatOptionsBuilder) {
      if (other._model != null) {
        this._model = other._model;
      }
      if (other._frequencyPenalty != null) {
        this._frequencyPenalty = other._frequencyPenalty;
      }
      if (other._maxTokens != null) {
        this._maxTokens = other._maxTokens;
      }
      if (other._presencePenalty != null) {
        this._presencePenalty = other._presencePenalty;
      }
      if (other._stopSequences != null) {
        this._stopSequences = other._stopSequences;
      }
      if (other._temperature != null) {
        this._temperature = other._temperature;
      }
      if (other._topK != null) {
        this._topK = other._topK;
      }
      if (other._topP != null) {
        this._topP = other._topP;
      }
    }
    return this;
  }

  build(): ChatOptions {
    return new DefaultChatOptions({
      model: this._model,
      frequencyPenalty: this._frequencyPenalty,
      maxTokens: this._maxTokens,
      presencePenalty: this._presencePenalty,
      stopSequences: this._stopSequences ? [...this._stopSequences] : null,
      temperature: this._temperature,
      topK: this._topK,
      topP: this._topP,
    });
  }
}
