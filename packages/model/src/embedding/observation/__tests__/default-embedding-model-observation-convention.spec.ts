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

import { AiObservationAttributes } from "@nestjs-ai/commons";
import { KeyValue, ObservationContext } from "@nestjs-port/core";
import { describe, expect, it } from "vitest";
import { Usage } from "../../../chat";
import { EmbeddingOptions } from "../../embedding-options.interface";
import { EmbeddingRequest } from "../../embedding-request";
import { EmbeddingResponse } from "../../embedding-response";
import { EmbeddingResponseMetadata } from "../../embedding-response-metadata";
import { DefaultEmbeddingModelObservationConvention } from "../default-embedding-model-observation-convention";
import { EmbeddingModelObservationContext } from "../embedding-model-observation-context";

describe("DefaultEmbeddingModelObservationConvention", () => {
  const observationConvention =
    new DefaultEmbeddingModelObservationConvention();

  it("should have name", () => {
    expect(observationConvention.getName()).toBe(
      DefaultEmbeddingModelObservationConvention.DEFAULT_NAME,
    );
  });

  it("contextual name when model is defined", () => {
    const observationContext = new EmbeddingModelObservationContext(
      generateEmbeddingRequest(
        EmbeddingOptions.builder().model("mistral").build(),
      ),
      "superprovider",
    );

    expect(observationConvention.getContextualName(observationContext)).toBe(
      "embedding mistral",
    );
  });

  it("contextual name when model is not defined", () => {
    const observationContext = new EmbeddingModelObservationContext(
      generateEmbeddingRequest(EmbeddingOptions.builder().build()),
      "superprovider",
    );

    expect(observationConvention.getContextualName(observationContext)).toBe(
      "embedding",
    );
  });

  it("supports only embedding model observation context", () => {
    const observationContext = new EmbeddingModelObservationContext(
      generateEmbeddingRequest(
        EmbeddingOptions.builder().model("supermodel").build(),
      ),
      "superprovider",
    );

    expect(observationConvention.supportsContext(observationContext)).toBe(
      true,
    );
    expect(
      observationConvention.supportsContext(new ObservationContext()),
    ).toBe(false);
  });

  it("should have low cardinality key values when defined", () => {
    const observationContext = new EmbeddingModelObservationContext(
      generateEmbeddingRequest(
        EmbeddingOptions.builder().model("mistral").build(),
      ),
      "superprovider",
    );

    const keyValues = observationConvention
      .getLowCardinalityKeyValues(observationContext)
      .toArray();

    expect(keyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.AI_OPERATION_TYPE.value, "embedding"),
    );
    expect(keyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.AI_PROVIDER.value, "superprovider"),
    );
    expect(keyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.REQUEST_MODEL.value, "mistral"),
    );
  });

  it("should have low cardinality key values when defined and response", () => {
    const observationContext = new EmbeddingModelObservationContext(
      generateEmbeddingRequest(
        EmbeddingOptions.builder().model("mistral").dimensions(1492).build(),
      ),
      "superprovider",
    );

    observationContext.setResponse(
      new EmbeddingResponse(
        [],
        new EmbeddingResponseMetadata("mistral-42", new TestUsage(), {}),
      ),
    );

    const lowCardinalityKeyValues = observationConvention
      .getLowCardinalityKeyValues(observationContext)
      .toArray();
    const highCardinalityKeyValues = observationConvention
      .getHighCardinalityKeyValues(observationContext)
      .toArray();

    expect(lowCardinalityKeyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.RESPONSE_MODEL.value, "mistral-42"),
    );
    expect(highCardinalityKeyValues).toContainEqual(
      KeyValue.of(
        AiObservationAttributes.REQUEST_EMBEDDING_DIMENSIONS.value,
        "1492",
      ),
    );
    expect(highCardinalityKeyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.USAGE_INPUT_TOKENS.value, "1000"),
    );
    expect(highCardinalityKeyValues).toContainEqual(
      KeyValue.of(AiObservationAttributes.USAGE_TOTAL_TOKENS.value, "1000"),
    );
  });

  it("should not have key values when missing", () => {
    const observationContext = new EmbeddingModelObservationContext(
      generateEmbeddingRequest(EmbeddingOptions.builder().build()),
      "superprovider",
    );

    const lowCardinalityKeyValues = observationConvention
      .getLowCardinalityKeyValues(observationContext)
      .toArray();
    const highCardinalityKeys = observationConvention
      .getHighCardinalityKeyValues(observationContext)
      .toArray()
      .map((keyValue) => keyValue.key);

    expect(lowCardinalityKeyValues).toContainEqual(
      KeyValue.of(
        AiObservationAttributes.REQUEST_MODEL.value,
        KeyValue.NONE_VALUE,
      ),
    );
    expect(lowCardinalityKeyValues).toContainEqual(
      KeyValue.of(
        AiObservationAttributes.RESPONSE_MODEL.value,
        KeyValue.NONE_VALUE,
      ),
    );
    expect(highCardinalityKeys).not.toContain(
      AiObservationAttributes.REQUEST_EMBEDDING_DIMENSIONS.value,
    );
    expect(highCardinalityKeys).not.toContain(
      AiObservationAttributes.USAGE_INPUT_TOKENS.value,
    );
    expect(highCardinalityKeys).not.toContain(
      AiObservationAttributes.USAGE_TOTAL_TOKENS.value,
    );
  });
});

function generateEmbeddingRequest(
  embeddingOptions: EmbeddingOptions,
): EmbeddingRequest {
  return new EmbeddingRequest([], embeddingOptions);
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
