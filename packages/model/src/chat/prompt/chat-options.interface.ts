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

import type { ModelOptions } from "../../model";

/**
 * {@link ModelOptions} representing the common options that are portable across different
 * chat models.
 */
export interface ChatOptions extends ModelOptions {
  /**
   * Returns the model to use for the chat.
   * @returns the model to use for the chat
   */
  model?: string | null;

  /**
   * Returns the frequency penalty to use for the chat.
   * @returns the frequency penalty to use for the chat
   */
  frequencyPenalty?: number | null;

  /**
   * Returns the maximum number of tokens to use for the chat.
   * @returns the maximum number of tokens to use for the chat
   */
  maxTokens?: number | null;

  /**
   * Returns the presence penalty to use for the chat.
   * @returns the presence penalty to use for the chat
   */
  presencePenalty?: number | null;

  /**
   * Returns the stop sequences to use for the chat.
   * @returns the stop sequences to use for the chat
   */
  stopSequences?: string[] | null;

  /**
   * Returns the temperature to use for the chat.
   * @returns the temperature to use for the chat
   */
  temperature?: number | null;

  /**
   * Returns the top K to use for the chat.
   * @returns the top K to use for the chat
   */
  topK?: number | null;

  /**
   * Returns the top P to use for the chat.
   * @returns the top P to use for the chat
   */
  topP?: number | null;

  /**
   * Returns a copy of this {@link ChatOptions}.
   * @returns a copy of this {@link ChatOptions}
   */
  copy(): ChatOptions;
}

export namespace ChatOptions {
  export interface Builder {
    model(model: string | null): Builder;

    frequencyPenalty(frequencyPenalty: number | null): Builder;

    maxTokens(maxTokens: number | null): Builder;

    presencePenalty(presencePenalty: number | null): Builder;

    stopSequences(stopSequences: string[] | null): Builder;

    temperature(temperature: number | null): Builder;

    topK(topK: number | null): Builder;

    topP(topP: number | null): Builder;

    build(): ChatOptions;
  }
}
