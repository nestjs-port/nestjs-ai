import type { ProviderConfiguration } from "./provider-configuration.type";

declare const CHAT_MEMORY_CONFIGURATION_BRAND: unique symbol;

export interface ChatMemoryConfiguration {
  providers: ProviderConfiguration[];
  readonly [CHAT_MEMORY_CONFIGURATION_BRAND]: true;
}
