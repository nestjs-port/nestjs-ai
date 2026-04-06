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
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
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

describe("ObservationModule spans", () => {
  let provider: BasicTracerProvider | null = null;
  let exporter: InMemorySpanExporter | null = null;

  afterEach(async () => {
    if (provider) {
      await provider.shutdown();
    }
    exporter?.reset();
    provider = null;
    exporter = null;
  });

  it("exports a finished span to memory when an observation runs", async () => {
    exporter = new InMemorySpanExporter();
    provider = new BasicTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(exporter)],
    });

    const tracer = provider.getTracer("integration-tests");

    const moduleRef = await Test.createTestingModule({
      imports: [ObservationModule.forRoot({ tracer })],
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

    await provider.forceFlush();

    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe("test contextual");
    expect(spans[0].attributes).toMatchObject({
      low: "1",
      high: "2",
    });
  });
});
