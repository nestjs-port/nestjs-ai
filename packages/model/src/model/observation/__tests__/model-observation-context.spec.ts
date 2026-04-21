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
  AiOperationMetadata,
  AiOperationType,
  AiProvider,
} from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { ModelObservationContext } from "../model-observation-context";

describe("ModelObservationContext", () => {
  it("when request and metadata then return", () => {
    const observationContext = new ModelObservationContext<string, string>(
      "test request",
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.OLLAMA.value,
      ),
    );

    expect(observationContext).toBeDefined();
  });

  it("when request is null then throw", () => {
    expect(
      () =>
        new ModelObservationContext<string, string>(
          null as unknown as string,
          new AiOperationMetadata(
            AiOperationType.EMBEDDING.value,
            AiProvider.OLLAMA.value,
          ),
        ),
    ).toThrow("request cannot be null");
  });

  it("when operation metadata is null then throw", () => {
    expect(
      () =>
        new ModelObservationContext<string, string>(
          "test request",
          null as unknown as AiOperationMetadata,
        ),
    ).toThrow("operationMetadata cannot be null");
  });

  it("when operation metadata is missing operation type then throw", () => {
    expect(
      () =>
        new ModelObservationContext<string, string>("test request", {
          provider: AiProvider.OLLAMA.value,
        } as unknown as AiOperationMetadata),
    ).toThrow("operationType cannot be null or empty");
  });

  it("when operation metadata is missing provider then throw", () => {
    expect(
      () =>
        new ModelObservationContext<string, string>("test request", {
          operationType: AiOperationType.IMAGE.value,
        } as unknown as AiOperationMetadata),
    ).toThrow("provider cannot be null or empty");
  });

  it("when response then return", () => {
    const observationContext = new ModelObservationContext<string, string>(
      "test request",
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.OLLAMA.value,
      ),
    );
    observationContext.setResponse("test response");

    expect(observationContext).toBeDefined();
  });

  it("when response is null then throw", () => {
    const observationContext = new ModelObservationContext<string, string>(
      "test request",
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.OLLAMA.value,
      ),
    );

    expect(() => {
      observationContext.setResponse(null as unknown as string);
    }).toThrow("response cannot be null");
  });

  it("when empty operation type then throw", () => {
    expect(
      () =>
        new ModelObservationContext<string, string>(
          "test request",
          new AiOperationMetadata("", AiProvider.OLLAMA.value),
        ),
    ).toThrow("operationType cannot be null or empty");
  });

  it("when empty provider then throw", () => {
    expect(
      () =>
        new ModelObservationContext<string, string>(
          "test request",
          new AiOperationMetadata(AiOperationType.CHAT.value, ""),
        ),
    ).toThrow("provider cannot be null or empty");
  });

  it("when different providers then return", () => {
    const ollamaContext = new ModelObservationContext<string, string>(
      "test request",
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.OLLAMA.value,
      ),
    );

    const openaiContext = new ModelObservationContext<string, string>(
      "test request",
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.OPENAI.value,
      ),
    );

    const anthropicContext = new ModelObservationContext<string, string>(
      "test request",
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.ANTHROPIC.value,
      ),
    );

    expect(ollamaContext).toBeDefined();
    expect(openaiContext).toBeDefined();
    expect(anthropicContext).toBeDefined();
  });

  it("when complex object types are used then return", () => {
    const observationContext = new ModelObservationContext<number, boolean>(
      12345,
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.OLLAMA.value,
      ),
    );
    observationContext.setResponse(true);

    expect(observationContext).toBeDefined();
  });

  it("when get request then return", () => {
    const testRequest = "test request content";
    const observationContext = new ModelObservationContext<string, string>(
      testRequest,
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.OLLAMA.value,
      ),
    );

    expect(observationContext.request).toBe(testRequest);
  });

  it("when get response before setting then return null", () => {
    const observationContext = new ModelObservationContext<string, string>(
      "test request",
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.OLLAMA.value,
      ),
    );

    expect(observationContext.response).toBeNull();
  });

  it("when get response after setting then return", () => {
    const testResponse = "test response content";
    const observationContext = new ModelObservationContext<string, string>(
      "test request",
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.OLLAMA.value,
      ),
    );
    observationContext.setResponse(testResponse);

    expect(observationContext.response).toBe(testResponse);
  });

  it("when get operation metadata then return", () => {
    const metadata = new AiOperationMetadata(
      AiOperationType.EMBEDDING.value,
      AiProvider.OPENAI.value,
    );
    const observationContext = new ModelObservationContext<string, string>(
      "test request",
      metadata,
    );

    expect(observationContext.operationMetadata).toBe(metadata);
  });

  it("when set response multiple times then last value wins", () => {
    const observationContext = new ModelObservationContext<string, string>(
      "test request",
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.OLLAMA.value,
      ),
    );

    observationContext.setResponse("first response");
    observationContext.setResponse("second response");
    observationContext.setResponse("final response");

    expect(observationContext.response).toBe("final response");
  });

  it("when whitespace only operation type then throw", () => {
    expect(
      () =>
        new ModelObservationContext<string, string>(
          "test request",
          new AiOperationMetadata("   ", AiProvider.OLLAMA.value),
        ),
    ).toThrow("operationType cannot be null or empty");
  });

  it("when whitespace only provider then throw", () => {
    expect(
      () =>
        new ModelObservationContext<string, string>(
          "test request",
          new AiOperationMetadata(AiOperationType.CHAT.value, "   "),
        ),
    ).toThrow("provider cannot be null or empty");
  });

  it("when empty string request then return", () => {
    const observationContext = new ModelObservationContext<string, string>(
      "",
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.OLLAMA.value,
      ),
    );

    expect(observationContext).toBeDefined();
    expect(observationContext.request).toBe("");
  });

  it("when empty string response then return", () => {
    const observationContext = new ModelObservationContext<string, string>(
      "test request",
      new AiOperationMetadata(
        AiOperationType.CHAT.value,
        AiProvider.OLLAMA.value,
      ),
    );
    observationContext.setResponse("");

    expect(observationContext.response).toBe("");
  });
});
