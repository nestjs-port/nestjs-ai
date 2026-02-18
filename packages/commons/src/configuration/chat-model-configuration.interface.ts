declare const CHAT_MODEL_CONFIGURATION_BRAND: unique symbol;

export interface ChatModelConfiguration {
  providers: {
    token: unknown;
    useFactory: (...args: never[]) => unknown;
    inject?: unknown[];
  }[];
  readonly [CHAT_MODEL_CONFIGURATION_BRAND]: true;
}
