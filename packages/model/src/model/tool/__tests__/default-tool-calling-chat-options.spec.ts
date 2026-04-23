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
} from "../../../tool/index.js";
import { DefaultToolCallingChatOptions } from "../default-tool-calling-chat-options.js";

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
  it("set tool callbacks should store tool callbacks", () => {
    const options = new DefaultToolCallingChatOptions();
    const callback1 = new TestToolCallback("tool1");
    const callback2 = new TestToolCallback("tool2");
    const callbacks = [callback1, callback2];

    options.setToolCallbacks(callbacks);

    expect(options.toolCallbacks).toHaveLength(2);
    expect(options.toolCallbacks).toEqual(callbacks);
  });

  it("set tool callbacks with varargs should store tool callbacks", () => {
    const options = new DefaultToolCallingChatOptions();
    const callback1 = new TestToolCallback("tool1");
    const callback2 = new TestToolCallback("tool2");

    options.setToolCallbacks([callback1, callback2]);

    expect(options.toolCallbacks).toHaveLength(2);
    expect(options.toolCallbacks).toEqual([callback1, callback2]);
  });

  it("set tool callbacks should reject null list", () => {
    const options = new DefaultToolCallingChatOptions();

    expect(() => {
      options.setToolCallbacks(null as unknown as ToolCallback[]);
    }).toThrow("toolCallbacks cannot be null");
  });

  it("set tool names should store tool names", () => {
    const options = new DefaultToolCallingChatOptions();
    const toolNames = new Set(["tool1", "tool2"]);

    options.setToolNames(toolNames);

    expect(options.toolNames.size).toBe(2);
    expect(options.toolNames).toEqual(toolNames);
  });

  it("set tool names with varargs should store tool names", () => {
    const options = new DefaultToolCallingChatOptions();

    options.setToolNames(new Set(["tool1", "tool2"]));

    expect(options.toolNames.size).toBe(2);
    expect(options.toolNames).toEqual(new Set(["tool1", "tool2"]));
  });

  it("set tool names should reject null set", () => {
    const options = new DefaultToolCallingChatOptions();

    expect(() => {
      options.setToolNames(null as unknown as Set<string>);
    }).toThrow("toolNames cannot be null");
  });

  it("set tool names should reject null elements", () => {
    const options = new DefaultToolCallingChatOptions();
    const toolNames = new Set([null as unknown as string]);

    expect(() => {
      options.setToolNames(toolNames);
    }).toThrow("toolNames cannot contain null elements");
  });

  it("set tool names should reject empty elements", () => {
    const options = new DefaultToolCallingChatOptions();
    const toolNames = new Set([""]);

    expect(() => {
      options.setToolNames(toolNames);
    }).toThrow("toolNames cannot contain empty elements");
  });

  it("set tool context should store context", () => {
    const options = new DefaultToolCallingChatOptions();
    const context = { key1: "value1", key2: 42 };

    options.setToolContext(context);

    expect(Object.keys(options.toolContext)).toHaveLength(2);
    expect(options.toolContext).toEqual(context);
  });

  it("set tool context should reject null map", () => {
    const options = new DefaultToolCallingChatOptions();

    expect(() => {
      options.setToolContext(null as unknown as Record<string, unknown>);
    }).toThrow("toolContext cannot be null");
  });

  it("copy should create new instance with same values", () => {
    const original = new DefaultToolCallingChatOptions();
    const callback = new TestToolCallback("tool1");
    original.setToolCallbacks([callback]);
    original.setToolNames(new Set(["tool1"]));
    original.setToolContext({ key: "value" });
    original.setInternalToolExecutionEnabled(true);
    original.setModel("gpt-4");
    original.setTemperature(0.7);

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

  it("getters should return immutable collections", () => {
    const options = new DefaultToolCallingChatOptions();
    const callback = new TestToolCallback("tool1");
    options.setToolCallbacks([callback]);
    options.setToolNames(new Set(["tool1"]));
    options.setToolContext({ key: "value" });

    const callbacks = options.toolCallbacks;
    callbacks.push(new TestToolCallback("tool2"));
    expect(options.toolCallbacks).toHaveLength(1);

    const names = options.toolNames;
    names.add("tool2");
    expect(options.toolNames.size).toBe(1);

    const context = options.toolContext;
    context.key2 = "value2";
    expect(Object.keys(options.toolContext)).toHaveLength(1);
  });

  it("builder should create options with all properties", () => {
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
    expect(options.toolNames).toEqual(new Set(["tool1"]));
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

  it("builder should support tool context addition", () => {
    const options = DefaultToolCallingChatOptions.builder()
      .toolContext("key1", "value1")
      .toolContext("key2", "value2")
      .build();

    expect(options.toolContext).toEqual({ key1: "value1", key2: "value2" });
  });

  it("deprecated methods should work correctly", () => {
    const options = new DefaultToolCallingChatOptions();

    const callback1 = new TestToolCallback("tool1");
    const callback2 = new TestToolCallback("tool2");
    options.setToolCallbacks([callback1, callback2]);
    expect(options.toolCallbacks).toHaveLength(2);

    options.setToolNames(new Set(["tool1"]));
    expect(options.toolNames).toEqual(new Set(["tool1"]));

    options.setToolNames(new Set(["function1"]));
    expect(options.toolNames).toEqual(new Set(["function1"]));

    options.setInternalToolExecutionEnabled(true);
    expect(options.internalToolExecutionEnabled).toBe(true);
  });

  it("default constructor should initialize with empty collections", () => {
    const options = new DefaultToolCallingChatOptions();

    expect(options.toolCallbacks).toHaveLength(0);
    expect(options.toolNames.size).toBe(0);
    expect(Object.keys(options.toolContext)).toHaveLength(0);
    expect(options.internalToolExecutionEnabled).toBeNull();
  });

  it("builder should handle empty collections", () => {
    const options = DefaultToolCallingChatOptions.builder()
      .toolCallbacks([])
      .toolNames(new Set<string>())
      .toolContext({})
      .build();

    expect(options.toolCallbacks).toHaveLength(0);
    expect(options.toolNames.size).toBe(0);
    expect(Object.keys(options.toolContext)).toHaveLength(0);
  });

  it("set internal tool execution enabled should accept null value", () => {
    const options = new DefaultToolCallingChatOptions();
    options.setInternalToolExecutionEnabled(true);
    expect(options.internalToolExecutionEnabled).toBe(true);

    // Should be able to set back to null
    options.setInternalToolExecutionEnabled(null);
    expect(options.internalToolExecutionEnabled).toBeNull();
  });
});
