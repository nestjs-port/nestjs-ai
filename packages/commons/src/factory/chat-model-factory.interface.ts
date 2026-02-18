declare const CHAT_MODEL_FACTORY_BRAND: unique symbol;

export interface ChatModelFactory {
  providers: {
    token: unknown;
    useFactory: (...args: never[]) => unknown;
    inject?: unknown[];
  }[];
  readonly [CHAT_MODEL_FACTORY_BRAND]: true;
}
