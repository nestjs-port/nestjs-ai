import {
  AlsObservationRegistry,
  METER_REGISTRY_TOKEN,
  type MeterRegistry,
  OBSERVATION_REGISTRY_TOKEN,
  type ObservationConfiguration,
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

/**
 * Creates an observation configuration that wires ALS-based registry and OTel handlers.
 */
export function configureObservation(
  properties: ObservationConfigurationProperties,
): ObservationConfiguration {
  return {
    providers: [
      ...createMeterRegistryProviders(properties),
      ...createObservationHandlerProviders(properties),
      ...createObservationRegistryProviders(),
    ],
  } as ObservationConfiguration;
}

function createMeterRegistryProviders(
  properties: ObservationConfigurationProperties,
): ObservationConfiguration["providers"] {
  const { meter } = properties;
  if (!meter) {
    return [];
  }

  return [
    {
      token: OtelMeterRegistry,
      useFactory: () => new OtelMeterRegistry(meter),
      inject: [],
    },
    {
      token: METER_REGISTRY_TOKEN,
      useFactory: (registry: OtelMeterRegistry) => registry as MeterRegistry,
      inject: [OtelMeterRegistry],
    },
  ];
}

function createObservationHandlerProviders(
  properties: ObservationConfigurationProperties,
): ObservationConfiguration["providers"] {
  return [
    {
      token: ObservationProviderPostProcessor,
      useFactory: (
        observationRegistry: ObservationRegistry,
        observationHandlers: ObservationHandlers,
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
        );
      },
      inject: [OBSERVATION_REGISTRY_TOKEN, ObservationHandlers],
    },
  ];
}

function createObservationRegistryProviders(): ObservationConfiguration["providers"] {
  return [
    {
      token: AlsObservationRegistry,
      useFactory: () => new AlsObservationRegistry(),
      inject: [],
    },
    {
      token: OBSERVATION_REGISTRY_TOKEN,
      useFactory: (registry: AlsObservationRegistry) =>
        registry as ObservationRegistry,
      inject: [AlsObservationRegistry],
    },
  ];
}
