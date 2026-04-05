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

import type {
  DynamicModule,
  FactoryProvider,
  InjectionToken,
  Provider,
} from "@nestjs/common";
import { Module } from "@nestjs/common";
import {
  AlsObservationRegistry,
  METER_REGISTRY_TOKEN,
  type MeterRegistry,
  OBSERVATION_REGISTRY_TOKEN,
  ObservationFilters,
  ObservationHandlers,
  type ObservationRegistry,
} from "@nestjs-ai/commons";
import {
  OtelMeterObservationHandler,
  OtelTracingObservationHandler,
} from "../handlers";
import { OtelMeterRegistry } from "../otel-meter-registry";
import type { ObservationConfigurationProperties } from "./observation-configuration-properties";
import { ObservationProviderPostProcessor } from "./observation-provider-post-processor";

export interface ObservationModuleAsyncOptions {
  imports?: DynamicModule["imports"];
  inject?: InjectionToken[];
  useFactory: (
    ...args: never[]
  ) =>
    | Promise<ObservationConfigurationProperties>
    | ObservationConfigurationProperties;
  global?: boolean;
}

@Module({})
export class ObservationModule {
  static forFeature(
    properties: ObservationConfigurationProperties & { global?: boolean } = {},
  ): DynamicModule {
    const providers = createProviders(properties);

    return {
      module: ObservationModule,
      providers,
      exports: providers.map((p) => (p as FactoryProvider).provide),
      global: properties.global ?? true,
    };
  }

  static forFeatureAsync(
    options: ObservationModuleAsyncOptions,
  ): DynamicModule {
    const providers = createAsyncProviders();

    return {
      module: ObservationModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: OBSERVATION_PROPERTIES_TOKEN,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        ...providers,
      ],
      exports: providers.map((p) => (p as FactoryProvider).provide),
      global: options.global ?? true,
    };
  }
}

const OBSERVATION_PROPERTIES_TOKEN = Symbol.for("OBSERVATION_PROPERTIES_TOKEN");

function createProviders(
  properties: ObservationConfigurationProperties,
): Provider[] {
  return [
    ...createMeterRegistryProviders(properties),
    ...createObservationHandlerProviders(properties),
    ...createObservationRegistryProviders(),
  ];
}

function createAsyncProviders(): Provider[] {
  return [
    {
      provide: OtelMeterRegistry,
      useFactory: (properties: ObservationConfigurationProperties) => {
        if (!properties.meter) return null;
        return new OtelMeterRegistry(properties.meter);
      },
      inject: [OBSERVATION_PROPERTIES_TOKEN],
    },
    {
      provide: METER_REGISTRY_TOKEN,
      useFactory: (registry: OtelMeterRegistry | null) =>
        registry as MeterRegistry | null,
      inject: [OtelMeterRegistry],
    },
    ...createObservationRegistryProviders(),
    {
      provide: ObservationProviderPostProcessor,
      useFactory: (
        properties: ObservationConfigurationProperties,
        observationRegistry: ObservationRegistry,
        observationHandlers: ObservationHandlers,
        observationFilters: ObservationFilters,
      ) => {
        if (properties.tracer) {
          observationHandlers.addHandler(
            new OtelTracingObservationHandler(properties.tracer),
          );
        }
        if (properties.meter) {
          observationHandlers.addHandler(
            new OtelMeterObservationHandler(
              properties.meter,
              ...(properties.ignoredMeters ?? []),
            ),
          );
        }
        return new ObservationProviderPostProcessor(
          observationRegistry,
          observationHandlers,
          observationFilters,
        );
      },
      inject: [
        OBSERVATION_PROPERTIES_TOKEN,
        OBSERVATION_REGISTRY_TOKEN,
        ObservationHandlers,
        ObservationFilters,
      ],
    },
  ];
}

function createMeterRegistryProviders(
  properties: ObservationConfigurationProperties,
): Provider[] {
  if (!properties.meter) {
    return [];
  }

  return [
    {
      provide: OtelMeterRegistry,
      useFactory: () => new OtelMeterRegistry(properties.meter as never),
    },
    {
      provide: METER_REGISTRY_TOKEN,
      useFactory: (registry: OtelMeterRegistry) => registry as MeterRegistry,
      inject: [OtelMeterRegistry],
    },
  ];
}

function createObservationHandlerProviders(
  properties: ObservationConfigurationProperties,
): Provider[] {
  return [
    {
      provide: ObservationProviderPostProcessor,
      useFactory: (
        observationRegistry: ObservationRegistry,
        observationHandlers: ObservationHandlers,
        observationFilters: ObservationFilters,
      ) => {
        if (properties.tracer) {
          observationHandlers.addHandler(
            new OtelTracingObservationHandler(properties.tracer),
          );
        }
        if (properties.meter) {
          observationHandlers.addHandler(
            new OtelMeterObservationHandler(
              properties.meter,
              ...(properties.ignoredMeters ?? []),
            ),
          );
        }
        return new ObservationProviderPostProcessor(
          observationRegistry,
          observationHandlers,
          observationFilters,
        );
      },
      inject: [
        OBSERVATION_REGISTRY_TOKEN,
        ObservationHandlers,
        ObservationFilters,
      ],
    },
  ];
}

function createObservationRegistryProviders(): Provider[] {
  return [
    {
      provide: AlsObservationRegistry,
      useFactory: () => new AlsObservationRegistry(),
    },
    {
      provide: OBSERVATION_REGISTRY_TOKEN,
      useFactory: (registry: AlsObservationRegistry) =>
        registry as ObservationRegistry,
      inject: [AlsObservationRegistry],
    },
  ];
}
