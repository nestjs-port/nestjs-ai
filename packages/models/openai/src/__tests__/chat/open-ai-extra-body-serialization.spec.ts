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

import { assert, describe, expect, it } from "vitest";

import { OpenAiChatOptions } from "../../open-ai-chat-options.js";

describe("OpenAiExtraBodySerialization", () => {
  it("test merge with extra body", () => {
    // Arrange: Create options with extraBody
    const defaultOptions = OpenAiChatOptions.builder()
      .model("test-model")
      .extraBody({ enable_thinking: true, max_depth: 10 })
      .build();

    const runtimeOptions = OpenAiChatOptions.builder()
      .temperature(0.9)
      .extraBody({ enable_thinking: false, top_k: 50 })
      .build();

    // Act: Merge options using the builder's combineWith method, which is the actual
    // mechanism used by OpenAiChatModel
    const merged = defaultOptions
      .mutate()
      .combineWith(runtimeOptions.mutate())
      .build();

    // Assert: Verify extraBody was successfully merged
    const mergedExtraBody = merged.extraBody;
    assert.exists(mergedExtraBody);
    // runtime option overrides default option for same key
    expect(mergedExtraBody.enable_thinking).toBe(false);
    expect(mergedExtraBody.max_depth).toBe(10);
    expect(mergedExtraBody.top_k).toBe(50);
    expect(merged.model).toBe("test-model");
    expect(merged.temperature).toBe(0.9);
  });
});
