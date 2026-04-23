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

import {
  AiObservationMetricAttributes,
  AiObservationMetricNames,
  AiTokenType,
} from "@nestjs-ai/commons";
import {
  type Counter,
  KeyValue,
  type MeterId,
  type MeterRegistry,
  ObservationContext,
  type Tag,
} from "@nestjs-port/core";
import { describe, expect, it } from "vitest";
import { Usage } from "../../../chat/metadata/usage.js";
import { ModelUsageMetricsGenerator } from "../model-usage-metrics-generator.js";

class SimpleCounter implements Counter {
  private _count = 0;

  constructor(
    readonly name: string,
    readonly tags: Tag[],
    readonly description?: string,
  ) {}

  increment(amount: number): void {
    this._count += amount;
  }

  get count(): number {
    return this._count;
  }

  hasTag(key: string, value: string): boolean {
    return this.tags.some((t) => t.key === key && t.value === value);
  }
}

class SimpleMeterRegistry implements MeterRegistry {
  private readonly counters: SimpleCounter[] = [];

  counter(id: MeterId): Counter {
    const c = new SimpleCounter(id.name, [...id.tags], id.description);
    this.counters.push(c);
    return c;
  }

  getCountersByName(name: string): SimpleCounter[] {
    return this.counters.filter((c) => c.name === name);
  }

  getCounter(
    name: string,
    tagKey: string,
    tagValue: string,
  ): SimpleCounter | undefined {
    return this.counters.find(
      (c) => c.name === name && c.hasTag(tagKey, tagValue),
    );
  }
}

class TestUsage extends Usage {
  constructor(
    private readonly _promptTokens: number | null,
    private readonly _completionTokens: number | null,
    private readonly _totalTokens: number,
  ) {
    super();
  }

  get promptTokens(): number {
    return this._promptTokens as number;
  }

  get completionTokens(): number {
    return this._completionTokens as number;
  }

  override get totalTokens(): number {
    return this._totalTokens;
  }

  get nativeUsage(): unknown {
    return {
      promptTokens: this._promptTokens,
      completionTokens: this._completionTokens,
      totalTokens: this._totalTokens,
    };
  }
}

function buildContext(): ObservationContext {
  const context = new ObservationContext();
  context.addLowCardinalityKeyValue(KeyValue.of("key1", "value1"));
  context.addLowCardinalityKeyValue(KeyValue.of("key2", "value2"));
  return context;
}

describe("ModelUsageMetricsGenerator", () => {
  it("when token usage then metrics", () => {
    const meterRegistry = new SimpleMeterRegistry();
    const usage = new TestUsage(1000, 500, 1500);

    ModelUsageMetricsGenerator.generate(usage, buildContext(), meterRegistry);

    const meters = meterRegistry.getCountersByName(
      AiObservationMetricNames.TOKEN_USAGE.value,
    );
    expect(meters).toHaveLength(3);

    const inputCounter = meterRegistry.getCounter(
      AiObservationMetricNames.TOKEN_USAGE.value,
      AiObservationMetricAttributes.TOKEN_TYPE.value,
      AiTokenType.INPUT.value,
    );
    expect(inputCounter?.count).toBe(1000);

    const outputCounter = meterRegistry.getCounter(
      AiObservationMetricNames.TOKEN_USAGE.value,
      AiObservationMetricAttributes.TOKEN_TYPE.value,
      AiTokenType.OUTPUT.value,
    );
    expect(outputCounter?.count).toBe(500);

    const totalCounter = meterRegistry.getCounter(
      AiObservationMetricNames.TOKEN_USAGE.value,
      AiObservationMetricAttributes.TOKEN_TYPE.value,
      AiTokenType.TOTAL.value,
    );
    expect(totalCounter?.count).toBe(1500);
  });

  it("when partial token usage then metrics", () => {
    const meterRegistry = new SimpleMeterRegistry();
    const usage = new TestUsage(1000, null, 1000);

    ModelUsageMetricsGenerator.generate(usage, buildContext(), meterRegistry);

    const meters = meterRegistry.getCountersByName(
      AiObservationMetricNames.TOKEN_USAGE.value,
    );
    expect(meters).toHaveLength(2);

    const inputCounter = meterRegistry.getCounter(
      AiObservationMetricNames.TOKEN_USAGE.value,
      AiObservationMetricAttributes.TOKEN_TYPE.value,
      AiTokenType.INPUT.value,
    );
    expect(inputCounter?.count).toBe(1000);

    const totalCounter = meterRegistry.getCounter(
      AiObservationMetricNames.TOKEN_USAGE.value,
      AiObservationMetricAttributes.TOKEN_TYPE.value,
      AiTokenType.TOTAL.value,
    );
    expect(totalCounter?.count).toBe(1000);
  });

  it("when zero token usage then metrics", () => {
    const meterRegistry = new SimpleMeterRegistry();
    const usage = new TestUsage(0, 0, 0);

    ModelUsageMetricsGenerator.generate(usage, buildContext(), meterRegistry);

    const meters = meterRegistry.getCountersByName(
      AiObservationMetricNames.TOKEN_USAGE.value,
    );
    expect(meters).toHaveLength(3);

    const inputCounter = meterRegistry.getCounter(
      AiObservationMetricNames.TOKEN_USAGE.value,
      AiObservationMetricAttributes.TOKEN_TYPE.value,
      AiTokenType.INPUT.value,
    );
    expect(inputCounter?.count).toBe(0);

    const outputCounter = meterRegistry.getCounter(
      AiObservationMetricNames.TOKEN_USAGE.value,
      AiObservationMetricAttributes.TOKEN_TYPE.value,
      AiTokenType.OUTPUT.value,
    );
    expect(outputCounter?.count).toBe(0);

    const totalCounter = meterRegistry.getCounter(
      AiObservationMetricNames.TOKEN_USAGE.value,
      AiObservationMetricAttributes.TOKEN_TYPE.value,
      AiTokenType.TOTAL.value,
    );
    expect(totalCounter?.count).toBe(0);
  });

  it("when both prompt and completion null then only total metric", () => {
    const meterRegistry = new SimpleMeterRegistry();
    const usage = new TestUsage(null, null, 100);

    ModelUsageMetricsGenerator.generate(usage, buildContext(), meterRegistry);

    const meters = meterRegistry.getCountersByName(
      AiObservationMetricNames.TOKEN_USAGE.value,
    );
    expect(meters).toHaveLength(1);

    const totalCounter = meterRegistry.getCounter(
      AiObservationMetricNames.TOKEN_USAGE.value,
      AiObservationMetricAttributes.TOKEN_TYPE.value,
      AiTokenType.TOTAL.value,
    );
    expect(totalCounter?.count).toBe(100);
  });

  it("should include low cardinality tags from context", () => {
    const meterRegistry = new SimpleMeterRegistry();
    const usage = new TestUsage(100, 50, 150);

    ModelUsageMetricsGenerator.generate(usage, buildContext(), meterRegistry);

    const inputCounter = meterRegistry.getCounter(
      AiObservationMetricNames.TOKEN_USAGE.value,
      AiObservationMetricAttributes.TOKEN_TYPE.value,
      AiTokenType.INPUT.value,
    );
    expect(inputCounter).toBeDefined();
    expect(inputCounter?.hasTag("key1", "value1")).toBe(true);
    expect(inputCounter?.hasTag("key2", "value2")).toBe(true);
  });
});
