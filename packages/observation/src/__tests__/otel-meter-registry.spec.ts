import { Tag } from "@nestjs-ai/commons";
import type { Attributes, Counter, Meter } from "@opentelemetry/api";
import { beforeEach, describe, expect, it } from "vitest";
import { OtelMeterRegistry } from "../otel-meter-registry";

type CounterAdd = { value: number; attributes?: Attributes };

class FakeCounter implements Counter {
  readonly adds: CounterAdd[] = [];

  add(value: number, attributes?: Attributes): void {
    this.adds.push({ value, attributes });
  }
}

class FakeMeter {
  readonly counters = new Map<string, FakeCounter>();

  createCounter(name: string, _options?: { description?: string }): Counter {
    const existing = this.counters.get(name);
    if (existing) return existing;
    const counter = new FakeCounter();
    this.counters.set(name, counter);
    return counter;
  }
}

describe("OtelMeterRegistry", () => {
  let fakeMeter: FakeMeter;
  let registry: OtelMeterRegistry;

  beforeEach(() => {
    fakeMeter = new FakeMeter();
    registry = new OtelMeterRegistry(fakeMeter as unknown as Meter);
  });

  it("should create a counter and increment it", () => {
    const counter = registry.counter(
      "test.counter",
      [Tag.of("key1", "value1")],
      "A test counter",
    );
    counter.increment(42);

    const otelCounter = fakeMeter.counters.get("test.counter");
    expect(otelCounter).toBeDefined();
    expect(otelCounter?.adds).toHaveLength(1);
    expect(otelCounter?.adds[0]).toEqual({
      value: 42,
      attributes: { key1: "value1" },
    });
  });

  it("should pass multiple tags as attributes", () => {
    const counter = registry.counter("test.counter", [
      Tag.of("k1", "v1"),
      Tag.of("k2", "v2"),
      Tag.of("k3", "v3"),
    ]);
    counter.increment(10);

    const otelCounter = fakeMeter.counters.get("test.counter");
    expect(otelCounter?.adds[0]).toEqual({
      value: 10,
      attributes: { k1: "v1", k2: "v2", k3: "v3" },
    });
  });

  it("should reuse the same otel counter instrument for the same name", () => {
    registry.counter("test.counter", [Tag.of("type", "a")]).increment(1);
    registry.counter("test.counter", [Tag.of("type", "b")]).increment(2);

    expect(fakeMeter.counters.size).toBe(1);
    const otelCounter = fakeMeter.counters.get("test.counter");
    expect(otelCounter?.adds).toHaveLength(2);
    expect(otelCounter?.adds[0]).toEqual({
      value: 1,
      attributes: { type: "a" },
    });
    expect(otelCounter?.adds[1]).toEqual({
      value: 2,
      attributes: { type: "b" },
    });
  });
});
