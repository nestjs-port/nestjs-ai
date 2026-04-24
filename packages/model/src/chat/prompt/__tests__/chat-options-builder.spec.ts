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

import { beforeEach, describe, expect, it } from "vitest";
import { ChatOptions } from "../chat-options.interface.js";
import type { DefaultChatOptions } from "../default-chat-options.js";

describe("ChatOptionsBuilder", () => {
  let builder: ChatOptions.Builder;

  beforeEach(() => {
    builder = ChatOptions.builder();
  });

  it("should build with all options", () => {
    const options = builder
      .model("gpt-4")
      .maxTokens(100)
      .temperature(0.7)
      .topP(1.0)
      .topK(40)
      .stopSequences(["stop1", "stop2"])
      .build();

    expect(options.model).toBe("gpt-4");
    expect(options.maxTokens).toBe(100);
    expect(options.temperature).toBe(0.7);
    expect(options.topP).toBe(1.0);
    expect(options.topK).toBe(40);
    expect(options.stopSequences).toEqual(["stop1", "stop2"]);
  });

  it("should build with minimal options", () => {
    const options = builder.model("gpt-4").build();

    expect(options.model).toBe("gpt-4");
    expect(options.maxTokens).toBeNull();
    expect(options.temperature).toBeNull();
    expect(options.topP).toBeNull();
    expect(options.topK).toBeNull();
    expect(options.stopSequences).toBeNull();
  });

  it("should copy options", () => {
    const original = builder
      .model("gpt-4")
      .maxTokens(100)
      .temperature(0.7)
      .topP(1.0)
      .topK(40)
      .stopSequences(["stop1", "stop2"])
      .build() as DefaultChatOptions;

    const copy = original.copy();

    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    expect(copy.stopSequences).not.toBe(original.stopSequences);
  });

  it("should upcast to chat options", () => {
    const chatOptions: ChatOptions = builder
      .model("gpt-4")
      .maxTokens(100)
      .temperature(0.7)
      .topP(1.0)
      .topK(40)
      .stopSequences(["stop1", "stop2"])
      .build();

    expect(chatOptions.model).toBe("gpt-4");
    expect(chatOptions.maxTokens).toBe(100);
    expect(chatOptions.temperature).toBe(0.7);
    expect(chatOptions.topP).toBe(1.0);
    expect(chatOptions.topK).toBe(40);
    expect(chatOptions.stopSequences).toEqual(["stop1", "stop2"]);
  });

  it("should allow builder reuse", () => {
    const options1 = builder.model("model1").temperature(0.7).build();
    const options2 = builder.model("model2").build();

    expect(options1.model).toBe("model1");
    expect(options1.temperature).toBe(0.7);
    expect(options2.model).toBe("model2");
    expect(options2.temperature).toBe(0.7);
  });

  it("should return same builder instance on each method", () => {
    const returnedBuilder = builder.model("test");

    expect(returnedBuilder).toBe(builder);
  });

  it("should have expected default values", () => {
    const options = builder.build();

    expect(options.model).toBeNull();
    expect(options.temperature).toBeNull();
    expect(options.maxTokens).toBeNull();
    expect(options.topP).toBeNull();
    expect(options.topK).toBeNull();
    expect(options.frequencyPenalty).toBeNull();
    expect(options.presencePenalty).toBeNull();
    expect(options.stopSequences).toBeNull();
  });

  it("should be immutable after build", () => {
    const options = builder.stopSequences(["stop1", "stop2"]).build();

    expect(() => {
      options.stopSequences?.push("stop3");
    }).toThrow(TypeError);
  });

  it("should handle null stop sequences", () => {
    const options = builder.model("test-model").stopSequences(null).build();

    expect(options.stopSequences).toBeNull();
  });

  it("should handle empty stop sequences", () => {
    const options = builder.model("test-model").stopSequences([]).build();

    expect(options.stopSequences).toEqual([]);
  });

  it("should handle frequency and presence penalties", () => {
    const options = builder
      .model("test-model")
      .frequencyPenalty(0.5)
      .presencePenalty(0.3)
      .build();

    expect(options.frequencyPenalty).toBe(0.5);
    expect(options.presencePenalty).toBe(0.3);
  });

  it("should maintain stop sequences order", () => {
    const orderedSequences = ["first", "second", "third", "fourth"];

    const options = builder
      .model("test-model")
      .stopSequences(orderedSequences)
      .build();

    expect(options.stopSequences).toEqual(orderedSequences);
  });

  it("should create independent copies", () => {
    const original = builder
      .model("test-model")
      .stopSequences(["stop1"])
      .build() as DefaultChatOptions;

    const copy1 = original.copy();
    const copy2 = original.copy();

    expect(copy1).not.toBe(copy2);
    expect(copy1.stopSequences).not.toBe(copy2.stopSequences);
    expect(copy1).toEqual(copy2);
  });

  it("should handle special string values", () => {
    const options = builder
      .model("")
      .stopSequences(["", "  ", "\n", "\t"])
      .build();

    expect(options.model).toBe("");
    expect(options.stopSequences).toEqual(["", "  ", "\n", "\t"]);
  });

  it("should preserve copy integrity", () => {
    const mutableList = ["original"];
    const original = builder
      .model("test-model")
      .stopSequences(mutableList)
      .build() as DefaultChatOptions;

    mutableList.push("modified");

    const copy = original.copy();

    expect(original.stopSequences).toEqual(["original"]);
    expect(copy.stopSequences).toEqual(["original"]);
  });
});
