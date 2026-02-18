declare const CHAT_CLIENT_CONFIGURATION_BRAND: unique symbol;

export interface ChatClientConfiguration {
  providers: {
    token: unknown;
    useFactory: (...args: never[]) => unknown;
    inject?: unknown[];
  }[];
  readonly [CHAT_CLIENT_CONFIGURATION_BRAND]: true;
}
