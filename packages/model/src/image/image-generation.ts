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

import type { ModelResult } from "../model/index.js";
import type { Image } from "./image.js";
import type { ImageGenerationMetadata } from "./image-generation-metadata.js";

export interface ImageGenerationProps {
  image: Image;
  imageGenerationMetadata?: ImageGenerationMetadata | null;
}

export class ImageGeneration implements ModelResult<Image> {
  private readonly _image: Image;
  private readonly _imageGenerationMetadata: ImageGenerationMetadata;

  constructor(props: ImageGenerationProps) {
    this._image = props.image;
    this._imageGenerationMetadata =
      props.imageGenerationMetadata ??
      (null as unknown as ImageGenerationMetadata);
  }

  get output(): Image {
    return this._image;
  }

  get metadata(): ImageGenerationMetadata {
    return this._imageGenerationMetadata;
  }
}
