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

import { describe, expect, it } from "vitest";
import { AiOperationMetadata } from "../ai-operation-metadata";

describe("AiOperationMetadata", () => {
  it("when mandatory metadata then return", () => {
    const operationMetadata = new AiOperationMetadata("chat", "doofenshmirtz");

    expect(operationMetadata).toBeDefined();
  });

  it("when operation type is null then throw", () => {
    expect(
      () => new AiOperationMetadata(null as unknown as string, "doofenshmirtz"),
    ).toThrow("operationType cannot be null or empty");
  });

  it("when operation type is empty then throw", () => {
    expect(() => new AiOperationMetadata("", "doofenshmirtz")).toThrow(
      "operationType cannot be null or empty",
    );
  });

  it("when provider is null then throw", () => {
    expect(
      () => new AiOperationMetadata("chat", null as unknown as string),
    ).toThrow("provider cannot be null or empty");
  });

  it("when provider is empty then throw", () => {
    expect(() => new AiOperationMetadata("chat", "")).toThrow(
      "provider cannot be null or empty",
    );
  });

  it("when operation type is blank then throw", () => {
    expect(() => new AiOperationMetadata("   ", "doofenshmirtz")).toThrow(
      "operationType cannot be null or empty",
    );
  });

  it("when provider is blank then throw", () => {
    expect(() => new AiOperationMetadata("chat", "   ")).toThrow(
      "provider cannot be null or empty",
    );
  });

  it("when built with valid values then fields are accessible", () => {
    const operationMetadata = new AiOperationMetadata("chat", "openai");

    expect(operationMetadata.operationType).toBe("chat");
    expect(operationMetadata.provider).toBe("openai");
  });
});
