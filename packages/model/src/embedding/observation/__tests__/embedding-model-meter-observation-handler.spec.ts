import {
  AiObservationAttributes,
  AiObservationMetricAttributes,
  AiObservationMetricNames,
  AiOperationType,
  AiTokenType,
  AlsObservationRegistry,
  type Counter,
  type MeterId,
  type MeterRegistry,
  SimpleObservation,
  type Tag,
} from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { Usage } from "../../../chat";
import { EmbeddingOptions } from "../../embedding-options.interface";
import { EmbeddingRequest } from "../../embedding-request";
import { EmbeddingResponse } from "../../embedding-response";
import { EmbeddingResponseMetadata } from "../../embedding-response-metadata";
import { DefaultEmbeddingModelObservationConvention } from "../default-embedding-model-observation-convention";
import { EmbeddingModelMeterObservationHandler } from "../embedding-model-meter-observation-handler";
import { EmbeddingModelObservationContext } from "../embedding-model-observation-context";

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
    return this.tags.some((tag) => tag.key === key && tag.value === value);
  }
}

class SimpleMeterRegistry implements MeterRegistry {
  private readonly _counters: SimpleCounter[] = [];

  counter(id: MeterId): Counter {
    const counter = new SimpleCounter(id.name, [...id.tags], id.description);
    this._counters.push(counter);
    return counter;
  }

  getCountersByName(name: string): SimpleCounter[] {
    return this._counters.filter((counter) => counter.name === name);
  }

  getCountersByNameAndTags(
    name: string,
    tags: Record<string, string>,
  ): SimpleCounter[] {
    return this._counters.filter((counter) => {
      if (counter.name !== name) {
        return false;
      }
      return Object.entries(tags).every(([key, value]) =>
        counter.hasTag(key, value),
      );
    });
  }
}

class TestUsage extends Usage {
  get promptTokens(): number {
    return 1000;
  }

  get completionTokens(): number {
    return 0;
  }

  get nativeUsage(): unknown {
    return {
      promptTokens: this.promptTokens,
      completionTokens: this.completionTokens,
      totalTokens: this.totalTokens,
    };
  }
}

describe("EmbeddingModelMeterObservationHandler", () => {
  function generateEmbeddingRequest(
    embeddingOptions: EmbeddingOptions,
  ): EmbeddingRequest {
    return new EmbeddingRequest([], embeddingOptions);
  }

  function createObservationContext(): EmbeddingModelObservationContext {
    return new EmbeddingModelObservationContext(
      generateEmbeddingRequest(
        EmbeddingOptions.builder().model("mistral").build(),
      ),
      "superprovider",
    );
  }

  function createObservation(
    context: EmbeddingModelObservationContext,
    meterRegistry: MeterRegistry,
  ) {
    const observationRegistry = new AlsObservationRegistry();
    observationRegistry.addHandler(
      new EmbeddingModelMeterObservationHandler(meterRegistry),
    );

    const convention = new DefaultEmbeddingModelObservationConvention();
    return SimpleObservation.createNotStarted(
      convention,
      convention,
      () => context,
      observationRegistry,
    );
  }

  it("should create all meters during an observation", () => {
    const meterRegistry = new SimpleMeterRegistry();
    const observationContext = createObservationContext();
    const observation = createObservation(observationContext, meterRegistry);

    observation.start();
    observationContext.response = new EmbeddingResponse(
      [],
      new EmbeddingResponseMetadata("mistral-42", new TestUsage(), {}),
    );
    observation.stop();

    expect(
      meterRegistry.getCountersByName(
        AiObservationMetricNames.TOKEN_USAGE.value,
      ),
    ).toHaveLength(3);

    expect(
      meterRegistry.getCountersByNameAndTags(
        AiObservationMetricNames.TOKEN_USAGE.value,
        {
          [AiObservationAttributes.AI_OPERATION_TYPE.value]:
            AiOperationType.EMBEDDING.value,
          [AiObservationAttributes.AI_PROVIDER.value]: "superprovider",
          [AiObservationAttributes.REQUEST_MODEL.value]: "mistral",
          [AiObservationAttributes.RESPONSE_MODEL.value]: "mistral-42",
        },
      ),
    ).toHaveLength(3);

    expect(
      meterRegistry.getCountersByNameAndTags(
        AiObservationMetricNames.TOKEN_USAGE.value,
        {
          [AiObservationMetricAttributes.TOKEN_TYPE.value]:
            AiTokenType.INPUT.value,
        },
      ),
    ).toHaveLength(1);

    expect(
      meterRegistry.getCountersByNameAndTags(
        AiObservationMetricNames.TOKEN_USAGE.value,
        {
          [AiObservationMetricAttributes.TOKEN_TYPE.value]:
            AiTokenType.OUTPUT.value,
        },
      ),
    ).toHaveLength(1);

    expect(
      meterRegistry.getCountersByNameAndTags(
        AiObservationMetricNames.TOKEN_USAGE.value,
        {
          [AiObservationMetricAttributes.TOKEN_TYPE.value]:
            AiTokenType.TOTAL.value,
        },
      ),
    ).toHaveLength(1);
  });
});
