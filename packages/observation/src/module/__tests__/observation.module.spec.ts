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
  ObservationFilters,
  ObservationHandlers,
  TOOL_CALLING_OBSERVATION_PROPERTIES_TOKEN,
} from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { OtelMeterRegistry } from "../../otel-meter-registry";
import { ObservationModule } from "../observation.module";
import { ObservationProviderPostProcessor } from "../observation-provider-post-processor";

describe("ObservationModule", () => {
  it("registers observation registry providers via forRoot", () => {
    const dynamicModule = ObservationModule.forRoot({});
    const providers = dynamicModule.providers as FactoryProvider[];

    expect(providers.some((p) => p.provide === ObservationHandlers)).toBe(true);
    expect(providers.some((p) => p.provide === ObservationFilters)).toBe(true);
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
    const dynamicModule = ObservationModule.forRoot({});
    expect(dynamicModule.global).toBe(true);
  });

  it("can be non-global", () => {
    const dynamicModule = ObservationModule.forRoot({ global: false });
    expect(dynamicModule.global).toBe(false);
  });

  it("exports observation registry token", () => {
    const dynamicModule = ObservationModule.forRoot({});
    expect(dynamicModule.exports).toContain(OBSERVATION_REGISTRY_TOKEN);
  });

  it("returns a null meter registry when meter is not provided", () => {
    const dynamicModule = ObservationModule.forRoot({});
    const providers = dynamicModule.providers as FactoryProvider[];
    const meterProvider = providers.find(
      (p) => p.provide === OtelMeterRegistry,
    ) as {
      useFactory?: (properties: { meter?: unknown } | null) => unknown;
    };

    expect(meterProvider.useFactory?.({})).toBeNull();
  });

  it("registers meter providers when meter is provided", () => {
    const fakeMeter = {} as never;
    const dynamicModule = ObservationModule.forRoot({ meter: fakeMeter });
    const providers = dynamicModule.providers as FactoryProvider[];

    expect(providers.some((p) => p.provide === OtelMeterRegistry)).toBe(true);
    expect(providers.some((p) => p.provide === METER_REGISTRY_TOKEN)).toBe(
      true,
    );
  });

  it("registers tool calling observation properties when content logging is enabled", () => {
    const dynamicModule = ObservationModule.forRoot({
      toolCalling: { includeContent: true },
    });
    const providers = dynamicModule.providers as FactoryProvider[];

    expect(
      providers.some(
        (p) => p.provide === TOOL_CALLING_OBSERVATION_PROPERTIES_TOKEN,
      ),
    ).toBe(true);
  });

  it("returns no tool calling observation properties when content logging is disabled", () => {
    const dynamicModule = ObservationModule.forRoot({
      toolCalling: { includeContent: false },
    });
    const providers = dynamicModule.providers as FactoryProvider[];
    const toolCallingProvider = providers.find(
      (p) => p.provide === TOOL_CALLING_OBSERVATION_PROPERTIES_TOKEN,
    ) as {
      useFactory?: (properties: {
        toolCalling?: { includeContent?: boolean };
      }) => unknown;
    };

    expect(
      toolCallingProvider.useFactory?.({ toolCalling: {} }),
    ).toBeUndefined();
  });

  it("registers async providers via forRootAsync", () => {
    const dynamicModule = ObservationModule.forRootAsync({
      useFactory: () => ({ toolCalling: { includeContent: true } }),
    });
    const providers = dynamicModule.providers as FactoryProvider[];

    expect(
      providers.some((p) => p.provide === OBSERVATION_REGISTRY_TOKEN),
    ).toBe(true);
    expect(
      providers.some((p) => p.provide === ObservationProviderPostProcessor),
    ).toBe(true);
    expect(
      providers.some(
        (p) => p.provide === TOOL_CALLING_OBSERVATION_PROPERTIES_TOKEN,
      ),
    ).toBe(true);
    expect(dynamicModule.global).toBe(true);
  });
});
