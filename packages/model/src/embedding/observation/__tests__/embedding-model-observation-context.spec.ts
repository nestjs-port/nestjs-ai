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

import { AiOperationType } from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { EmbeddingRequest } from "../../embedding-request";
import { EmbeddingModelObservationContext } from "../embedding-model-observation-context";

describe("EmbeddingModelObservationContext", () => {
  it("sets embedding operation metadata", () => {
    const request = new EmbeddingRequest(["test input"]);
    const context = new EmbeddingModelObservationContext(
      request,
      "test-provider",
    );

    expect(context.operationMetadata.operationType).toBe(
      AiOperationType.EMBEDDING.value,
    );
    expect(context.operationMetadata.provider).toBe("test-provider");
  });

  it("allows request with default options", () => {
    const request = new EmbeddingRequest(["test input"]);

    const context = new EmbeddingModelObservationContext(
      request,
      "test-provider",
    );

    expect(context.request.options).toBeDefined();
  });
});
