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
  Document,
  LoggerFactory,
  ObservationContext,
} from "@nestjs-ai/commons";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VectorStoreObservationContext } from "../vector-store-observation-context";
import { VectorStoreQueryResponseObservationHandler } from "../vector-store-query-response-observation-handler";

describe("VectorStoreQueryResponseObservationHandler", () => {
  let infoMock: (message: string, ...args: unknown[]) => void;

  beforeEach(() => {
    infoMock = vi.fn<(message: string, ...args: unknown[]) => void>();
    vi.spyOn(LoggerFactory, "getLogger").mockReturnValue({
      name: "VectorStoreQueryResponseObservationHandler",
      info: infoMock,
      warn: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      error: vi.fn(),
      isDebugEnabled: () => false,
      isTraceEnabled: () => false,
      isInfoEnabled: () => true,
      isWarnEnabled: () => true,
      isErrorEnabled: () => true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createContext(
    queryResponse: Document[] | null = null,
  ): VectorStoreObservationContext {
    return new VectorStoreObservationContext({
      databaseSystem: "db",
      operationName: VectorStoreObservationContext.Operation.ADD,
      queryResponse,
    });
  }

  it("when not supported observation context then return false", () => {
    const observationHandler = new VectorStoreQueryResponseObservationHandler();
    const context = new ObservationContext();

    expect(observationHandler.supportsContext(context)).toBe(false);
  });

  it("when supported observation context then return true", () => {
    const observationHandler = new VectorStoreQueryResponseObservationHandler();
    const context = createContext();

    expect(observationHandler.supportsContext(context)).toBe(true);
  });

  it("when empty query response then output nothing", () => {
    const observationHandler = new VectorStoreQueryResponseObservationHandler();
    const context = createContext();

    observationHandler.onStop(context);

    expect(infoMock).toHaveBeenCalledWith("Vector Store Query Response:\n[]");
  });

  it("when non-empty query response then output it", () => {
    const observationHandler = new VectorStoreQueryResponseObservationHandler();
    const context = createContext([new Document("doc1"), new Document("doc2")]);

    observationHandler.onStop(context);

    expect(infoMock).toHaveBeenCalledWith(
      'Vector Store Query Response:\n["doc1", "doc2"]',
    );
  });
});
