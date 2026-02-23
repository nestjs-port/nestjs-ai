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
import { AssistantMessage } from "../../messages";
import { ChatResponseMetadata, Usage } from "../../metadata";
import { ChatResponse, Generation } from "../../model";
import { DefaultChatOptions, Prompt } from "../../prompt";
import { ChatModelMeterObservationHandler } from "../chat-model-meter-observation-handler";
import { ChatModelObservationContext } from "../chat-model-observation-context";
import { DefaultChatModelObservationConvention } from "../default-chat-model-observation-convention";

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
    return 500;
  }

  get nativeUsage(): unknown {
    return {
      promptTokens: this.promptTokens,
      completionTokens: this.completionTokens,
      totalTokens: this.totalTokens,
    };
  }
}

describe("ChatModelMeterObservationHandler", () => {
  function createObservationContext(): ChatModelObservationContext {
    return new ChatModelObservationContext(
      new Prompt("hello", new DefaultChatOptions({ model: "mistral" })),
      "superprovider",
    );
  }

  function createObservation(
    context: ChatModelObservationContext,
    meterRegistry: MeterRegistry,
  ) {
    const observationRegistry = new AlsObservationRegistry();
    observationRegistry.addHandler(
      new ChatModelMeterObservationHandler(meterRegistry),
    );

    const convention = new DefaultChatModelObservationConvention();
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
    observationContext.response = new ChatResponse({
      generations: [
        new Generation({ assistantMessage: AssistantMessage.of("test") }),
      ],
      chatResponseMetadata: ChatResponseMetadata.builder()
        .model("mistral-42")
        .usage(new TestUsage())
        .build(),
    });
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
            AiOperationType.CHAT.value,
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

  it("should handle null usage gracefully", () => {
    const meterRegistry = new SimpleMeterRegistry();
    const observationContext = createObservationContext();
    const observation = createObservation(observationContext, meterRegistry);

    observation.start();
    observationContext.response = new ChatResponse({
      generations: [
        new Generation({ assistantMessage: AssistantMessage.of("test") }),
      ],
      chatResponseMetadata: ChatResponseMetadata.builder()
        .model("model")
        .usage(undefined as unknown as Usage)
        .build(),
    });
    observation.stop();

    expect(
      meterRegistry.getCountersByName(
        AiObservationMetricNames.TOKEN_USAGE.value,
      ),
    ).toHaveLength(0);
  });

  it("should handle empty generations", () => {
    const meterRegistry = new SimpleMeterRegistry();
    const observationContext = createObservationContext();
    const observation = createObservation(observationContext, meterRegistry);

    observation.start();
    observationContext.response = new ChatResponse({
      generations: [],
      chatResponseMetadata: ChatResponseMetadata.builder()
        .model("model")
        .usage(new TestUsage())
        .build(),
    });
    observation.stop();

    expect(
      meterRegistry.getCountersByName(
        AiObservationMetricNames.TOKEN_USAGE.value,
      ),
    ).toHaveLength(3);
  });

  it("should handle multiple generations", () => {
    const meterRegistry = new SimpleMeterRegistry();
    const observationContext = createObservationContext();
    const observation = createObservation(observationContext, meterRegistry);

    observation.start();
    observationContext.response = new ChatResponse({
      generations: [
        new Generation({ assistantMessage: AssistantMessage.of("response1") }),
        new Generation({ assistantMessage: AssistantMessage.of("response2") }),
        new Generation({ assistantMessage: AssistantMessage.of("response3") }),
      ],
      chatResponseMetadata: ChatResponseMetadata.builder()
        .model("model")
        .usage(new TestUsage())
        .build(),
    });
    observation.stop();

    expect(
      meterRegistry.getCountersByName(
        AiObservationMetricNames.TOKEN_USAGE.value,
      ),
    ).toHaveLength(3);
  });

  it("should handle observation without response", () => {
    const meterRegistry = new SimpleMeterRegistry();
    const observationContext = createObservationContext();
    const observation = createObservation(observationContext, meterRegistry);

    observation.start();
    observation.stop();

    expect(
      meterRegistry.getCountersByName(
        AiObservationMetricNames.TOKEN_USAGE.value,
      ),
    ).toHaveLength(0);
  });
});
