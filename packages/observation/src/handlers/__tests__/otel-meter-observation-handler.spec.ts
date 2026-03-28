/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { KeyValue, ObservationContext } from "@nestjs-ai/commons";
import type {
  Attributes,
  Histogram,
  Meter,
  UpDownCounter,
} from "@opentelemetry/api";
import { beforeEach, describe, expect, it } from "vitest";
import {
  IgnoredMeters,
  OtelMeterObservationHandler,
} from "../otel-meter-observation-handler";

type HistogramRecord = { value: number; attributes?: Attributes };
type CounterAdd = { value: number; attributes?: Attributes };

class FakeHistogram implements Histogram {
  readonly records: HistogramRecord[] = [];

  record(value: number, attributes?: Attributes): void {
    this.records.push({ value, attributes });
  }
}

class FakeUpDownCounter implements UpDownCounter {
  readonly adds: CounterAdd[] = [];

  add(value: number, attributes?: Attributes): void {
    this.adds.push({ value, attributes });
  }
}

class FakeMeter {
  readonly histograms = new Map<string, FakeHistogram>();
  readonly upDownCounters = new Map<string, FakeUpDownCounter>();

  createHistogram(name: string): Histogram {
    const histogram = new FakeHistogram();
    this.histograms.set(name, histogram);
    return histogram;
  }

  createUpDownCounter(name: string): UpDownCounter {
    const counter = new FakeUpDownCounter();
    this.upDownCounters.set(name, counter);
    return counter;
  }
}

class SocketTimeoutException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SocketTimeoutException";
  }
}

describe("OtelMeterObservationHandler", () => {
  let meter: FakeMeter;

  beforeEach(() => {
    meter = new FakeMeter();
  });

  it("should create all meters during an observation without error", () => {
    const handler = new OtelMeterObservationHandler(meter as unknown as Meter);
    const context = new ObservationContext();
    context.name = "test.observation";
    context.addLowCardinalityKeyValue(KeyValue.of("low", "1"));
    context.addHighCardinalityKeyValue(KeyValue.of("high", "2"));

    handler.onStart(context);
    handler.onStop(context);

    const activeCounter = meter.upDownCounters.get("test.observation.active");
    expect(activeCounter).toBeDefined();
    expect(activeCounter?.adds[0]).toEqual({
      value: 1,
      attributes: { low: "1" },
    });
    expect(activeCounter?.adds[1]).toEqual({
      value: -1,
      attributes: { low: "1" },
    });

    const timer = meter.histograms.get("test.observation");
    expect(timer).toBeDefined();
    expect(timer?.records).toHaveLength(1);
    expect(timer?.records[0].value).toBeGreaterThanOrEqual(0);
    expect(timer?.records[0].attributes).toEqual({
      low: "1",
      error: "none",
    });
  });

  it("should create all meters during an observation with error", () => {
    const handler = new OtelMeterObservationHandler(meter as unknown as Meter);
    const context = new ObservationContext();
    context.name = "test.observation";
    context.addLowCardinalityKeyValue(KeyValue.of("low", "1"));
    context.addHighCardinalityKeyValue(KeyValue.of("high", "2"));

    handler.onStart(context);
    context.error = new SocketTimeoutException("simulated");
    handler.onStop(context);

    const activeCounter = meter.upDownCounters.get("test.observation.active");
    expect(activeCounter).toBeDefined();
    expect(activeCounter?.adds[0]).toEqual({
      value: 1,
      attributes: { low: "1" },
    });
    expect(activeCounter?.adds[1]).toEqual({
      value: -1,
      attributes: { low: "1" },
    });

    const timer = meter.histograms.get("test.observation");
    expect(timer).toBeDefined();
    expect(timer?.records).toHaveLength(1);
    expect(timer?.records[0].attributes).toEqual({
      low: "1",
      error: "SocketTimeoutException",
    });
  });

  it("should not create long task timer if ignored", () => {
    const handler = new OtelMeterObservationHandler(
      meter as unknown as Meter,
      IgnoredMeters.LONG_TASK_TIMER,
    );
    const context = new ObservationContext();
    context.name = "test.observation";
    context.addLowCardinalityKeyValue(KeyValue.of("low", "1"));
    context.addHighCardinalityKeyValue(KeyValue.of("high", "2"));

    handler.onStart(context);
    handler.onStop(context);

    const timer = meter.histograms.get("test.observation");
    expect(timer).toBeDefined();
    expect(timer?.records).toHaveLength(1);
    expect(timer?.records[0].attributes).toEqual({
      low: "1",
      error: "none",
    });

    expect(meter.upDownCounters.get("test.observation.active")).toBeUndefined();
  });
});
