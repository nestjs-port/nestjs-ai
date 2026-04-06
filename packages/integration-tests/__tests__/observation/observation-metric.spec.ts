/*
 * Copyright 2026-present the original author or authors.
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

import {
  AggregationTemporality,
  InMemoryMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import "reflect-metadata";
import { Test } from "@nestjs/testing";
import {
  KeyValue,
  KeyValues,
  OBSERVATION_REGISTRY_TOKEN,
  ObservationContext,
  type ObservationConvention,
  SimpleObservation,
} from "@nestjs-ai/commons";
import { ObservationModule } from "@nestjs-ai/observation";
import { afterEach, describe, expect, it } from "vitest";

class TestConvention implements ObservationConvention<ObservationContext> {
  getName(): string {
    return "test.observation";
  }

  getContextualName(_context: ObservationContext): string {
    return "test contextual";
  }

  supportsContext(context: ObservationContext): context is ObservationContext {
    return context instanceof ObservationContext;
  }

  getLowCardinalityKeyValues(_context: ObservationContext): KeyValues {
    return KeyValues.of(KeyValue.of("low", "1"));
  }

  getHighCardinalityKeyValues(_context: ObservationContext): KeyValues {
    return KeyValues.of(KeyValue.of("high", "2"));
  }
}

describe("ObservationModule metrics", () => {
  let meterProvider: MeterProvider | null = null;
  let exporter: InMemoryMetricExporter | null = null;

  afterEach(async () => {
    if (meterProvider) {
      await meterProvider.shutdown();
    }
    exporter?.reset();
    meterProvider = null;
    exporter = null;
  });

  it("exports histogram and active counter metrics to memory", async () => {
    exporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
    meterProvider = new MeterProvider({
      readers: [
        new PeriodicExportingMetricReader({
          exporter,
          exportIntervalMillis: 60_000,
        }),
      ],
    });

    const meter = meterProvider.getMeter("integration-tests");

    const moduleRef = await Test.createTestingModule({
      imports: [ObservationModule.forRoot({ meter })],
    }).compile();

    await moduleRef.init();

    const registry = moduleRef.get(OBSERVATION_REGISTRY_TOKEN);
    expect(registry.handlers).toHaveLength(1);

    const observation = SimpleObservation.createNotStarted(
      null,
      new TestConvention(),
      () => new ObservationContext(),
      registry,
    );

    await observation.observe(async () => {
      await Promise.resolve();
    });

    await meterProvider.forceFlush();

    const resourceMetrics = exporter.getMetrics();
    const metrics = resourceMetrics.flatMap((resourceMetric) =>
      resourceMetric.scopeMetrics.flatMap((scopeMetric) => scopeMetric.metrics),
    );

    const durationMetric = metrics.find(
      (metric) => metric.descriptor.name === "test.observation",
    );
    const activeMetric = metrics.find(
      (metric) => metric.descriptor.name === "test.observation.active",
    );

    expect(durationMetric).toBeDefined();
    expect(activeMetric).toBeDefined();

    expect(durationMetric?.dataPoints[0]?.attributes).toMatchObject({
      low: "1",
      error: "none",
    });
    expect(activeMetric?.dataPoints[0]?.attributes).toMatchObject({
      low: "1",
    });
  });
});
