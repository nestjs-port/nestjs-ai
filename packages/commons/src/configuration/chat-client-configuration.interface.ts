import type { ProviderConfiguration } from "./provider-configuration.type";

declare const CHAT_CLIENT_CONFIGURATION_BRAND: unique symbol;

export interface ChatClientConfiguration {
  providers: ProviderConfiguration[];
  readonly [CHAT_CLIENT_CONFIGURATION_BRAND]: true;
}
