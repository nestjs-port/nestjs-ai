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
import type { ModelResponse } from "../model";
import type { ImageGeneration } from "./image-generation";
import { ImageResponseMetadata } from "./image-response-metadata";

export interface ImageResponseProps {
  generations: ImageGeneration[];
  imageResponseMetadata?: ImageResponseMetadata;
}

/**
 * The image completion response returned by an AI provider.
 */
export class ImageResponse implements ModelResponse<ImageGeneration> {
  private readonly _imageResponseMetadata: ImageResponseMetadata;
  private readonly _imageGenerations: ImageGeneration[];

  constructor(props: ImageResponseProps) {
    assert(props.generations, "Generations must not be null");
    this._imageResponseMetadata =
      props.imageResponseMetadata ?? new ImageResponseMetadata();
    this._imageGenerations = [...props.generations];
  }

  get results(): ImageGeneration[] {
    return this._imageGenerations;
  }

  get result(): ImageGeneration | null {
    return this._imageGenerations.length > 0 ? this._imageGenerations[0] : null;
  }

  get metadata(): ImageResponseMetadata {
    return this._imageResponseMetadata;
  }
}
