declare const OBSERVATION_CONFIGURATION_BRAND: unique symbol;

export interface ObservationConfiguration {
  providers: {
    token: unknown;
    useFactory: (...args: never[]) => unknown;
    inject?: unknown[];
  }[];
  readonly [OBSERVATION_CONFIGURATION_BRAND]: true;
}
