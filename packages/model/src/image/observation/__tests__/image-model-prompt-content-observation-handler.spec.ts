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

import { LoggerFactory, ObservationContext } from "@nestjs-ai/commons";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageMessage, ImageOptionsBuilder, ImagePrompt } from "../../";
import { ImageModelObservationContext } from "../image-model-observation-context";
import { ImageModelPromptContentObservationHandler } from "../image-model-prompt-content-observation-handler";

describe("ImageModelPromptContentObservationHandler", () => {
  let infoMock: (message: string, ...args: unknown[]) => void;

  beforeEach(() => {
    infoMock = vi.fn<(message: string, ...args: unknown[]) => void>();
    vi.spyOn(LoggerFactory, "getLogger").mockReturnValue({
      name: "ImageModelPromptContentObservationHandler",
      info: infoMock,
      warn: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      error: vi.fn(),
      isDebugEnabled: () => false,
      isTraceEnabled: () => false,
      isInfoEnabled: () => true,
      isWarnEnabled: () => true,
      isErrorEnabled: () => true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("when not supported observation context then return false", () => {
    const observationHandler = new ImageModelPromptContentObservationHandler();
    const context = new ObservationContext();

    expect(observationHandler.supportsContext(context)).toBe(false);
  });

  it("when supported observation context then return true", () => {
    const observationHandler = new ImageModelPromptContentObservationHandler();
    const context = createContext();

    expect(observationHandler.supportsContext(context)).toBe(true);
  });

  it("when empty prompt then output nothing", () => {
    const observationHandler = new ImageModelPromptContentObservationHandler();
    const context = createContext(
      new ImagePrompt(
        "",
        ImageOptionsBuilder.builder().model("mistral").build(),
      ),
    );

    observationHandler.onStop(context);

    expect(infoMock).toHaveBeenCalledWith('Image Model Prompt Content:\n[""]');
  });

  it("when prompt with text then output it", () => {
    const observationHandler = new ImageModelPromptContentObservationHandler();
    const context = createContext(
      new ImagePrompt(
        "supercalifragilisticexpialidocious",
        ImageOptionsBuilder.builder().model("mistral").build(),
      ),
    );

    observationHandler.onStop(context);

    expect(infoMock).toHaveBeenCalledWith(
      'Image Model Prompt Content:\n["supercalifragilisticexpialidocious"]',
    );
  });

  it("when prompt with messages then output it", () => {
    const observationHandler = new ImageModelPromptContentObservationHandler();
    const context = createContext(
      new ImagePrompt(
        [
          new ImageMessage("you're a chimney sweep"),
          new ImageMessage("supercalifragilisticexpialidocious"),
        ],
        ImageOptionsBuilder.builder().model("mistral").build(),
      ),
    );

    observationHandler.onStop(context);

    expect(infoMock).toHaveBeenCalledWith(
      `Image Model Prompt Content:\n["you're a chimney sweep", "supercalifragilisticexpialidocious"]`,
    );
  });
});

function createContext(
  imagePrompt: ImagePrompt = new ImagePrompt(
    "supercalifragilisticexpialidocious",
    ImageOptionsBuilder.builder().model("mistral").build(),
  ),
): ImageModelObservationContext {
  return new ImageModelObservationContext(imagePrompt, "superprovider");
}
