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
import { ImageOptionsBuilder } from "../image-options-builder.js";

describe("ImageOptionsBuilder", () => {
  it("builder should support props initialization", () => {
    const options = ImageOptionsBuilder.builder({
      n: 2,
      model: "dall-e-3",
      width: 1024,
      height: 1024,
      responseFormat: "url",
      style: "vivid",
    }).build();

    expect(options.n).toBe(2);
    expect(options.model).toBe("dall-e-3");
    expect(options.width).toBe(1024);
    expect(options.height).toBe(1024);
    expect(options.responseFormat).toBe("url");
    expect(options.style).toBe("vivid");
  });

  it("from should build options in one shot", () => {
    const options = ImageOptionsBuilder.from({
      n: 1,
      model: "gpt-image-1",
      style: null,
    });

    expect(options.n).toBe(1);
    expect(options.model).toBe("gpt-image-1");
    expect(options.style).toBeNull();
  });
});
