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
  AbstractOpenAiOptions,
  type AbstractOpenAiOptionsProps,
} from "./abstract-open-ai-options";

export interface OpenAiImageOptionsProps extends AbstractOpenAiOptionsProps {
  /**
   * The number of images to generate. Must be between 1 and 10. For dall-e-3, only n=1
   * is supported.
   */
  n?: number | null;
  /**
   * The width of the generated images. Must be one of 256, 512, or 1024 for dall-e-2.
   */
  width?: number | null;
  /**
   * The height of the generated images. Must be one of 256, 512, or 1024 for dall-e-2.
   */
  height?: number | null;
  /**
   * The quality of the image that will be generated. hd creates images with finer
   * details and greater consistency across the image. This param is only supported for
   * dall-e-3. standard or hd
   */
  quality?: ImageGenerateParamsNonStreaming["quality"] | null;
  /**
   * The format in which the generated images are returned. Must be one of url or
   * b64_json.
   */
  responseFormat?: NonNullable<
    ImageGenerateParamsNonStreaming["response_format"]
  > | null;
  /**
   * The size of the generated images. Must be one of 256x256, 512x512, or 1024x1024 for
   * dall-e-2. Must be one of 1024x1024, 1792x1024, or 1024x1792 for dall-e-3 models.
   */
  size?: NonNullable<ImageGenerateParamsNonStreaming["size"]> | null;
  /**
   * The style of the generated images. Must be one of vivid or natural. Vivid causes
   * the model to lean towards generating hyper-real and dramatic images. Natural causes
   * the model to produce more natural, less hyper-real looking images. This param is
   * only supported for dall-e-3. natural or vivid
   */
  style?: NonNullable<ImageGenerateParamsNonStreaming["style"]> | null;
  /**
   * A unique identifier representing your end-user, which can help OpenAI to monitor
   * and detect abuse.
   */
  user?: string | null;
}

/**
 * Configuration information for the Image Model implementation using the OpenAI Java SDK.
 */
export class OpenAiImageOptions
  extends AbstractOpenAiOptions
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

  constructor(props: OpenAiImageOptionsProps = {}) {
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

  static builder(): OpenAiImageOptions.Builder {
    return new OpenAiImageOptions.Builder();
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
            : OpenAiImageOptions.DEFAULT_IMAGE_MODEL,
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

export namespace OpenAiImageOptions {
  export class Builder {
    private readonly options = new OpenAiImageOptions();

    from(fromOptions: OpenAiImageOptions): this {
      this.options.setBaseUrl(fromOptions.baseUrl);
      this.options.setApiKey(fromOptions.apiKey);
      this.options.setAzureADTokenProvider(fromOptions.azureADTokenProvider);
      this.options.setModel(fromOptions.model);
      this.options.setDeploymentName(fromOptions.deploymentName);
      this.options.setMicrosoftFoundryServiceVersion(
        fromOptions.microsoftFoundryServiceVersion,
      );
      this.options.setOrganizationId(fromOptions.organizationId);
      this.options.setMicrosoftFoundry(fromOptions.microsoftFoundry);
      this.options.setGitHubModels(fromOptions.gitHubModels);
      this.options.setTimeout(fromOptions.timeout);
      this.options.setMaxRetries(fromOptions.maxRetries);
      this.options.setFetchOptions(fromOptions.fetchOptions);
      this.options.setCustomHeaders(fromOptions.customHeaders);
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
      if (from instanceof OpenAiImageOptions) {
        if (from.baseUrl != null) {
          this.options.setBaseUrl(from.baseUrl);
        }
        if (from.apiKey != null) {
          this.options.setApiKey(from.apiKey);
        }
        if (from.azureADTokenProvider != null) {
          this.options.setAzureADTokenProvider(from.azureADTokenProvider);
        }
        if (from.model != null) {
          this.options.setModel(from.model);
        }
        if (from.deploymentName != null) {
          this.options.setDeploymentName(from.deploymentName);
        }
        if (from.microsoftFoundryServiceVersion != null) {
          this.options.setMicrosoftFoundryServiceVersion(
            from.microsoftFoundryServiceVersion,
          );
        }
        if (from.organizationId != null) {
          this.options.setOrganizationId(from.organizationId);
        }
        this.options.setMicrosoftFoundry(from.microsoftFoundry);
        this.options.setGitHubModels(from.gitHubModels);
        if (from.timeout != null) {
          this.options.setTimeout(from.timeout);
        }
        if (from.maxRetries != null) {
          this.options.setMaxRetries(from.maxRetries);
        }
        if (from.fetchOptions != null) {
          this.options.setFetchOptions(from.fetchOptions);
        }
        this.options.setCustomHeaders(from.customHeaders);
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
      this.options.setModel(model);
      return this;
    }

    deploymentName(deploymentName: string): this {
      this.options.setDeploymentName(deploymentName);
      return this;
    }

    baseUrl(baseUrl: string): this {
      this.options.setBaseUrl(baseUrl);
      return this;
    }

    apiKey(apiKey: string): this {
      this.options.setApiKey(apiKey);
      return this;
    }

    azureADTokenProvider(
      azureADTokenProvider: (() => Promise<string>) | null,
    ): this {
      this.options.setAzureADTokenProvider(azureADTokenProvider);
      return this;
    }

    azureOpenAIServiceVersion(azureOpenAIServiceVersion: unknown): this {
      this.options.setMicrosoftFoundryServiceVersion(azureOpenAIServiceVersion);
      return this;
    }

    organizationId(organizationId: string): this {
      this.options.setOrganizationId(organizationId);
      return this;
    }

    azure(azure: boolean): this {
      this.options.setMicrosoftFoundry(azure);
      return this;
    }

    gitHubModels(gitHubModels: boolean): this {
      this.options.setGitHubModels(gitHubModels);
      return this;
    }

    timeout(timeout: OpenAiImageOptionsProps["timeout"]): this {
      this.options.setTimeout(timeout ?? null);
      return this;
    }

    maxRetries(maxRetries: number | null): this {
      this.options.setMaxRetries(maxRetries);
      return this;
    }

    fetchOptions(fetchOptions: OpenAiImageOptionsProps["fetchOptions"]): this {
      this.options.setFetchOptions(fetchOptions);
      return this;
    }

    customHeaders(customHeaders: Record<string, string>): this {
      this.options.setCustomHeaders({ ...customHeaders });
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

    build(): OpenAiImageOptions {
      return this.options;
    }
  }
}
