/*
 * Copyright 2026-present the original author or authors.
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

import type { FactoryProvider } from "@nestjs/common";
import {
  AlsObservationRegistry,
  METER_REGISTRY_TOKEN,
  OBSERVATION_REGISTRY_TOKEN,
} from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { OtelMeterRegistry } from "../../otel-meter-registry";
import { ObservationModule } from "../observation.module";
import { ObservationProviderPostProcessor } from "../observation-provider-post-processor";

describe("ObservationModule", () => {
  it("registers observation registry providers via forFeature", () => {
    const dynamicModule = ObservationModule.forFeature({});
    const providers = dynamicModule.providers as FactoryProvider[];

    expect(providers.some((p) => p.provide === AlsObservationRegistry)).toBe(
      true,
    );
    expect(
      providers.some((p) => p.provide === OBSERVATION_REGISTRY_TOKEN),
    ).toBe(true);
    expect(
      providers.some((p) => p.provide === ObservationProviderPostProcessor),
    ).toBe(true);
  });

  it("is global by default", () => {
    const dynamicModule = ObservationModule.forFeature({});
    expect(dynamicModule.global).toBe(true);
  });

  it("can be non-global", () => {
    const dynamicModule = ObservationModule.forFeature({ global: false });
    expect(dynamicModule.global).toBe(false);
  });

  it("exports observation registry token", () => {
    const dynamicModule = ObservationModule.forFeature({});
    expect(dynamicModule.exports).toContain(OBSERVATION_REGISTRY_TOKEN);
  });

  it("does not register meter providers when meter is not provided", () => {
    const dynamicModule = ObservationModule.forFeature({});
    const providers = dynamicModule.providers as FactoryProvider[];

    expect(providers.some((p) => p.provide === OtelMeterRegistry)).toBe(false);
    expect(providers.some((p) => p.provide === METER_REGISTRY_TOKEN)).toBe(
      false,
    );
  });

  it("registers meter providers when meter is provided", () => {
    const fakeMeter = {} as never;
    const dynamicModule = ObservationModule.forFeature({ meter: fakeMeter });
    const providers = dynamicModule.providers as FactoryProvider[];

    expect(providers.some((p) => p.provide === OtelMeterRegistry)).toBe(true);
    expect(providers.some((p) => p.provide === METER_REGISTRY_TOKEN)).toBe(
      true,
    );
  });

  it("registers async providers via forFeatureAsync", () => {
    const dynamicModule = ObservationModule.forFeatureAsync({
      useFactory: () => ({}),
    });
    const providers = dynamicModule.providers as FactoryProvider[];

    expect(
      providers.some((p) => p.provide === OBSERVATION_REGISTRY_TOKEN),
    ).toBe(true);
    expect(
      providers.some((p) => p.provide === ObservationProviderPostProcessor),
    ).toBe(true);
    expect(dynamicModule.global).toBe(true);
  });
});
