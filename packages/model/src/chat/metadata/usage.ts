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
