export interface ChatModelFactory {
  providers: {
    token: unknown;
    useFactory: (...args: never[]) => unknown;
    inject?: unknown[];
  }[];
}
