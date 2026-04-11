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

import { ChatOptions } from "./chat-options.interface";

export type DefaultChatOptionsProps = Omit<Partial<ChatOptions>, "copy">;

/**
 * Default implementation for the {@link ChatOptions}.
 */
export class DefaultChatOptions implements ChatOptions {
  model: string | null = null;
  frequencyPenalty: number | null = null;
  maxTokens: number | null = null;
  presencePenalty: number | null = null;
  private _stopSequences: string[] | null = null;
  temperature: number | null = null;
  topK: number | null = null;
  topP: number | null = null;

  constructor(options?: DefaultChatOptionsProps) {
    if (options) {
      this.model = options.model ?? null;
      this.frequencyPenalty = options.frequencyPenalty ?? null;
      this.maxTokens = options.maxTokens ?? null;
      this.presencePenalty = options.presencePenalty ?? null;
      this.setStopSequences(options.stopSequences ?? null);
      this.temperature = options.temperature ?? null;
      this.topK = options.topK ?? null;
      this.topP = options.topP ?? null;
    }
  }

  /**
   * Create a builder to mutate this chat options.
   */
  mutate(): ChatOptions.Builder {
    return ChatOptions.builder()
      .model(this.model ?? null)
      .frequencyPenalty(this.frequencyPenalty ?? null)
      .maxTokens(this.maxTokens ?? null)
      .presencePenalty(this.presencePenalty ?? null)
      .stopSequences(this.stopSequences ? [...this.stopSequences] : null)
      .temperature(this.temperature ?? null)
      .topK(this.topK ?? null)
      .topP(this.topP ?? null);
  }

  copy<T extends ChatOptions>(): T {
    return this.mutate().build() as T;
  }

  get stopSequences(): string[] | null {
    return this._stopSequences != null
      ? (Object.freeze([...this._stopSequences]) as string[])
      : null;
  }

  setStopSequences(stopSequences: string[] | null): void {
    this._stopSequences = stopSequences != null ? [...stopSequences] : null;
  }
}
