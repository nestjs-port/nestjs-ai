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

import { AiObservationAttributes } from "@nestjs-ai/commons";
import { KeyValue, ObservationContext } from "@nestjs-port/core";
import { describe, expect, it } from "vitest";
import { ImageOptionsBuilder, ImagePrompt } from "../../index.js";
import { DefaultImageModelObservationConvention } from "../default-image-model-observation-convention.js";
import { ImageModelObservationContext } from "../image-model-observation-context.js";

describe("DefaultImageModelObservationConvention", () => {
  const observationConvention = new DefaultImageModelObservationConvention();

  it("should have name", () => {
    expect(observationConvention.getName()).toBe(
      DefaultImageModelObservationConvention.DEFAULT_NAME,
    );
  });

  it("contextual name when model is defined", () => {
    const observationContext = new ImageModelObservationContext(
      generateImagePrompt(
        ImageOptionsBuilder.builder().model("mistral").build(),
      ),
      "superprovider",
    );

    expect(observationConvention.getContextualName(observationContext)).toBe(
      "image mistral",
    );
  });

  it("contextual name when model is not defined", () => {
    const observationContext = new ImageModelObservationContext(
      generateImagePrompt(ImageOptionsBuilder.builder().build()),
      "superprovider",
    );

    expect(observationConvention.getContextualName(observationContext)).toBe(
      "image",
    );
  });

  it("supports only image model observation context", () => {
    const observationContext = new ImageModelObservationContext(
      generateImagePrompt(
        ImageOptionsBuilder.builder().model("mistral").build(),
      ),
      "superprovider",
    );

    expect(observationConvention.supportsContext(observationContext)).toBe(
      true,
    );
    expect(
      observationConvention.supportsContext(new ObservationContext()),
    ).toBe(false);
  });

  it("should have low cardinality key values when defined", () => {
    const observationContext = new ImageModelObservationContext(
      generateImagePrompt(
        ImageOptionsBuilder.builder().model("mistral").build(),
      ),
      "superprovider",
    );

    const keyValues = observationConvention
      .getLowCardinalityKeyValues(observationContext)
      .toArray();

    expect(keyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.AI_OPERATION_TYPE.value, "image"),
    );
    expect(keyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.AI_PROVIDER.value, "superprovider"),
    );
    expect(keyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.REQUEST_MODEL.value, "mistral"),
    );
  });

  it("should have high cardinality key values when defined", () => {
    const imageOptions = ImageOptionsBuilder.builder()
      .model("mistral")
      .N(1)
      .height(1080)
      .width(1920)
      .style("sketch")
      .responseFormat("base64")
      .build();
    const observationContext = new ImageModelObservationContext(
      generateImagePrompt(imageOptions),
      "superprovider",
    );

    const keyValues = observationConvention
      .getHighCardinalityKeyValues(observationContext)
      .toArray();

    expect(keyValues).toContainEqual(
      KeyValue.of(
        AiObservationAttributes.REQUEST_IMAGE_RESPONSE_FORMAT.value,
        "base64",
      ),
    );
    expect(keyValues).toContainEqual(
      KeyValue.of(
        AiObservationAttributes.REQUEST_IMAGE_SIZE.value,
        "1920x1080",
      ),
    );
    expect(keyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.REQUEST_IMAGE_STYLE.value, "sketch"),
    );
  });

  it("should not have key values when empty values", () => {
    const observationContext = new ImageModelObservationContext(
      generateImagePrompt(ImageOptionsBuilder.builder().build()),
      "superprovider",
    );

    expect(
      observationConvention.getLowCardinalityKeyValues(observationContext),
    ).toContainEqual(
      KeyValue.of(
        AiObservationAttributes.REQUEST_MODEL.value,
        KeyValue.NONE_VALUE,
      ),
    );
    expect(
      observationConvention
        .getHighCardinalityKeyValues(observationContext)
        .toArray()
        .map((keyValue) => keyValue.key),
    ).not.toContain(
      AiObservationAttributes.REQUEST_IMAGE_RESPONSE_FORMAT.value,
    );
    expect(
      observationConvention
        .getHighCardinalityKeyValues(observationContext)
        .toArray()
        .map((keyValue) => keyValue.key),
    ).not.toContain(AiObservationAttributes.REQUEST_IMAGE_SIZE.value);
    expect(
      observationConvention
        .getHighCardinalityKeyValues(observationContext)
        .toArray()
        .map((keyValue) => keyValue.key),
    ).not.toContain(AiObservationAttributes.REQUEST_IMAGE_STYLE.value);
  });

  it("should handle null model", () => {
    const observationContext = new ImageModelObservationContext(
      new ImagePrompt("test prompt"),
      "test-provider",
    );

    expect(observationConvention.getContextualName(observationContext)).toBe(
      "image",
    );
    expect(
      observationConvention.getLowCardinalityKeyValues(observationContext),
    ).toContainEqual(
      KeyValue.of(
        AiObservationAttributes.REQUEST_MODEL.value,
        KeyValue.NONE_VALUE,
      ),
    );
  });

  it("should handle empty model", () => {
    const observationContext = new ImageModelObservationContext(
      generateImagePrompt(ImageOptionsBuilder.builder().model("").build()),
      "test-provider",
    );

    expect(observationConvention.getContextualName(observationContext)).toBe(
      "image",
    );
  });

  it("should handle blank model", () => {
    const observationContext = new ImageModelObservationContext(
      generateImagePrompt(ImageOptionsBuilder.builder().model("   ").build()),
      "test-provider",
    );

    expect(observationConvention.getContextualName(observationContext)).toBe(
      "image",
    );
  });

  it("should handle empty style", () => {
    const imageOptions = ImageOptionsBuilder.builder()
      .model("test-model")
      .style("")
      .build();

    const observationContext = new ImageModelObservationContext(
      generateImagePrompt(imageOptions),
      "test-provider",
    );

    expect(
      observationConvention
        .getHighCardinalityKeyValues(observationContext)
        .toArray()
        .map((keyValue) => keyValue.key),
    ).not.toContain(AiObservationAttributes.REQUEST_IMAGE_STYLE.value);
  });

  it("should handle empty response format", () => {
    const imageOptions = ImageOptionsBuilder.builder()
      .model("test-model")
      .responseFormat("")
      .build();

    const observationContext = new ImageModelObservationContext(
      generateImagePrompt(imageOptions),
      "test-provider",
    );

    expect(
      observationConvention
        .getHighCardinalityKeyValues(observationContext)
        .toArray()
        .map((keyValue) => keyValue.key),
    ).not.toContain(
      AiObservationAttributes.REQUEST_IMAGE_RESPONSE_FORMAT.value,
    );
  });

  it("should handle image prompt with default options", () => {
    const observationContext = new ImageModelObservationContext(
      new ImagePrompt("simple prompt"),
      "simple-provider",
    );

    expect(observationConvention.getContextualName(observationContext)).toBe(
      "image",
    );
    expect(
      observationConvention.getLowCardinalityKeyValues(observationContext),
    ).toContainEqual(
      KeyValue.of(
        AiObservationAttributes.REQUEST_MODEL.value,
        KeyValue.NONE_VALUE,
      ),
    );
    expect(
      observationConvention.getHighCardinalityKeyValues(observationContext),
    ).toBeDefined();
  });
});

function generateImagePrompt(imageOptions: unknown): ImagePrompt {
  return new ImagePrompt("here comes the sun", imageOptions as never);
}
