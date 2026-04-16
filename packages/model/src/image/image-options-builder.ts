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
  private _n: number | null = null;
  private _model: string | null = null;
  private _width: number | null = null;
  private _height: number | null = null;
  private _responseFormat: string | null = null;
  private _style: string | null = null;

  constructor(props: ImageOptionsProps = {}) {
    this.setN(props.n ?? null);
    this.setModel(props.model ?? null);
    this.setWidth(props.width ?? null);
    this.setHeight(props.height ?? null);
    this.setResponseFormat(props.responseFormat ?? null);
    this.setStyle(props.style ?? null);
  }

  get n(): number | null {
    return this._n;
  }

  setN(n: number | null): void {
    this._n = n;
  }

  get model(): string | null {
    return this._model;
  }

  setModel(model: string | null): void {
    this._model = model;
  }

  get width(): number | null {
    return this._width;
  }

  setWidth(width: number | null): void {
    this._width = width;
  }

  get height(): number | null {
    return this._height;
  }

  setHeight(height: number | null): void {
    this._height = height;
  }

  get responseFormat(): string | null {
    return this._responseFormat;
  }

  setResponseFormat(responseFormat: string | null): void {
    this._responseFormat = responseFormat;
  }

  get style(): string | null {
    return this._style;
  }

  setStyle(style: string | null): void {
    this._style = style;
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
    this.options.setN(n);
    return this;
  }

  model(model: string): ImageOptionsBuilder {
    this.options.setModel(model);
    return this;
  }

  responseFormat(responseFormat: string): ImageOptionsBuilder {
    this.options.setResponseFormat(responseFormat);
    return this;
  }

  width(width: number): ImageOptionsBuilder {
    this.options.setWidth(width);
    return this;
  }

  height(height: number): ImageOptionsBuilder {
    this.options.setHeight(height);
    return this;
  }

  style(style: string): ImageOptionsBuilder {
    this.options.setStyle(style);
    return this;
  }

  build(): ImageOptions {
    return this.options;
  }
}
