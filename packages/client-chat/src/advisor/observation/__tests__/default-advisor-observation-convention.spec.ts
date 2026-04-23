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

import {
  AiObservationAttributes,
  AiOperationType,
  AiProvider,
  SpringAiKind,
} from "@nestjs-ai/commons";
import { Prompt } from "@nestjs-ai/model";
import { KeyValue, ObservationContext } from "@nestjs-port/core";
import { describe, expect, it } from "vitest";
import { ChatClientRequest } from "../../../chat-client-request.js";
import { AdvisorObservationContext } from "../advisor-observation-context.js";
import { DefaultAdvisorObservationConvention } from "../default-advisor-observation-convention.js";

describe("DefaultAdvisorObservationConvention", () => {
  const observationConvention = new DefaultAdvisorObservationConvention();

  it("should have name", () => {
    expect(observationConvention.getName()).toBe(
      DefaultAdvisorObservationConvention.DEFAULT_NAME,
    );
  });

  it("contextual name", () => {
    const observationContext = new AdvisorObservationContext(
      "MyName",
      ChatClientRequest.builder().prompt(new Prompt("Hello")).build(),
      0,
    );

    expect(observationConvention.getContextualName(observationContext)).toBe(
      "my_name",
    );
  });

  it("supports advisor observation context", () => {
    const observationContext = new AdvisorObservationContext(
      "MyName",
      ChatClientRequest.builder().prompt(new Prompt("Hello")).build(),
      0,
    );

    expect(observationConvention.supportsContext(observationContext)).toBe(
      true,
    );
    expect(
      observationConvention.supportsContext(new ObservationContext()),
    ).toBe(false);
  });

  it("should have low cardinality key values when defined", () => {
    const observationContext = new AdvisorObservationContext(
      "MyName",
      ChatClientRequest.builder().prompt(new Prompt("Hello")).build(),
      0,
    );

    expect(
      observationConvention
        .getLowCardinalityKeyValues(observationContext)
        .toArray(),
    ).toEqual(
      expect.arrayContaining([
        KeyValue.of(
          AiObservationAttributes.AI_OPERATION_TYPE.value,
          AiOperationType.FRAMEWORK.value,
        ),
        KeyValue.of(
          AiObservationAttributes.AI_PROVIDER.value,
          AiProvider.SPRING_AI.value,
        ),
        KeyValue.of("spring.ai.advisor.name", "MyName"),
        KeyValue.of("spring.ai.kind", SpringAiKind.ADVISOR.value),
      ]),
    );
  });

  it("should have key values when defined and response", () => {
    const observationContext = new AdvisorObservationContext(
      "MyName",
      ChatClientRequest.builder().prompt(new Prompt("Hello")).build(),
      678,
    );

    expect(
      observationConvention
        .getHighCardinalityKeyValues(observationContext)
        .toArray(),
    ).toContainEqual(KeyValue.of("spring.ai.advisor.order", "678"));
  });
});
