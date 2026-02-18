import type { ProviderConfiguration } from "./provider-configuration.type";

declare const OBSERVATION_CONFIGURATION_BRAND: unique symbol;

export interface ObservationConfiguration {
  providers: ProviderConfiguration[];
  readonly [OBSERVATION_CONFIGURATION_BRAND]: true;
}
