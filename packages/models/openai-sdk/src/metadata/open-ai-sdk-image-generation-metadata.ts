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
 * Represents the metadata for image generation using the OpenAI Java SDK.
 */
export class OpenAiSdkImageGenerationMetadata {
  private readonly _revisedPrompt: string | null;

  constructor(revisedPrompt?: string | null) {
    this._revisedPrompt = revisedPrompt ?? null;
  }

  /**
   * Gets the revised prompt that was used for image generation.
   *
   * @returns the revised prompt, or null if not available
   */
  get revisedPrompt(): string | null {
    return this._revisedPrompt;
  }
}
