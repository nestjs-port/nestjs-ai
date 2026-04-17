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
import type {
  ImageGenerateParamsNonStreaming,
  ImageModel,
} from "openai/resources/images";

import {
  AbstractOpenAiSdkOptions,
  type AbstractOpenAiSdkOptionsProps,
} from "./abstract-open-ai-sdk-options";

export interface OpenAiSdkImageOptionsProps
  extends AbstractOpenAiSdkOptionsProps {
  n?: number | null;
  width?: number | null;
  height?: number | null;
  quality?: ImageGenerateParamsNonStreaming["quality"] | null;
  responseFormat?: NonNullable<
    ImageGenerateParamsNonStreaming["response_format"]
  > | null;
  size?: NonNullable<ImageGenerateParamsNonStreaming["size"]> | null;
  style?: NonNullable<ImageGenerateParamsNonStreaming["style"]> | null;
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
  private _quality: ImageGenerateParamsNonStreaming["quality"] | null = null;
  private _responseFormat: NonNullable<
    ImageGenerateParamsNonStreaming["response_format"]
  > | null = null;
  private _size: NonNullable<ImageGenerateParamsNonStreaming["size"]> | null =
    null;
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

  static builder(): OpenAiSdkImageOptions.Builder {
    return new OpenAiSdkImageOptions.Builder();
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

  get quality(): ImageGenerateParamsNonStreaming["quality"] | null {
    return this._quality;
  }

  setQuality(quality: ImageGenerateParamsNonStreaming["quality"] | null): void {
    this._quality = quality ?? null;
  }

  get responseFormat(): NonNullable<
    ImageGenerateParamsNonStreaming["response_format"]
  > | null {
    return this._responseFormat;
  }

  setResponseFormat(
    responseFormat: NonNullable<
      ImageGenerateParamsNonStreaming["response_format"]
    > | null,
  ): void {
    this._responseFormat = responseFormat ?? null;
  }

  get size(): NonNullable<ImageGenerateParamsNonStreaming["size"]> | null {
    if (this._size != null) {
      return this._size;
    }
    return this._width != null && this._height != null
      ? (`${this._width}x${this._height}` as NonNullable<
          ImageGenerateParamsNonStreaming["size"]
        >)
      : null;
  }

  setSize(
    size: NonNullable<ImageGenerateParamsNonStreaming["size"]> | null,
  ): void {
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
  ): ImageGenerateParamsNonStreaming {
    const prompt = this.extractPrompt(imagePrompt);

    assert(prompt.length > 0, "Image prompt instructions cannot be empty");

    const params: ImageGenerateParamsNonStreaming = {
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
      params.quality = this.quality;
    }
    if (this.responseFormat != null) {
      params.response_format = this.responseFormat;
    }
    if (this.size != null) {
      params.size = this.size;
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
  ): NonNullable<ImageGenerateParamsNonStreaming["size"]> | null {
    return width != null && height != null
      ? (`${width}x${height}` as NonNullable<
          ImageGenerateParamsNonStreaming["size"]
        >)
      : null;
  }
}

export namespace OpenAiSdkImageOptions {
  export class Builder {
    private readonly options = new OpenAiSdkImageOptions();

    from(fromOptions: OpenAiSdkImageOptions): this {
      this.options.baseUrl = fromOptions.baseUrl;
      this.options.apiKey = fromOptions.apiKey;
      this.options.azureADTokenProvider = fromOptions.azureADTokenProvider;
      this.options.model = fromOptions.model;
      this.options.deploymentName = fromOptions.deploymentName;
      this.options.microsoftFoundryServiceVersion =
        fromOptions.microsoftFoundryServiceVersion;
      this.options.organizationId = fromOptions.organizationId;
      this.options.microsoftFoundry = fromOptions.microsoftFoundry;
      this.options.gitHubModels = fromOptions.gitHubModels;
      this.options.timeout = fromOptions.timeout;
      this.options.maxRetries = fromOptions.maxRetries;
      this.options.fetchOptions = fromOptions.fetchOptions;
      this.options.customHeaders = fromOptions.customHeaders;
      this.options.setN(fromOptions.n);
      this.options.setWidth(fromOptions.width);
      this.options.setHeight(fromOptions.height);
      this.options.setQuality(fromOptions.quality);
      this.options.setResponseFormat(fromOptions.responseFormat);
      this.options.setSize(fromOptions.size);
      this.options.setStyle(fromOptions.style);
      this.options.setUser(fromOptions.user);
      return this;
    }

    merge(from: ImageOptions | null | undefined): this {
      if (from instanceof OpenAiSdkImageOptions) {
        if (from.baseUrl != null) {
          this.options.baseUrl = from.baseUrl;
        }
        if (from.apiKey != null) {
          this.options.apiKey = from.apiKey;
        }
        if (from.azureADTokenProvider != null) {
          this.options.azureADTokenProvider = from.azureADTokenProvider;
        }
        if (from.model != null) {
          this.options.model = from.model;
        }
        if (from.deploymentName != null) {
          this.options.deploymentName = from.deploymentName;
        }
        if (from.microsoftFoundryServiceVersion != null) {
          this.options.microsoftFoundryServiceVersion =
            from.microsoftFoundryServiceVersion;
        }
        if (from.organizationId != null) {
          this.options.organizationId = from.organizationId;
        }
        this.options.microsoftFoundry = from.microsoftFoundry;
        this.options.gitHubModels = from.gitHubModels;
        if (from.timeout != null) {
          this.options.timeout = from.timeout;
        }
        if (from.maxRetries != null) {
          this.options.maxRetries = from.maxRetries;
        }
        if (from.fetchOptions != null) {
          this.options.fetchOptions = from.fetchOptions;
        }
        this.options.customHeaders = from.customHeaders;
        if (from.n != null) {
          this.options.setN(from.n);
        }
        if (from.width != null) {
          this.options.setWidth(from.width);
        }
        if (from.height != null) {
          this.options.setHeight(from.height);
        }
        if (from.quality != null) {
          this.options.setQuality(from.quality);
        }
        if (from.responseFormat != null) {
          this.options.setResponseFormat(from.responseFormat);
        }
        if (from.size != null) {
          this.options.setSize(from.size);
        }
        if (from.style != null) {
          this.options.setStyle(from.style);
        }
        if (from.user != null) {
          this.options.setUser(from.user);
        }
      }
      return this;
    }

    n(n: number | null): this {
      this.options.setN(n);
      return this;
    }

    model(model: string): this {
      this.options.model = model;
      return this;
    }

    deploymentName(deploymentName: string): this {
      this.options.deploymentName = deploymentName;
      return this;
    }

    baseUrl(baseUrl: string): this {
      this.options.baseUrl = baseUrl;
      return this;
    }

    apiKey(apiKey: string): this {
      this.options.apiKey = apiKey;
      return this;
    }

    azureADTokenProvider(
      azureADTokenProvider: (() => Promise<string>) | null,
    ): this {
      this.options.azureADTokenProvider = azureADTokenProvider;
      return this;
    }

    azureOpenAIServiceVersion(azureOpenAIServiceVersion: unknown): this {
      this.options.microsoftFoundryServiceVersion = azureOpenAIServiceVersion;
      return this;
    }

    organizationId(organizationId: string): this {
      this.options.organizationId = organizationId;
      return this;
    }

    azure(azure: boolean): this {
      this.options.microsoftFoundry = azure;
      return this;
    }

    gitHubModels(gitHubModels: boolean): this {
      this.options.gitHubModels = gitHubModels;
      return this;
    }

    timeout(timeout: OpenAiSdkImageOptionsProps["timeout"]): this {
      this.options.timeout = timeout ?? null;
      return this;
    }

    maxRetries(maxRetries: number | null): this {
      this.options.maxRetries = maxRetries;
      return this;
    }

    fetchOptions(
      fetchOptions: OpenAiSdkImageOptionsProps["fetchOptions"],
    ): this {
      this.options.fetchOptions = fetchOptions;
      return this;
    }

    customHeaders(customHeaders: Record<string, string>): this {
      this.options.customHeaders = { ...customHeaders };
      return this;
    }

    responseFormat(
      responseFormat: NonNullable<
        ImageGenerateParamsNonStreaming["response_format"]
      >,
    ): this {
      this.options.setResponseFormat(responseFormat);
      return this;
    }

    width(width: number | null): this {
      this.options.setWidth(width);
      return this;
    }

    height(height: number | null): this {
      this.options.setHeight(height);
      return this;
    }

    user(user: string): this {
      this.options.setUser(user);
      return this;
    }

    style(style: string): this {
      this.options.setStyle(style);
      return this;
    }

    quality(quality: ImageGenerateParamsNonStreaming["quality"]): this {
      this.options.setQuality(quality);
      return this;
    }

    size(size: NonNullable<ImageGenerateParamsNonStreaming["size"]>): this {
      this.options.setSize(size);
      return this;
    }

    build(): OpenAiSdkImageOptions {
      return this.options;
    }
  }
}
