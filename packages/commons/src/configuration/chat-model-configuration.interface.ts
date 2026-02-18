import type { ProviderConfiguration } from "./provider-configuration.type";

declare const CHAT_MODEL_CONFIGURATION_BRAND: unique symbol;

export interface ChatModelConfiguration {
  providers: ProviderConfiguration[];
  readonly [CHAT_MODEL_CONFIGURATION_BRAND]: true;
}
