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
import {
  DefaultToolDefinition,
  ToolCallback,
  type ToolDefinition,
} from "../../../tool";
import { DefaultToolCallingChatOptions } from "../default-tool-calling-chat-options";

class TestToolCallback extends ToolCallback {
  private readonly _toolDefinition: ToolDefinition;

  constructor(name: string) {
    super();
    this._toolDefinition = DefaultToolDefinition.builder()
      .name(name)
      .inputSchema("{}")
      .build();
  }

  get toolDefinition(): ToolDefinition {
    return this._toolDefinition;
  }

  async call(_toolInput: string): Promise<string> {
    return "Mission accomplished!";
  }
}

describe("DefaultToolCallingChatOptions", () => {
  it("should store tool callbacks when set with list", () => {
    const options = new DefaultToolCallingChatOptions();
    const callback1 = new TestToolCallback("tool1");
    const callback2 = new TestToolCallback("tool2");

    options.setToolCallbacks([callback1, callback2]);

    expect(options.toolCallbacks).toHaveLength(2);
    expect(options.toolCallbacks).toEqual([callback1, callback2]);
  });

  it("should store tool callbacks when set with varargs-style list", () => {
    const options = new DefaultToolCallingChatOptions();
    const callback1 = new TestToolCallback("tool1");
    const callback2 = new TestToolCallback("tool2");

    options.setToolCallbacks([callback1, callback2]);

    expect(options.toolCallbacks).toHaveLength(2);
    expect(options.toolCallbacks[0]).toBe(callback1);
    expect(options.toolCallbacks[1]).toBe(callback2);
  });

  it("should reject null tool callbacks", () => {
    const options = new DefaultToolCallingChatOptions();

    expect(() => {
      options.setToolCallbacks(null as unknown as ToolCallback[]);
    }).toThrow("toolCallbacks cannot be null");
  });

  it("should store tool names when set", () => {
    const options = new DefaultToolCallingChatOptions();
    options.setToolNames(new Set(["tool1", "tool2"]));

    expect(options.toolNames.size).toBe(2);
    expect(options.toolNames.has("tool1")).toBe(true);
    expect(options.toolNames.has("tool2")).toBe(true);
  });

  it("should store tool names when set with varargs-style set", () => {
    const options = new DefaultToolCallingChatOptions();

    options.setToolNames(new Set(["tool1", "tool2"]));

    expect(options.toolNames.size).toBe(2);
    expect(options.toolNames.has("tool1")).toBe(true);
    expect(options.toolNames.has("tool2")).toBe(true);
  });

  it("should reject null tool names", () => {
    const options = new DefaultToolCallingChatOptions();

    expect(() => {
      options.setToolNames(null as unknown as Set<string>);
    }).toThrow("toolNames cannot be null");
  });

  it("should store tool context", () => {
    const options = new DefaultToolCallingChatOptions();
    options.setToolContext({ key1: "value1", key2: 42 });

    expect(Object.keys(options.toolContext)).toHaveLength(2);
    expect(options.toolContext.key1).toBe("value1");
    expect(options.toolContext.key2).toBe(42);
  });

  it("should reject null tool context", () => {
    const options = new DefaultToolCallingChatOptions();

    expect(() => {
      options.setToolContext(null as unknown as Record<string, unknown>);
    }).toThrow("toolContext cannot be null");
  });

  it("should create new instance with same values when copied", () => {
    const original = new DefaultToolCallingChatOptions();
    const callback = new TestToolCallback("tool1");
    original.setToolCallbacks([callback]);
    original.setToolNames(new Set(["tool1"]));
    original.setToolContext({ key: "value" });
    original.setInternalToolExecutionEnabled(true);
    original.model = "gpt-4";
    original.temperature = 0.7;

    const copy = original.copy() as DefaultToolCallingChatOptions;

    expect(copy).not.toBe(original);
    expect(copy.toolCallbacks).toEqual(original.toolCallbacks);
    expect(copy.toolNames).toEqual(original.toolNames);
    expect(copy.toolContext).toEqual(original.toolContext);
    expect(copy.internalToolExecutionEnabled).toBe(
      original.internalToolExecutionEnabled,
    );
    expect(copy.model).toBe(original.model);
    expect(copy.temperature).toBe(original.temperature);
  });

  it("should return immutable collections from getters", () => {
    const options = new DefaultToolCallingChatOptions();
    const callback = new TestToolCallback("tool1");
    options.setToolCallbacks([callback]);
    options.setToolNames(new Set(["tool1"]));
    options.setToolContext({ key: "value" });

    // toolCallbacks returns a copy, so modifying it doesn't affect internal state
    const callbacks = options.toolCallbacks;
    callbacks.push(new TestToolCallback("tool2"));
    expect(options.toolCallbacks).toHaveLength(1);

    // toolNames returns a copy
    const names = options.toolNames;
    names.add("tool2");
    expect(options.toolNames.size).toBe(1);

    // toolContext returns a copy
    const context = options.toolContext;
    context.key2 = "value2";
    expect(Object.keys(options.toolContext)).toHaveLength(1);
  });

  it("should create options with all properties via builder", () => {
    const callback = new TestToolCallback("tool1");
    const context = { key: "value" };

    const options = DefaultToolCallingChatOptions.builder()
      .toolCallbacks([callback])
      .toolNames("tool1")
      .toolContext(context)
      .internalToolExecutionEnabled(true)
      .model("gpt-4")
      .temperature(0.7)
      .maxTokens(100)
      .frequencyPenalty(0.5)
      .presencePenalty(0.3)
      .stopSequences(["stop"])
      .topK(3)
      .topP(0.9)
      .build();

    expect(options.toolCallbacks).toEqual([callback]);
    expect(options.toolNames.has("tool1")).toBe(true);
    expect(options.toolContext).toEqual(context);
    expect(options.internalToolExecutionEnabled).toBe(true);
    expect(options.model).toBe("gpt-4");
    expect(options.temperature).toBe(0.7);
    expect(options.maxTokens).toBe(100);
    expect(options.frequencyPenalty).toBe(0.5);
    expect(options.presencePenalty).toBe(0.3);
    expect(options.stopSequences).toEqual(["stop"]);
    expect(options.topK).toBe(3);
    expect(options.topP).toBe(0.9);
  });

  it("should support tool context addition via builder", () => {
    const options = DefaultToolCallingChatOptions.builder()
      .toolContext("key1", "value1")
      .toolContext("key2", "value2")
      .build();

    expect(options.toolContext.key1).toBe("value1");
    expect(options.toolContext.key2).toBe("value2");
  });

  it("should initialize with empty collections by default", () => {
    const options = new DefaultToolCallingChatOptions();

    expect(options.toolCallbacks).toHaveLength(0);
    expect(options.toolNames.size).toBe(0);
    expect(Object.keys(options.toolContext)).toHaveLength(0);
    expect(options.internalToolExecutionEnabled).toBeNull();
  });

  it("should handle empty collections via builder", () => {
    const options = DefaultToolCallingChatOptions.builder()
      .toolCallbacks([])
      .toolNames(new Set<string>())
      .toolContext({})
      .build();

    expect(options.toolCallbacks).toHaveLength(0);
    expect(options.toolNames.size).toBe(0);
    expect(Object.keys(options.toolContext)).toHaveLength(0);
  });

  it("should accept null value for internalToolExecutionEnabled", () => {
    const options = new DefaultToolCallingChatOptions();
    options.setInternalToolExecutionEnabled(true);
    expect(options.internalToolExecutionEnabled).toBe(true);

    // Should be able to set back to null
    options.setInternalToolExecutionEnabled(null);
    expect(options.internalToolExecutionEnabled).toBeNull();
  });
});
