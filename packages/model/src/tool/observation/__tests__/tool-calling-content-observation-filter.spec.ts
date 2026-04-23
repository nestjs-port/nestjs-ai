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

import { KeyValue, ObservationContext } from "@nestjs-port/core";
import { describe, expect, it } from "vitest";
import { ToolDefinition } from "../../definition/index.js";
import { ToolCallingContentObservationFilter } from "../tool-calling-content-observation-filter.js";
import { ToolCallingObservationContext } from "../tool-calling-observation-context.js";

describe("ToolCallingContentObservationFilter", () => {
  const observationFilter = new ToolCallingContentObservationFilter();

  it("when not supported observation context then return original context", () => {
    const expectedContext = new ObservationContext();
    const actualContext = observationFilter.map(expectedContext);

    expect(actualContext).toBe(expectedContext);
  });

  it("augment context", () => {
    const originalContext = new ToolCallingObservationContext({
      toolDefinition: createToolDefinition("toolA", "description", "{}"),
      toolCallArguments: "input",
      toolCallResult: "result",
    });
    const augmentedContext = observationFilter.map(originalContext);

    const keyValues = augmentedContext.highCardinalityKeyValues.toArray();
    expect(keyValues).toContainEqual(
      KeyValue.of("spring.ai.tool.call.arguments", "input"),
    );
    expect(keyValues).toContainEqual(
      KeyValue.of("spring.ai.tool.call.result", "result"),
    );
  });

  it("augment context when null result", () => {
    const originalContext = new ToolCallingObservationContext({
      toolDefinition: createToolDefinition("toolA", "description", "{}"),
      toolCallArguments: "input",
      toolCallResult: null,
    });
    const augmentedContext = observationFilter.map(originalContext);

    const keyValues = augmentedContext.highCardinalityKeyValues.toArray();
    expect(keyValues).toContainEqual(
      KeyValue.of("spring.ai.tool.call.arguments", "input"),
    );
    expect(
      keyValues.filter((kv) => kv.key === "spring.ai.tool.call.result"),
    ).toHaveLength(0);
  });

  it("when tool call arguments is empty string then high cardinality key value is empty", () => {
    const originalContext = new ToolCallingObservationContext({
      toolDefinition: createToolDefinition("toolA", "description", "{}"),
      toolCallArguments: "",
      toolCallResult: "result",
    });
    const augmentedContext = observationFilter.map(originalContext);

    const keyValues = augmentedContext.highCardinalityKeyValues.toArray();
    expect(keyValues).toContainEqual(
      KeyValue.of("spring.ai.tool.call.arguments", ""),
    );
    expect(keyValues).toContainEqual(
      KeyValue.of("spring.ai.tool.call.result", "result"),
    );
  });

  it("when tool call result is empty string then high cardinality key value is empty", () => {
    const originalContext = new ToolCallingObservationContext({
      toolDefinition: createToolDefinition("toolA", "description", "{}"),
      toolCallArguments: "input",
      toolCallResult: "",
    });
    const augmentedContext = observationFilter.map(originalContext);

    const keyValues = augmentedContext.highCardinalityKeyValues.toArray();
    expect(keyValues).toContainEqual(
      KeyValue.of("spring.ai.tool.call.arguments", "input"),
    );
    expect(keyValues).toContainEqual(
      KeyValue.of("spring.ai.tool.call.result", ""),
    );
  });

  it("when filter applied multiple times then idempotent", () => {
    const originalContext = new ToolCallingObservationContext({
      toolDefinition: createToolDefinition("toolA", "description", "{}"),
      toolCallArguments: "input",
      toolCallResult: "result",
    });

    const augmentedOnce = observationFilter.map(originalContext);
    const augmentedTwice = observationFilter.map(augmentedOnce);
    const keyValues = augmentedTwice.highCardinalityKeyValues.toArray();

    // Count occurrences of each key
    const argumentsCount = keyValues.filter(
      (kv) => kv.key === "spring.ai.tool.call.arguments",
    ).length;
    const resultCount = keyValues.filter(
      (kv) => kv.key === "spring.ai.tool.call.result",
    ).length;

    // Should not duplicate keys
    expect(argumentsCount).toBe(1);
    expect(resultCount).toBe(1);
  });
});

function createToolDefinition(
  name: string,
  description: string,
  inputSchema: string,
): ToolDefinition {
  return ToolDefinition.builder()
    .name(name)
    .description(description)
    .inputSchema(inputSchema)
    .build();
}
