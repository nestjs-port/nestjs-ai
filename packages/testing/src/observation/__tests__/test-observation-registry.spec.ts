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
  KeyValue,
  KeyValues,
  ObservationContext,
  type ObservationConvention,
  SimpleObservation,
} from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import {
  TestObservationRegistry,
  TestObservationRegistryCapability,
} from "../test-observation-registry";

class TestConvention implements ObservationConvention<ObservationContext> {
  constructor(private readonly lowCardinality: KeyValues = KeyValues.empty()) {}

  getName(): string {
    return "test.observation";
  }

  getContextualName(_context: ObservationContext): string {
    return "test contextual";
  }

  supportsContext(context: ObservationContext): context is ObservationContext {
    return context instanceof ObservationContext;
  }

  getLowCardinalityKeyValues(_context: ObservationContext): KeyValues {
    return this.lowCardinality;
  }

  getHighCardinalityKeyValues(_context: ObservationContext): KeyValues {
    return KeyValues.empty();
  }
}

function createObservation(
  registry: TestObservationRegistry,
  lowCardinality: KeyValue[] = [],
) {
  return SimpleObservation.createNotStarted(
    null,
    new TestConvention(KeyValues.of(...lowCardinality)),
    () => new ObservationContext(),
    registry,
  );
}

describe("TestObservationRegistry", () => {
  it("stores started and stopped contexts", () => {
    const registry = TestObservationRegistry.create();
    const observation = createObservation(registry).start();

    const scope = observation.openScope();
    scope.close();
    observation.stop();

    expect(registry.contexts).toHaveLength(1);
    expect(registry.contexts[0].isObservationStarted).toBe(true);
    expect(registry.contexts[0].isObservationStopped).toBe(true);
  });

  it("clears stored contexts", () => {
    const registry = TestObservationRegistry.create();
    const observation = createObservation(registry).start();
    observation.stop();

    expect(registry.contexts).toHaveLength(1);
    registry.clear();
    expect(registry.contexts).toHaveLength(0);
  });

  it("validates low cardinality key set by observation name by default", () => {
    const registry = TestObservationRegistry.create();

    createObservation(registry, []).start().stop();
    const colorObservation = createObservation(registry, [
      KeyValue.of("color", "red"),
    ]);

    expect(() => colorObservation.start()).toThrow(
      /must keep the same low cardinality key set/,
    );
  });

  it("can disable low cardinality key set validation", () => {
    const registry = TestObservationRegistry.builder()
      .validateObservationsWithTheSameNameHavingTheSameSetOfLowCardinalityKeys(
        false,
      )
      .build();

    createObservation(registry, []).start().stop();
    expect(() =>
      createObservation(registry, [KeyValue.of("color", "red")]).start(),
    ).not.toThrow();
  });

  it("supports capability toggling via builder", () => {
    const enabled = TestObservationRegistry.builder().build();
    const disabled = TestObservationRegistry.builder()
      .validateObservationsWithTheSameNameHavingTheSameSetOfLowCardinalityKeys(
        false,
      )
      .build();
    const reEnabled = TestObservationRegistry.builder()
      .validateObservationsWithTheSameNameHavingTheSameSetOfLowCardinalityKeys(
        false,
      )
      .validateObservationsWithTheSameNameHavingTheSameSetOfLowCardinalityKeys(
        true,
      )
      .build();

    expect(
      enabled.handlers.some(
        (handler) =>
          handler.constructor.name ===
          "ObservationsLowCardinalityKeysValidatorHandler",
      ),
    ).toBe(true);
    expect(
      disabled.handlers.some(
        (handler) =>
          handler.constructor.name ===
          "ObservationsLowCardinalityKeysValidatorHandler",
      ),
    ).toBe(false);
    expect(
      reEnabled.handlers.some(
        (handler) =>
          handler.constructor.name ===
          "ObservationsLowCardinalityKeysValidatorHandler",
      ),
    ).toBe(true);
    expect(
      Object.values(TestObservationRegistryCapability).includes(
        TestObservationRegistryCapability.OBSERVATIONS_WITH_THE_SAME_NAME_SHOULD_HAVE_THE_SAME_SET_OF_LOW_CARDINALITY_KEYS,
      ),
    ).toBe(true);
  });
});
