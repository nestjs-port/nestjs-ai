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
import { DefaultTextToSpeechOptions } from "../default-text-to-speech-options";

describe("DefaultTextToSpeechOptions", () => {
  it("test constructor with all fields", () => {
    const options = new DefaultTextToSpeechOptions({
      model: "test-model",
      voice: "test-voice",
      format: "test-format",
      speed: 0.8,
    });

    expect(options.model).toBe("test-model");
    expect(options.voice).toBe("test-voice");
    expect(options.format).toBe("test-format");
    expect(options.speed).toBeCloseTo(0.8, 4);
  });

  it("test copy", () => {
    const original = new DefaultTextToSpeechOptions({
      model: "test-model",
      voice: "test-voice",
      format: "test-format",
      speed: 0.8,
    });

    const copied = original.copy();
    expect(copied).not.toBe(original);
    expect(copied).toEqual(original);
  });

  it("test default values", () => {
    const options = new DefaultTextToSpeechOptions();

    expect(options.model).toBeNull();
    expect(options.voice).toBeNull();
    expect(options.format).toBeNull();
    expect(options.speed).toBeNull();
  });
});
