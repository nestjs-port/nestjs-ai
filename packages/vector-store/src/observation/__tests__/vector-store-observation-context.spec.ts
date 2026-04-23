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
import { VectorStoreObservationContext } from "../vector-store-observation-context.js";

describe("VectorStoreObservationContext", () => {
  it("when mandatory fields then return", () => {
    const observationContext = new VectorStoreObservationContext({
      databaseSystem: "db",
      operationName: VectorStoreObservationContext.Operation.ADD,
    });
    expect(observationContext).toBeDefined();
  });

  it("when db system is null then throw", () => {
    expect(
      () =>
        new VectorStoreObservationContext({
          databaseSystem: null as unknown as string,
          operationName: "delete",
        }),
    ).toThrowError(/databaseSystem cannot be null or empty/);
  });

  it("when operation name is null then throw", () => {
    expect(
      () =>
        new VectorStoreObservationContext({
          databaseSystem: "Db",
          operationName: "",
        }),
    ).toThrowError(/operationName cannot be null or empty/);
  });

  it("when empty db system then throw", () => {
    expect(
      () =>
        new VectorStoreObservationContext({
          databaseSystem: "",
          operationName: VectorStoreObservationContext.Operation.ADD,
        }),
    ).toThrowError(/databaseSystem cannot be null or empty/);
  });

  it("when whitespace db system then throw", () => {
    expect(
      () =>
        new VectorStoreObservationContext({
          databaseSystem: "   ",
          operationName: VectorStoreObservationContext.Operation.ADD,
        }),
    ).toThrowError(/databaseSystem cannot be null or empty/);
  });

  it("when string operation name used then correct value", () => {
    const observationContext = new VectorStoreObservationContext({
      databaseSystem: "testdb",
      operationName: "custom_operation",
    });
    expect(observationContext.databaseSystem).toBe("testdb");
    expect(observationContext.operationName).toBe("custom_operation");
  });

  it("when collection name provided then set", () => {
    const observationContext = new VectorStoreObservationContext({
      databaseSystem: "db",
      operationName: VectorStoreObservationContext.Operation.ADD,
      collectionName: "documents",
    });
    expect(observationContext.collectionName).toBe("documents");
  });

  it("when no collection name provided then null", () => {
    const observationContext = new VectorStoreObservationContext({
      databaseSystem: "db",
      operationName: VectorStoreObservationContext.Operation.ADD,
    });
    expect(observationContext.collectionName).toBeNull();
  });

  it("when no dimensions provided then null", () => {
    const observationContext = new VectorStoreObservationContext({
      databaseSystem: "db",
      operationName: VectorStoreObservationContext.Operation.QUERY,
    });
    expect(observationContext.dimensions).toBeNull();
  });

  it("when field name provided then set", () => {
    const observationContext = new VectorStoreObservationContext({
      databaseSystem: "db",
      operationName: VectorStoreObservationContext.Operation.QUERY,
      fieldName: "embedding_vector",
    });
    expect(observationContext.fieldName).toBe("embedding_vector");
  });

  it("when namespace provided then set", () => {
    const observationContext = new VectorStoreObservationContext({
      databaseSystem: "db",
      operationName: VectorStoreObservationContext.Operation.ADD,
      namespace: "production",
    });
    expect(observationContext.namespace).toBe("production");
  });

  it("when similarity metric provided then set", () => {
    const observationContext = new VectorStoreObservationContext({
      databaseSystem: "db",
      operationName: VectorStoreObservationContext.Operation.QUERY,
      similarityMetric: "cosine",
    });
    expect(observationContext.similarityMetric).toBe("cosine");
  });

  it("when empty collection name then set", () => {
    const observationContext = new VectorStoreObservationContext({
      databaseSystem: "db",
      operationName: VectorStoreObservationContext.Operation.ADD,
      collectionName: "",
    });
    expect(observationContext.collectionName).toBe("");
  });
});
