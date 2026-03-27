import type { ProviderConfiguration } from "./provider-configuration.type";

declare const EMBEDDING_MODEL_CONFIGURATION_BRAND: unique symbol;

export interface EmbeddingModelConfiguration {
  providers: ProviderConfiguration[];
  readonly [EMBEDDING_MODEL_CONFIGURATION_BRAND]: true;
}
