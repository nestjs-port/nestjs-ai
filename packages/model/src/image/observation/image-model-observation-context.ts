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
import { AiOperationMetadata, AiOperationType } from "@nestjs-ai/commons";
import { ModelObservationContext } from "../../model/index.js";
import type { ImagePrompt } from "../image-prompt.js";
import type { ImageResponse } from "../image-response.js";

export class ImageModelObservationContext extends ModelObservationContext<
  ImagePrompt,
  ImageResponse
> {
  constructor(imagePrompt: ImagePrompt, provider: string) {
    super(
      imagePrompt,
      new AiOperationMetadata(AiOperationType.IMAGE.value, provider),
    );
    assert(imagePrompt.options != null, "image options cannot be null");
  }

  get operationType(): string {
    return AiOperationType.IMAGE.value;
  }
}
