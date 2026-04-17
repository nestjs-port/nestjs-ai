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

import { describe, expect, it } from "vitest";
import { ImageOptionsBuilder, ImagePrompt } from "../../";
import { ImageModelObservationContext } from "../image-model-observation-context";

describe("ImageModelObservationContext", () => {
  it("when mandatory request options then return", () => {
    const observationContext = new ImageModelObservationContext(
      generateImagePrompt(
        ImageOptionsBuilder.builder().model("supersun").build(),
      ),
      "superprovider",
    );

    expect(observationContext).toBeDefined();
  });

  it("should build context with image options", () => {
    const imageOptions = ImageOptionsBuilder.builder()
      .model("test-model")
      .build();
    const imagePrompt = new ImagePrompt("test prompt", imageOptions);

    const observationContext = new ImageModelObservationContext(
      imagePrompt,
      "test-provider",
    );

    expect(observationContext).toBeDefined();
  });

  it("should throw exception when image prompt is null", () => {
    expect(
      () =>
        new ImageModelObservationContext(
          null as unknown as ImagePrompt,
          "test-provider",
        ),
    ).toThrow("request cannot be null");
  });

  it("should throw exception when provider is null", () => {
    const imagePrompt = new ImagePrompt("test prompt");

    expect(
      () =>
        new ImageModelObservationContext(
          imagePrompt,
          null as unknown as string,
        ),
    ).toThrow("provider cannot be null or empty");
  });

  it("should throw exception when provider is empty", () => {
    const imagePrompt = new ImagePrompt("test prompt");

    expect(() => new ImageModelObservationContext(imagePrompt, "")).toThrow(
      "provider cannot be null or empty",
    );
  });

  it("should throw exception when provider is blank", () => {
    const imagePrompt = new ImagePrompt("test prompt");

    expect(() => new ImageModelObservationContext(imagePrompt, "   ")).toThrow(
      "provider cannot be null or empty",
    );
  });

  it("should build multiple contexts independently", () => {
    const imagePrompt1 = new ImagePrompt("first prompt");
    const imagePrompt2 = new ImagePrompt("second prompt");

    const context1 = new ImageModelObservationContext(
      imagePrompt1,
      "provider-alpha",
    );
    const context2 = new ImageModelObservationContext(
      imagePrompt2,
      "provider-beta",
    );

    expect(context1).toBeDefined();
    expect(context2).toBeDefined();
    expect(context1).not.toBe(context2);
  });
});

function generateImagePrompt(imageOptions: unknown): ImagePrompt {
  return new ImagePrompt("here comes the sun", imageOptions as never);
}
