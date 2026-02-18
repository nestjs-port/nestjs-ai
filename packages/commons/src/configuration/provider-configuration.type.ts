export type ProviderScope = "DEFAULT" | "TRANSIENT" | "REQUEST";

export interface ProviderConfiguration {
  token: unknown;
  useFactory: (...args: never[]) => unknown;
  inject?: unknown[];
  scope?: ProviderScope;
}
