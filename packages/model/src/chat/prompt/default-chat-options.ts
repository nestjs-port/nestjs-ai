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

export type DefaultChatOptionsProps = Omit<Partial<ChatOptions>, "copy">;

/**
 * Default implementation for the {@link ChatOptions}.
 */
export class DefaultChatOptions implements ChatOptions {
  model?: string | null;
  frequencyPenalty?: number | null;
  maxTokens?: number | null;
  presencePenalty?: number | null;
  stopSequences?: string[] | null;
  temperature?: number | null;
  topK?: number | null;
  topP?: number | null;

  constructor(options?: DefaultChatOptionsProps) {
    if (options) {
      this.model = options.model;
      this.frequencyPenalty = options.frequencyPenalty;
      this.maxTokens = options.maxTokens;
      this.presencePenalty = options.presencePenalty;
      this.stopSequences = options.stopSequences;
      this.temperature = options.temperature;
      this.topK = options.topK;
      this.topP = options.topP;
    }
  }

  copy(): ChatOptions {
    return new DefaultChatOptions({
      model: this.model,
      frequencyPenalty: this.frequencyPenalty,
      maxTokens: this.maxTokens,
      presencePenalty: this.presencePenalty,
      stopSequences: this.stopSequences ? [...this.stopSequences] : null,
      temperature: this.temperature,
      topK: this.topK,
      topP: this.topP,
    });
  }
}
