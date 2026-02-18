import type { Meter, Tracer } from "@opentelemetry/api";
import type { IgnoredMeters } from "../handlers";

export interface ObservationConfigurationProperties {
  meter?: Meter;
  tracer?: Tracer;
  ignoredMeters?: IgnoredMeters[];
}
