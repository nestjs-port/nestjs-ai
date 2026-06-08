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

import { OpenAiEmbeddingOptions } from "../../open-ai-embedding-options.js";

describe("OpenAiEmbeddingOptions", () => {
  it("keeps encoding format unset by default", () => {
    const options = OpenAiEmbeddingOptions.builder()
      .model("test-model")
      .build();

    const params = options.toOpenAiCreateParams(["test input"]);

    expect(options.encodingFormat).toBeNull();
    expect(params.encoding_format).toBeUndefined();
  });

  it("allows configuring the encoding format", () => {
    const options = OpenAiEmbeddingOptions.builder()
      .model("test-model")
      .encodingFormat("base64")
      .build();

    const params = options.toOpenAiCreateParams(["test input"]);

    expect(params.encoding_format).toBe("base64");
  });

  it("copies and merges encoding format", () => {
    const source = OpenAiEmbeddingOptions.builder()
      .model("test-model")
      .encodingFormat("base64")
      .build();

    const copied = OpenAiEmbeddingOptions.builder().from(source).build();
    const merged = OpenAiEmbeddingOptions.builder()
      .model("other-model")
      .merge(source)
      .build();

    expect(copied.encodingFormat).toBe("base64");
    expect(merged.encodingFormat).toBe("base64");
  });
});
