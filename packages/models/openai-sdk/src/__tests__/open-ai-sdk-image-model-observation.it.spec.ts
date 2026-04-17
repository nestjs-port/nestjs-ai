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

import {
  AiObservationAttributes,
  AiOperationType,
  AiProvider,
} from "@nestjs-ai/commons";
import {
  DefaultImageModelObservationConvention,
  ImagePrompt,
} from "@nestjs-ai/model";
import { TestObservationRegistry } from "@nestjs-ai/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { OpenAiSdkImageModel } from "../open-ai-sdk-image-model";
import { OpenAiSdkImageOptions } from "../open-ai-sdk-image-options";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)("OpenAiSdkImageModelObservationIT", () => {
  let observationRegistry: TestObservationRegistry;
  let imageModel: OpenAiSdkImageModel;

  beforeEach(() => {
    observationRegistry = TestObservationRegistry.create();
    imageModel = new OpenAiSdkImageModel({
      options: new OpenAiSdkImageOptions({
        apiKey: OPENAI_API_KEY,
        model: OpenAiSdkImageOptions.DEFAULT_IMAGE_MODEL,
      }),
      observationRegistry,
    });

    observationRegistry.clear();
  });

  it("observation for image operation", async () => {
    const options = OpenAiSdkImageOptions.builder()
      .model(OpenAiSdkImageOptions.DEFAULT_IMAGE_MODEL)
      .height(1024)
      .width(1024)
      .responseFormat("url")
      .style("natural")
      .build();

    const instructions = `
				A cup of coffee at a restaurant table in Paris, France.
				`;

    const imagePrompt = new ImagePrompt(instructions, options);

    const imageResponse = await imageModel.call(imagePrompt);
    expect(imageResponse.results).toHaveLength(1);

    await new Promise<void>((resolve) => setTimeout(resolve, 200)); // Wait for observation to be recorded

    expect(observationRegistry.currentObservation).toBeNull();

    const observation = observationRegistry.contexts.find(
      (entry) =>
        entry.context.name ===
        DefaultImageModelObservationConvention.DEFAULT_NAME,
    );
    expect(observation).toBeDefined();
    if (observation == null) {
      throw new Error("Expected observation context to be present");
    }

    const context = observation.context;
    const low = context.lowCardinalityKeyValues;
    const high = context.highCardinalityKeyValues;

    expect(low.get(AiObservationAttributes.AI_OPERATION_TYPE.value)).toBe(
      AiOperationType.IMAGE.value,
    );
    expect(low.get(AiObservationAttributes.AI_PROVIDER.value)).toBe(
      AiProvider.OPENAI_SDK.value,
    );
    expect(low.get(AiObservationAttributes.REQUEST_MODEL.value)).toBe(
      OpenAiSdkImageOptions.DEFAULT_IMAGE_MODEL,
    );
    expect(high.get(AiObservationAttributes.REQUEST_IMAGE_SIZE.value)).toBe(
      "1024x1024",
    );
    expect(
      high.get(AiObservationAttributes.REQUEST_IMAGE_RESPONSE_FORMAT.value),
    ).toBe("url");

    expect(observation.isObservationStarted).toBe(true);
    expect(observation.isObservationStopped).toBe(true);
  });
});
