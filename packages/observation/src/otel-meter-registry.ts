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
