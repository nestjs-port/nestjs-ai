import type { Counter, MeterId, MeterRegistry } from "@nestjs-ai/commons";
import type { Meter, Counter as OtelCounter } from "@opentelemetry/api";

/**
 * MeterRegistry implementation backed by an OpenTelemetry Meter.
 */
export class OtelMeterRegistry implements MeterRegistry {
  private readonly instruments = new Map<string, OtelCounter>();
  private readonly counters = new Map<string, Counter>();

  constructor(private readonly meter: Meter) {}

  counter(id: MeterId): Counter {
    const attributes = id.toAttributes();
    const counterId = id.getIdentityKey();
    const existing = this.counters.get(counterId);
    if (existing) {
      return existing;
    }

    const otelCounter = this.getOrCreateInstrument(id.name, id.description);
    const counter: Counter = {
      increment(amount: number): void {
        otelCounter.add(amount, attributes);
      },
    };
    this.counters.set(counterId, counter);
    return counter;
  }

  private getOrCreateInstrument(
    name: string,
    description?: string,
  ): OtelCounter {
    const existing = this.instruments.get(name);
    if (existing) {
      return existing;
    }

    const counter = this.meter.createCounter(name, { description });
    this.instruments.set(name, counter);
    return counter;
  }
}
