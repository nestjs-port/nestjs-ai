/**
 * Abstract Data Type (ADT) encapsulating metadata on the usage of an AI provider's API
 * per AI request.
 */
export abstract class Usage {
  /**
   * Returns the number of tokens used in the prompt of the AI request.
   *
   * @returns the number of tokens used in the prompt of the AI request
   * @see {@link completionTokens}
   */
  abstract get promptTokens(): number;

  /**
   * Returns the number of tokens returned in the generation (aka completion)
   * of the AI's response.
   *
   * @returns the number of tokens returned in the generation (aka completion)
   * of the AI's response
   * @see {@link promptTokens}
   */
  abstract get completionTokens(): number;

  /**
   * Returns the usage data from the underlying model API response.
   *
   * @returns the object of type inferred by the API response
   */
  abstract get nativeUsage(): unknown;

  /**
   * Returns the total number of tokens from both the prompt of an AI request
   * and generation of the AI's response.
   *
   * @returns the total number of tokens from both the prompt of an AI request
   * and generation of the AI's response
   * @see {@link promptTokens}
   * @see {@link completionTokens}
   */
  get totalTokens(): number {
    const prompt = this.promptTokens ?? 0;
    const completion = this.completionTokens ?? 0;
    return prompt + completion;
  }
}
