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
