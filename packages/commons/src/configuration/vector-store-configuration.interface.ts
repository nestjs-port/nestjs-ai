import type { ProviderConfiguration } from "./provider-configuration.type";

declare const VECTOR_STORE_CONFIGURATION_BRAND: unique symbol;

export interface VectorStoreConfiguration {
  providers: ProviderConfiguration[];
  readonly [VECTOR_STORE_CONFIGURATION_BRAND]: true;
}
