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

import assert from "node:assert/strict";

import { ImageResponseMetadata } from "@nestjs-ai/model";
import type { ImagesResponse } from "openai/resources/images";

/**
 * Represents the metadata for image response using the OpenAI Java SDK.
 */
export class OpenAiImageResponseMetadata extends ImageResponseMetadata {
  /**
   * Creates metadata from an ImagesResponse.
   * @param imagesResponse the OpenAI images response
   * @returns the metadata instance
   */
  static from(
    imagesResponse: ImagesResponse | null | undefined,
  ): OpenAiImageResponseMetadata {
    assert(imagesResponse != null, "imagesResponse must not be null");
    return new OpenAiImageResponseMetadata(imagesResponse.created);
  }
}
