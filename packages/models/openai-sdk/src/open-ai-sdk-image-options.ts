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

import type { ImageOptions, ImagePrompt } from "@nestjs-ai/model";
import type { ImageGenerateParams, ImageModel } from "openai/resources/images";

import {
  AbstractOpenAiSdkOptions,
  type AbstractOpenAiSdkOptionsProps,
} from "./abstract-open-ai-sdk-options";

export type OpenAiSdkImageGenerateParams = ImageGenerateParams;

export interface OpenAiSdkImageOptionsProps
  extends AbstractOpenAiSdkOptionsProps {
  n?: number | null;
  width?: number | null;
  height?: number | null;
  quality?: string | null;
  responseFormat?: string | null;
  size?: string | null;
  style?: string | null;
  user?: string | null;
}

/**
 * Configuration information for the Image Model implementation using the OpenAI Java SDK.
 */
export class OpenAiSdkImageOptions
  extends AbstractOpenAiSdkOptions
  implements ImageOptions
{
  static readonly DEFAULT_IMAGE_MODEL: ImageModel = "dall-e-3";

  private _n: number | null = null;
  private _width: number | null = null;
  private _height: number | null = null;
  private _quality: string | null = null;
  private _responseFormat: string | null = null;
  private _size: string | null = null;
  private _style: string | null = null;
  private _user: string | null = null;

  constructor(props: OpenAiSdkImageOptionsProps = {}) {
    super(props);
    this._n = props.n ?? null;
    this._width = props.width ?? null;
    this._height = props.height ?? null;
    this._quality = props.quality ?? null;
    this._responseFormat = props.responseFormat ?? null;
    this._size = props.size ?? this.computeSize(this._width, this._height);
    this._style = props.style ?? null;
    this._user = props.user ?? null;
  }

  get n(): number | null {
    return this._n;
  }

  setN(n: number | null): void {
    this._n = n ?? null;
  }

  get width(): number | null {
    return this._width;
  }

  setWidth(width: number | null): void {
    this._width = width ?? null;
    this._size = this.computeSize(this._width, this._height);
  }

  get height(): number | null {
    return this._height;
  }

  setHeight(height: number | null): void {
    this._height = height ?? null;
    this._size = this.computeSize(this._width, this._height);
  }

  get quality(): string | null {
    return this._quality;
  }

  setQuality(quality: string | null): void {
    this._quality = quality ?? null;
  }

  get responseFormat(): string | null {
    return this._responseFormat;
  }

  setResponseFormat(responseFormat: string | null): void {
    this._responseFormat = responseFormat ?? null;
  }

  get size(): string | null {
    if (this._size != null) {
      return this._size;
    }
    return this._width != null && this._height != null
      ? `${this._width}x${this._height}`
      : null;
  }

  setSize(size: string | null): void {
    this._size = size ?? null;
  }

  get style(): string | null {
    return this._style;
  }

  setStyle(style: string | null): void {
    this._style = style ?? null;
  }

  get user(): string | null {
    return this._user;
  }

  setUser(user: string | null): void {
    this._user = user ?? null;
  }

  toOpenAiImageGenerateParams(
    imagePrompt: ImagePrompt,
  ): OpenAiSdkImageGenerateParams {
    const prompt = this.extractPrompt(imagePrompt);

    assert(prompt.length > 0, "Image prompt instructions cannot be empty");

    const params: OpenAiSdkImageGenerateParams = {
      prompt,
      model:
        this.deploymentName != null
          ? this.deploymentName
          : this.model != null
            ? this.model
            : OpenAiSdkImageOptions.DEFAULT_IMAGE_MODEL,
    };

    if (this.n != null) {
      params.n = this.n;
    }
    if (this.quality != null) {
      params.quality = this.quality.toLowerCase() as
        | "standard"
        | "hd"
        | "low"
        | "medium"
        | "high"
        | "auto";
    }
    if (this.responseFormat != null) {
      params.response_format = this.responseFormat.toLowerCase() as
        | "url"
        | "b64_json";
    }
    if (this.size != null) {
      params.size = this.size as
        | "auto"
        | "1024x1024"
        | "1536x1024"
        | "1024x1536"
        | "256x256"
        | "512x512"
        | "1792x1024"
        | "1024x1792";
    }
    if (this.style != null) {
      params.style = this.style.toLowerCase() as "vivid" | "natural";
    }
    if (this.user != null) {
      params.user = this.user;
    }

    return params;
  }

  private extractPrompt(imagePrompt: ImagePrompt): string {
    assert(
      imagePrompt.instructions != null,
      "Image prompt instructions cannot be null",
    );
    assert(
      imagePrompt.instructions.length > 0,
      "Image prompt instructions cannot be empty",
    );

    const instruction = imagePrompt.instructions[0];
    assert(instruction != null, "Image prompt instruction cannot be null");
    assert(instruction.text != null, "Image prompt text cannot be null");
    return instruction.text;
  }

  private computeSize(
    width: number | null,
    height: number | null,
  ): string | null {
    return width != null && height != null ? `${width}x${height}` : null;
  }
}
