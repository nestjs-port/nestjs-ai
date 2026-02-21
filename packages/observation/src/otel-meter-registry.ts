import type { Counter, MeterRegistry, Tag } from "@nestjs-ai/commons";
import type { Meter, Counter as OtelCounter } from "@opentelemetry/api";

/**
 * MeterRegistry implementation backed by an OpenTelemetry Meter.
 */
export class OtelMeterRegistry implements MeterRegistry {
  private readonly counters = new Map<string, OtelCounter>();

  constructor(private readonly meter: Meter) {}

  counter(name: string, tags: Tag[], description?: string): Counter {
    const otelCounter = this.getOrCreateCounter(name, description);
    const attributes: Record<string, string> = {};
    for (const tag of tags) {
      attributes[tag.key] = tag.value;
    }
    return {
      increment(amount: number): void {
        otelCounter.add(amount, attributes);
      },
    };
  }

  private getOrCreateCounter(name: string, description?: string): OtelCounter {
    const existing = this.counters.get(name);
    if (existing) {
      return existing;
    }
    const counter = this.meter.createCounter(name, { description });
    this.counters.set(name, counter);
    return counter;
  }
}
