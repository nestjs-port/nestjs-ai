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

import "reflect-metadata";

import { Test } from "@nestjs/testing";
import { IMAGE_MODEL_TOKEN } from "@nestjs-ai/commons";
import { ImagePrompt } from "@nestjs-ai/model";
import {
  OPEN_AI_IMAGE_DEFAULT_MODEL,
  type OpenAiImageModel,
  OpenAiImageModelModule,
  type OpenAiImageProperties,
} from "@nestjs-ai/model-openai";
import { LoggerFactory } from "@nestjs-port/core";
import { describe, expect, it } from "vitest";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const logger = LoggerFactory.getLogger("OpenAiImageModelModuleIT");

async function createImageModel(
  properties: OpenAiImageProperties,
): Promise<OpenAiImageModel> {
  const moduleRef = await Test.createTestingModule({
    imports: [OpenAiImageModelModule.forFeature(properties)],
  }).compile();

  return moduleRef.get<OpenAiImageModel>(IMAGE_MODEL_TOKEN);
}

describe.skipIf(!OPENAI_API_KEY)("OpenAiImageModelModuleIT", () => {
  it("generate image", async () => {
    const imageModel = await createImageModel({
      apiKey: OPENAI_API_KEY ?? "",
      options: {
        size: "1024x1024",
      },
    });

    const imageResponse = await imageModel.call(new ImagePrompt("forest"));

    expect(imageResponse.results).toHaveLength(1);
    expect(imageResponse.result?.output.url).toBeTruthy();
    logger.info(`Generated image: ${imageResponse.result?.output.url}`);
  });

  it("generate image with model", async () => {
    // The 256x256 size is supported by dall-e-2, but not by dall-e-3.
    const imageModel = await createImageModel({
      apiKey: OPENAI_API_KEY ?? "",
      options: {
        model: "dall-e-2",
        size: "256x256",
      },
    });

    const imageResponse = await imageModel.call(new ImagePrompt("forest"));

    expect(imageResponse.results).toHaveLength(1);
    expect(imageResponse.result?.output.url).toBeTruthy();
    logger.info(`Generated image: ${imageResponse.result?.output.url}`);
  });

  it("image activation", async () => {
    const defaultImageModel = await createImageModel({
      apiKey: "API_KEY",
      baseUrl: "http://TEST.BASE.URL",
    });

    expect(defaultImageModel.options.apiKey).toBe("API_KEY");
    expect(defaultImageModel.options.baseUrl).toBe("http://TEST.BASE.URL");
    expect(defaultImageModel.options.model).toBe(OPEN_AI_IMAGE_DEFAULT_MODEL);

    const explicitImageModel = await createImageModel({
      apiKey: "API_KEY",
      baseUrl: "http://TEST.BASE.URL",
      model: "openai-sdk",
    });

    expect(explicitImageModel.options.model).toBe("openai-sdk");
  });

  it("image options test", async () => {
    const imageModel = await createImageModel({
      apiKey: "API_KEY",
      baseUrl: "http://TEST.BASE.URL",
      options: {
        n: 3,
        model: "MODEL_XYZ",
        quality: "hd",
        responseFormat: "url",
        size: "1024x1024",
        width: 1024,
        height: 1024,
        style: "vivid",
        user: "userXYZ",
      },
    });

    const imageOptions = imageModel.options;

    expect(imageOptions.baseUrl).toBe("http://TEST.BASE.URL");
    expect(imageOptions.apiKey).toBe("API_KEY");
    expect(imageOptions.n).toBe(3);
    expect(imageOptions.model).toBe("MODEL_XYZ");
    expect(imageOptions.quality).toBe("hd");
    expect(imageOptions.responseFormat).toBe("url");
    expect(imageOptions.size).toBe("1024x1024");
    expect(imageOptions.width).toBe(1024);
    expect(imageOptions.height).toBe(1024);
    expect(imageOptions.style).toBe("vivid");
    expect(imageOptions.user).toBe("userXYZ");
  });
});
