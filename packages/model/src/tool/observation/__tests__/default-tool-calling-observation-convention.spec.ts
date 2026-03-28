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

import { KeyValue, ObservationContext } from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { ToolDefinition } from "../../definition";
import { DefaultToolCallingObservationConvention } from "../default-tool-calling-observation-convention";
import { ToolCallingObservationContext } from "../tool-calling-observation-context";

describe("DefaultToolCallingObservationConvention", () => {
  const observationConvention = new DefaultToolCallingObservationConvention();

  it("should have name", () => {
    expect(observationConvention.getName()).toBe(
      DefaultToolCallingObservationConvention.DEFAULT_NAME,
    );
  });

  it("contextual name", () => {
    const observationContext = new ToolCallingObservationContext({
      toolDefinition: createToolDefinition("toolA", "description", "{}"),
      toolCallArguments: "input",
    });

    expect(observationConvention.getContextualName(observationContext)).toBe(
      "tool_call toolA",
    );
  });

  it("supports only chat model observation context", () => {
    const observationContext = new ToolCallingObservationContext({
      toolDefinition: createToolDefinition("toolA", "description", "{}"),
      toolCallArguments: "input",
    });

    expect(observationConvention.supportsContext(observationContext)).toBe(
      true,
    );
    expect(
      observationConvention.supportsContext(new ObservationContext()),
    ).toBe(false);
  });

  it("should have low cardinality key values", () => {
    const observationContext = new ToolCallingObservationContext({
      toolDefinition: createToolDefinition("toolA", "description", "{}"),
      toolCallArguments: "input",
    });

    const keyValues = observationConvention
      .getLowCardinalityKeyValues(observationContext)
      .toArray();

    expect(keyValues).toContainEqual(
      KeyValue.of(
        DefaultToolCallingObservationConvention.TOOL_DEFINITION_NAME,
        "toolA",
      ),
    );
    expect(keyValues).toContainEqual(
      KeyValue.of("gen_ai.operation.name", "framework"),
    );
    expect(keyValues).toContainEqual(KeyValue.of("gen_ai.system", "spring_ai"));
    expect(keyValues).toContainEqual(
      KeyValue.of(
        DefaultToolCallingObservationConvention.SPRING_AI_KIND,
        "tool_call",
      ),
    );
  });

  it("should have high cardinality key values", () => {
    const toolCallInput = `
        {
          "lizard": "George"
        }
      `;
    const observationContext = new ToolCallingObservationContext({
      toolDefinition: createToolDefinition("toolA", "description", "{}"),
      toolCallArguments: toolCallInput,
      toolCallResult: "Mission accomplished!",
    });

    const keyValues = observationConvention
      .getHighCardinalityKeyValues(observationContext)
      .toArray();

    expect(keyValues).toContainEqual(
      KeyValue.of(
        DefaultToolCallingObservationConvention.TOOL_DEFINITION_DESCRIPTION,
        "description",
      ),
    );
    expect(keyValues).toContainEqual(
      KeyValue.of(
        DefaultToolCallingObservationConvention.TOOL_DEFINITION_SCHEMA,
        "{}",
      ),
    );
  });

  it("should have all standard low cardinality keys", () => {
    const observationContext = new ToolCallingObservationContext({
      toolDefinition: createToolDefinition("tool", "Tool", "{}"),
      toolCallArguments: "args",
    });

    const lowCardinalityKeys = observationConvention
      .getLowCardinalityKeyValues(observationContext)
      .toArray()
      .map((keyValue) => keyValue.key);

    // Verify all expected low cardinality keys are present
    expect(lowCardinalityKeys).toContain(
      DefaultToolCallingObservationConvention.TOOL_DEFINITION_NAME,
    );
    expect(lowCardinalityKeys).toContain("gen_ai.operation.name");
    expect(lowCardinalityKeys).toContain("gen_ai.system");
    expect(lowCardinalityKeys).toContain(
      DefaultToolCallingObservationConvention.SPRING_AI_KIND,
    );
  });

  it("should handle null context", () => {
    expect(
      observationConvention.supportsContext(
        null as unknown as ObservationContext,
      ),
    ).toBe(false);
  });

  it("should be consistent across multiple calls", () => {
    const observationContext = new ToolCallingObservationContext({
      toolDefinition: createToolDefinition(
        "consistentTool",
        "Consistent description",
        "{}",
      ),
      toolCallArguments: "args",
    });

    // Call multiple times and verify consistency
    const name1 = observationConvention.getContextualName(observationContext);
    const name2 = observationConvention.getContextualName(observationContext);
    const lowCard1 =
      observationConvention.getLowCardinalityKeyValues(observationContext);
    const lowCard2 =
      observationConvention.getLowCardinalityKeyValues(observationContext);

    expect(name1).toBe(name2);
    expect(lowCard1).toEqual(lowCard2);
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
