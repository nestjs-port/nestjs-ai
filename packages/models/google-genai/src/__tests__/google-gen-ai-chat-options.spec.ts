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
import { GoogleGenAiThinkingLevel } from "../common";
import { GoogleGenAiChatOptions } from "../google-gen-ai-chat-options";

describe("GoogleGenAiChatOptions", () => {
  it("should get and set thinkingBudget", () => {
    const options = new GoogleGenAiChatOptions();

    expect(options.thinkingBudget).toBeUndefined();

    options.thinkingBudget = 12853;
    expect(options.thinkingBudget).toBe(12853);

    options.thinkingBudget = undefined;
    expect(options.thinkingBudget).toBeUndefined();
  });

  it("should construct with thinkingBudget", () => {
    const options = GoogleGenAiChatOptions.builder()
      .model("test-model")
      .thinkingBudget(15000)
      .build();

    expect(options.model).toBe("test-model");
    expect(options.thinkingBudget).toBe(15000);
  });

  it("should create fromOptions with thinkingBudget", () => {
    const original = GoogleGenAiChatOptions.builder()
      .model("test-model")
      .temperature(0.8)
      .thinkingBudget(20000)
      .build();

    const copy = GoogleGenAiChatOptions.fromOptions(original);

    expect(copy.model).toBe("test-model");
    expect(copy.temperature).toBe(0.8);
    expect(copy.thinkingBudget).toBe(20000);
    expect(copy).not.toBe(original);
  });

  it("should copy thinkingBudget values", () => {
    const original = GoogleGenAiChatOptions.builder()
      .model("test-model")
      .thinkingBudget(30000)
      .build();

    const copy = original.copy();

    expect(copy.model).toBe("test-model");
    expect(copy.thinkingBudget).toBe(30000);
    expect(copy).not.toBe(original);
  });

  it("should compare equal for identical thinkingBudget values", () => {
    const options1 = GoogleGenAiChatOptions.builder()
      .model("test-model")
      .thinkingBudget(12853)
      .build();
    const options2 = GoogleGenAiChatOptions.builder()
      .model("test-model")
      .thinkingBudget(12853)
      .build();
    const options3 = GoogleGenAiChatOptions.builder()
      .model("test-model")
      .thinkingBudget(25000)
      .build();

    expect(options1).toEqual(options2);
    expect(options1).not.toEqual(options3);
  });

  it("should preserve labels and accept an empty labels map", () => {
    const options = GoogleGenAiChatOptions.builder().labels({}).build();

    expect(options.labels).toEqual({});
  });

  it("should get and set includeServerSideToolInvocations", () => {
    const options = new GoogleGenAiChatOptions();

    expect(options.includeServerSideToolInvocations).toBe(false);

    options.includeServerSideToolInvocations = true;
    expect(options.includeServerSideToolInvocations).toBe(true);

    options.includeServerSideToolInvocations = false;
    expect(options.includeServerSideToolInvocations).toBe(false);
  });

  it("should construct with includeServerSideToolInvocations", () => {
    const options = GoogleGenAiChatOptions.builder()
      .model("test-model")
      .includeServerSideToolInvocations(true)
      .build();

    expect(options.model).toBe("test-model");
    expect(options.includeServerSideToolInvocations).toBe(true);
  });

  it("should create fromOptions with includeServerSideToolInvocations", () => {
    const original = GoogleGenAiChatOptions.builder()
      .model("test-model")
      .includeServerSideToolInvocations(true)
      .build();

    const copy = GoogleGenAiChatOptions.fromOptions(original);

    expect(copy.includeServerSideToolInvocations).toBe(true);
    expect(copy).not.toBe(original);
  });

  it("should copy includeServerSideToolInvocations values", () => {
    const original = GoogleGenAiChatOptions.builder()
      .model("test-model")
      .includeServerSideToolInvocations(true)
      .build();

    const copy = original.copy();

    expect(copy.includeServerSideToolInvocations).toBe(true);
    expect(copy).not.toBe(original);
  });

  it("should compare equal for identical includeServerSideToolInvocations values", () => {
    const options1 = GoogleGenAiChatOptions.builder()
      .model("test-model")
      .includeServerSideToolInvocations(true)
      .build();
    const options2 = GoogleGenAiChatOptions.builder()
      .model("test-model")
      .includeServerSideToolInvocations(true)
      .build();
    const options3 = GoogleGenAiChatOptions.builder()
      .model("test-model")
      .includeServerSideToolInvocations(false)
      .build();

    expect(options1).toEqual(options2);
    expect(options1).not.toEqual(options3);
  });

  it("should get and set thinkingLevel", () => {
    const options = new GoogleGenAiChatOptions();

    expect(options.thinkingLevel).toBeUndefined();

    options.thinkingLevel = GoogleGenAiThinkingLevel.HIGH;
    expect(options.thinkingLevel).toBe(GoogleGenAiThinkingLevel.HIGH);

    options.thinkingLevel = GoogleGenAiThinkingLevel.LOW;
    expect(options.thinkingLevel).toBe(GoogleGenAiThinkingLevel.LOW);

    options.thinkingLevel = undefined;
    expect(options.thinkingLevel).toBeUndefined();
  });

  it("should construct with thinkingLevel", () => {
    const options = GoogleGenAiChatOptions.builder()
      .model("test-model")
      .thinkingLevel(GoogleGenAiThinkingLevel.HIGH)
      .build();

    expect(options.model).toBe("test-model");
    expect(options.thinkingLevel).toBe(GoogleGenAiThinkingLevel.HIGH);
  });

  it("should create fromOptions with thinkingLevel", () => {
    const original = GoogleGenAiChatOptions.builder()
      .model("test-model")
      .thinkingLevel(GoogleGenAiThinkingLevel.LOW)
      .build();

    const copy = GoogleGenAiChatOptions.fromOptions(original);

    expect(copy.thinkingLevel).toBe(GoogleGenAiThinkingLevel.LOW);
    expect(copy).not.toBe(original);
  });

  it("should copy thinkingLevel values", () => {
    const original = GoogleGenAiChatOptions.builder()
      .model("test-model")
      .thinkingLevel(GoogleGenAiThinkingLevel.HIGH)
      .build();

    const copy = original.copy();

    expect(copy.thinkingLevel).toBe(GoogleGenAiThinkingLevel.HIGH);
    expect(copy).not.toBe(original);
  });

  it("should compare equal for identical thinkingLevel values", () => {
    const options1 = GoogleGenAiChatOptions.builder()
      .model("test-model")
      .thinkingLevel(GoogleGenAiThinkingLevel.HIGH)
      .build();
    const options2 = GoogleGenAiChatOptions.builder()
      .model("test-model")
      .thinkingLevel(GoogleGenAiThinkingLevel.HIGH)
      .build();
    const options3 = GoogleGenAiChatOptions.builder()
      .model("test-model")
      .thinkingLevel(GoogleGenAiThinkingLevel.LOW)
      .build();

    expect(options1).toEqual(options2);
    expect(options1).not.toEqual(options3);
  });

  it("should support thinkingBudget, includeThoughts, and thinkingLevel together", () => {
    const options = GoogleGenAiChatOptions.builder()
      .model("test-model")
      .thinkingBudget(8192)
      .includeThoughts(true)
      .thinkingLevel(GoogleGenAiThinkingLevel.HIGH)
      .build();

    expect(options.thinkingBudget).toBe(8192);
    expect(options.includeThoughts).toBe(true);
    expect(options.thinkingLevel).toBe(GoogleGenAiThinkingLevel.HIGH);
  });

  it("should support all thinking level values", () => {
    // Test all enum values work correctly
    for (const level of Object.values(GoogleGenAiThinkingLevel)) {
      const options = GoogleGenAiChatOptions.builder()
        .model("test-model")
        .thinkingLevel(level)
        .build();

      expect(options.thinkingLevel).toBe(level);
    }
  });

  it("should build options with the namespace builder", () => {
    const options = GoogleGenAiChatOptions.builder()
      .model("builder-model")
      .temperature(0.5)
      .candidateCount(2)
      .googleSearchRetrieval(true)
      .labels({ env: "test" })
      .build();

    expect(options.model).toBe("builder-model");
    expect(options.temperature).toBe(0.5);
    expect(options.candidateCount).toBe(2);
    expect(options.googleSearchRetrieval).toBe(true);
    expect(options.labels).toEqual({ env: "test" });
  });

  it("should preserve thinkingBudget in toString", () => {
    const options = GoogleGenAiChatOptions.builder()
      .model("test-model")
      .thinkingBudget(12853)
      .build();

    const rendered = options.toString();
    expect(rendered).toContain("thinkingBudget=12853");
    expect(rendered).toContain("test-model");
  });

  it("should preserve labels in toString", () => {
    const options = GoogleGenAiChatOptions.builder()
      .model("test-model")
      .labels({ org: "my-org" })
      .build();

    const rendered = options.toString();
    expect(rendered).toContain("labels={org=my-org}");
    expect(rendered).toContain("test-model");
  });
});
