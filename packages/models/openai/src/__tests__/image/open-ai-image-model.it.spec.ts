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

import { ImagePrompt } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import { OpenAiImageGenerationMetadata } from "../../metadata/index.js";
import { OpenAiImageModel } from "../../open-ai-image-model.js";
import { OpenAiImageOptions } from "../../open-ai-image-options.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)("OpenAiImageModelIT", () => {
  const imageModel = new OpenAiImageModel({
    options: new OpenAiImageOptions({
      apiKey: OPENAI_API_KEY ?? "",
    }),
  });

  it("image as url test", async () => {
    const options = OpenAiImageOptions.builder()
      .height(1024)
      .width(1024)
      .build();

    const instructions = `
				A cup of coffee at a restaurant table in Paris, France.
				`;

    const imagePrompt = new ImagePrompt(instructions, options);

    const imageResponse = await imageModel.call(imagePrompt);

    expect(imageResponse.results).toHaveLength(1);

    const imageResponseMetadata = imageResponse.metadata;
    expect(imageResponseMetadata.created).toBeGreaterThan(0);

    const generation = imageResponse.result;
    expect(generation).not.toBeNull();
    if (generation == null) {
      throw new Error("Expected image generation to be present");
    }

    const image = generation.output;
    expect(image.url).toBeTruthy();
    expect(image.b64Json).toBeNull();

    const imageGenerationMetadata = generation.metadata;
    expect(imageGenerationMetadata).toBeInstanceOf(
      OpenAiImageGenerationMetadata,
    );

    const openAiImageGenerationMetadata =
      imageGenerationMetadata as OpenAiImageGenerationMetadata;

    expect(openAiImageGenerationMetadata).not.toBeNull();
    expect(openAiImageGenerationMetadata.revisedPrompt?.trim()).toBeTruthy();
  });
});
