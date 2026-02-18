import {
  AlsObservationRegistry,
  OBSERVATION_REGISTRY_TOKEN,
  type ObservationConfiguration,
  type ObservationContext,
  type ObservationHandler,
  type ObservationRegistry,
} from "@nestjs-ai/commons";
import {
  OtelMeterObservationHandler,
  OtelTracingObservationHandler,
} from "../handlers";
import type { ObservationConfigurationProperties } from "./observation-configuration-properties";

/**
 * Creates an observation configuration that wires ALS-based registry and OTel handlers.
 */
export function configureObservation(
  properties: ObservationConfigurationProperties,
): ObservationConfiguration {
  return {
    providers: [...createObservationRegistryProviders(properties)],
  } as ObservationConfiguration;
}

function createObservationRegistryProviders(
  properties: ObservationConfigurationProperties,
): ObservationConfiguration["providers"] {
  return [
    {
      token: AlsObservationRegistry,
      useFactory: () =>
        createObservationRegistryWithHandlers(createHandlers(properties)),
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

function createHandlers(
  properties: ObservationConfigurationProperties,
): ObservationHandler<ObservationContext>[] {
  const handlers: ObservationHandler<ObservationContext>[] = [];
  if (properties.tracer) {
    handlers.push(new OtelTracingObservationHandler(properties.tracer));
  }
  if (properties.meter) {
    handlers.push(
      new OtelMeterObservationHandler(
        properties.meter,
        ...(properties.ignoredMeters ?? []),
      ),
    );
  }
  return handlers;
}

function createObservationRegistryWithHandlers(
  handlers: ObservationHandler<ObservationContext>[],
): AlsObservationRegistry {
  const registry = new AlsObservationRegistry();
  for (const handler of handlers) {
    registry.addHandler(handler);
  }
  return registry;
}
