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

class DefaultImageModelOptions implements ImageOptions {
  private _n: number | null = null;
  private _model: string | null = null;
  private _width: number | null = null;
  private _height: number | null = null;
  private _responseFormat: string | null = null;
  private _style: string | null = null;

  get n(): number | null {
    return this._n;
  }

  set n(n: number | null) {
    this._n = n ?? null;
  }

  get model(): string | null {
    return this._model;
  }

  set model(model: string | null) {
    this._model = model ?? null;
  }

  get width(): number | null {
    return this._width;
  }

  set width(width: number | null) {
    this._width = width ?? null;
  }

  get height(): number | null {
    return this._height;
  }

  set height(height: number | null) {
    this._height = height ?? null;
  }

  get responseFormat(): string | null {
    return this._responseFormat;
  }

  set responseFormat(responseFormat: string | null) {
    this._responseFormat = responseFormat ?? null;
  }

  get style(): string | null {
    return this._style;
  }

  set style(style: string | null) {
    this._style = style ?? null;
  }
}

export class ImageOptionsBuilder {
  private readonly options = new DefaultImageModelOptions();

  private constructor() {}

  static builder(): ImageOptionsBuilder {
    return new ImageOptionsBuilder();
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
