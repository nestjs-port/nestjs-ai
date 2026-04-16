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

import type { ImageOptions } from "./image-options";

export interface ImageOptionsProps {
  n?: number | null;
  model?: string | null;
  width?: number | null;
  height?: number | null;
  responseFormat?: string | null;
  style?: string | null;
}

class DefaultImageModelOptions implements ImageOptions {
  n: number | null = null;
  model: string | null = null;
  width: number | null = null;
  height: number | null = null;
  responseFormat: string | null = null;
  style: string | null = null;

  constructor(props: ImageOptionsProps = {}) {
    this.n = props.n ?? null;
    this.model = props.model ?? null;
    this.width = props.width ?? null;
    this.height = props.height ?? null;
    this.responseFormat = props.responseFormat ?? null;
    this.style = props.style ?? null;
  }
}

export class ImageOptionsBuilder {
  private readonly options: DefaultImageModelOptions;

  private constructor(props: ImageOptionsProps = {}) {
    this.options = new DefaultImageModelOptions(props);
  }

  static builder(): ImageOptionsBuilder;
  static builder(props: ImageOptionsProps): ImageOptionsBuilder;
  static builder(props: ImageOptionsProps = {}): ImageOptionsBuilder {
    return new ImageOptionsBuilder(props);
  }

  static from(props: ImageOptionsProps): ImageOptions {
    return new DefaultImageModelOptions(props);
  }

  N(n: number): ImageOptionsBuilder {
    this.options.n = n;
    return this;
  }

  model(model: string): ImageOptionsBuilder {
    this.options.model = model;
    return this;
  }

  responseFormat(responseFormat: string): ImageOptionsBuilder {
    this.options.responseFormat = responseFormat;
    return this;
  }

  width(width: number): ImageOptionsBuilder {
    this.options.width = width;
    return this;
  }

  height(height: number): ImageOptionsBuilder {
    this.options.height = height;
    return this;
  }

  style(style: string): ImageOptionsBuilder {
    this.options.style = style;
    return this;
  }

  build(): ImageOptions {
    return this.options;
  }
}
