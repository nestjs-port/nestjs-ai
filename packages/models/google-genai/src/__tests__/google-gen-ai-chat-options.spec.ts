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
    const options = new GoogleGenAiChatOptions({
      model: "test-model",
      thinkingBudget: 15000,
    });

    expect(options.model).toBe("test-model");
    expect(options.thinkingBudget).toBe(15000);
  });

  it("should copy thinkingBudget values", () => {
    const original = new GoogleGenAiChatOptions({
      model: "test-model",
      temperature: 0.8,
      thinkingBudget: 20000,
    });

    const copy = original.copy();

    expect(copy).not.toBe(original);
    expect(copy.model).toBe("test-model");
    expect(copy.temperature).toBe(0.8);
    expect(copy.thinkingBudget).toBe(20000);
  });

  it("should compare equal for identical thinkingBudget values", () => {
    const options1 = new GoogleGenAiChatOptions({
      model: "test-model",
      thinkingBudget: 12853,
    });
    const options2 = new GoogleGenAiChatOptions({
      model: "test-model",
      thinkingBudget: 12853,
    });
    const options3 = new GoogleGenAiChatOptions({
      model: "test-model",
      thinkingBudget: 25000,
    });

    expect(options1).toEqual(options2);
    expect(options1).not.toEqual(options3);
  });

  it("should preserve labels and accept an empty labels map", () => {
    const options = new GoogleGenAiChatOptions({
      model: "test-model",
      labels: {},
    });

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
    const options = new GoogleGenAiChatOptions({
      model: "test-model",
      includeServerSideToolInvocations: true,
    });

    expect(options.model).toBe("test-model");
    expect(options.includeServerSideToolInvocations).toBe(true);
  });

  it("should copy includeServerSideToolInvocations values", () => {
    const original = new GoogleGenAiChatOptions({
      model: "test-model",
      includeServerSideToolInvocations: true,
    });

    const copy = original.copy();

    expect(copy).not.toBe(original);
    expect(copy.includeServerSideToolInvocations).toBe(true);
  });

  it("should compare equal for identical includeServerSideToolInvocations values", () => {
    const options1 = new GoogleGenAiChatOptions({
      model: "test-model",
      includeServerSideToolInvocations: true,
    });
    const options2 = new GoogleGenAiChatOptions({
      model: "test-model",
      includeServerSideToolInvocations: true,
    });
    const options3 = new GoogleGenAiChatOptions({
      model: "test-model",
      includeServerSideToolInvocations: false,
    });

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
    const options = new GoogleGenAiChatOptions({
      model: "test-model",
      thinkingLevel: GoogleGenAiThinkingLevel.HIGH,
    });

    expect(options.model).toBe("test-model");
    expect(options.thinkingLevel).toBe(GoogleGenAiThinkingLevel.HIGH);
  });

  it("should copy thinkingLevel values", () => {
    const original = new GoogleGenAiChatOptions({
      model: "test-model",
      thinkingLevel: GoogleGenAiThinkingLevel.HIGH,
    });

    const copy = original.copy();

    expect(copy).not.toBe(original);
    expect(copy.thinkingLevel).toBe(GoogleGenAiThinkingLevel.HIGH);
  });

  it("should compare equal for identical thinkingLevel values", () => {
    const options1 = new GoogleGenAiChatOptions({
      model: "test-model",
      thinkingLevel: GoogleGenAiThinkingLevel.HIGH,
    });
    const options2 = new GoogleGenAiChatOptions({
      model: "test-model",
      thinkingLevel: GoogleGenAiThinkingLevel.HIGH,
    });
    const options3 = new GoogleGenAiChatOptions({
      model: "test-model",
      thinkingLevel: GoogleGenAiThinkingLevel.LOW,
    });

    expect(options1).toEqual(options2);
    expect(options1).not.toEqual(options3);
  });

  it("should support thinkingBudget, includeThoughts, and thinkingLevel together", () => {
    const options = new GoogleGenAiChatOptions({
      model: "test-model",
      thinkingBudget: 8192,
      includeThoughts: true,
      thinkingLevel: GoogleGenAiThinkingLevel.HIGH,
    });

    expect(options.thinkingBudget).toBe(8192);
    expect(options.includeThoughts).toBe(true);
    expect(options.thinkingLevel).toBe(GoogleGenAiThinkingLevel.HIGH);
  });

  it("should support all thinking level values", () => {
    for (const level of Object.values(GoogleGenAiThinkingLevel)) {
      const options = new GoogleGenAiChatOptions({
        model: "test-model",
        thinkingLevel: level,
      });

      expect(options.thinkingLevel).toBe(level);
    }
  });
});
