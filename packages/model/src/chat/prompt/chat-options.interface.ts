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
import { DefaultChatOptionsBuilder } from "./default-chat-options-builder.js";

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

  /**
   * Returns a new {@link ChatOptions.Builder} initialized with this
   * {@link ChatOptions} values.
   */
  mutate(): ChatOptions.Builder;
}

export namespace ChatOptions {
  /**
   * Builder for creating {@link ChatOptions} instance.
   */
  export interface Builder {
    clone(): this;

    /**
     * Mutate this builder by taking all `other`'s values that are non-null,
     * retaining `this` other values.
     */
    combineWith(other: this): this;

    /**
     * Builds with the model to use for the chat.
     * @param model - the model to use for the chat
     */
    model(model: string | null): this;

    /**
     * Builds with the frequency penalty to use for the chat.
     * @param frequencyPenalty - the frequency penalty to use for the chat
     */
    frequencyPenalty(frequencyPenalty: number | null): this;

    /**
     * Builds with the maximum number of tokens to use for the chat.
     * @param maxTokens - the maximum number of tokens to use for the chat
     */
    maxTokens(maxTokens: number | null): this;

    /**
     * Builds with the presence penalty to use for the chat.
     * @param presencePenalty - the presence penalty to use for the chat
     */
    presencePenalty(presencePenalty: number | null): this;

    /**
     * Builds with the stop sequences to use for the chat.
     * @param stopSequences - the stop sequences to use for the chat
     */
    stopSequences(stopSequences: string[] | null): this;

    /**
     * Builds with the temperature to use for the chat.
     * @param temperature - the temperature to use for the chat
     */
    temperature(temperature: number | null): this;

    /**
     * Builds with the top K to use for the chat.
     * @param topK - the top K to use for the chat
     */
    topK(topK: number | null): this;

    /**
     * Builds with the top P to use for the chat.
     * @param topP - the top P to use for the chat
     */
    topP(topP: number | null): this;

    /**
     * Build the `ChatOptions`.
     * @returns the Chat options
     */
    build(): ChatOptions;
  }

  /**
   * Creates a new `Builder` to create the default `ChatOptions`.
   * @returns a new `Builder`
   */
  export function builder(): Builder {
    return new DefaultChatOptionsBuilder();
  }
}
