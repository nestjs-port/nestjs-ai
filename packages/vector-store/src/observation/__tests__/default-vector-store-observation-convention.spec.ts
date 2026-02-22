import {
  KeyValue,
  ObservationContext,
  SpringAiKind,
  VectorStoreObservationAttributes,
} from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { SearchRequest } from "../../search-request";
import { DefaultVectorStoreObservationConvention } from "../default-vector-store-observation-convention";
import { VectorStoreObservationContext } from "../vector-store-observation-context";

describe("DefaultVectorStoreObservationConvention", () => {
  const observationConvention = new DefaultVectorStoreObservationConvention();

  it("should have name", () => {
    expect(observationConvention.getName()).toBe(
      DefaultVectorStoreObservationConvention.DEFAULT_NAME,
    );
  });

  it("should have contextual name", () => {
    const observationContext = new VectorStoreObservationContext({
      databaseSystem: "my-database",
      operationName: VectorStoreObservationContext.Operation.QUERY,
    });
    expect(observationConvention.getContextualName(observationContext)).toBe(
      "my-database query",
    );
  });

  it("supports only vector store observation context", () => {
    const observationContext = new VectorStoreObservationContext({
      databaseSystem: "my-database",
      operationName: VectorStoreObservationContext.Operation.QUERY,
    });
    expect(observationConvention.supportsContext(observationContext)).toBe(
      true,
    );
    expect(
      observationConvention.supportsContext(new ObservationContext()),
    ).toBe(false);
  });

  it("should have required key values", () => {
    const observationContext = new VectorStoreObservationContext({
      databaseSystem: "my_database",
      operationName: VectorStoreObservationContext.Operation.QUERY,
    });

    const keyValues = observationConvention
      .getLowCardinalityKeyValues(observationContext)
      .toArray();

    expect(keyValues).toContainEqual(
      KeyValue.of("spring.ai.kind", SpringAiKind.VECTOR_STORE.value),
    );
    expect(keyValues).toContainEqual(
      KeyValue.of(
        VectorStoreObservationAttributes.DB_OPERATION_NAME.value,
        "query",
      ),
    );
    expect(keyValues).toContainEqual(
      KeyValue.of(
        VectorStoreObservationAttributes.DB_SYSTEM.value,
        "my_database",
      ),
    );
  });

  it("should have optional key values", () => {
    const queryRequest = SearchRequest.builder()
      .query("VDB QUERY")
      .filterExpression("country == 'UK' && year >= 2020")
      .build();

    const observationContext = new VectorStoreObservationContext({
      databaseSystem: "my-database",
      operationName: VectorStoreObservationContext.Operation.QUERY,
      collectionName: "COLLECTION_NAME",
      dimensions: 696,
      fieldName: "FIELD_NAME",
      namespace: "NAMESPACE",
      similarityMetric: "SIMILARITY_METRIC",
      queryRequest,
    });

    const lowCardinalityKeyValues = observationConvention
      .getLowCardinalityKeyValues(observationContext)
      .toArray();
    const highCardinalityKeyValues = observationConvention
      .getHighCardinalityKeyValues(observationContext)
      .toArray();

    expect(lowCardinalityKeyValues).toContainEqual(
      KeyValue.of(
        VectorStoreObservationAttributes.DB_OPERATION_NAME.value,
        VectorStoreObservationContext.Operation.QUERY.value,
      ),
    );

    expect(highCardinalityKeyValues).toContainEqual(
      KeyValue.of(
        VectorStoreObservationAttributes.DB_COLLECTION_NAME.value,
        "COLLECTION_NAME",
      ),
    );
    expect(highCardinalityKeyValues).toContainEqual(
      KeyValue.of(
        VectorStoreObservationAttributes.DB_VECTOR_DIMENSION_COUNT.value,
        "696",
      ),
    );
    expect(highCardinalityKeyValues).toContainEqual(
      KeyValue.of(
        VectorStoreObservationAttributes.DB_VECTOR_FIELD_NAME.value,
        "FIELD_NAME",
      ),
    );
    expect(highCardinalityKeyValues).toContainEqual(
      KeyValue.of(
        VectorStoreObservationAttributes.DB_NAMESPACE.value,
        "NAMESPACE",
      ),
    );
    expect(highCardinalityKeyValues).toContainEqual(
      KeyValue.of(
        VectorStoreObservationAttributes.DB_SEARCH_SIMILARITY_METRIC.value,
        "SIMILARITY_METRIC",
      ),
    );
    expect(highCardinalityKeyValues).toContainEqual(
      KeyValue.of(
        VectorStoreObservationAttributes.DB_VECTOR_QUERY_CONTENT.value,
        "VDB QUERY",
      ),
    );
    expect(highCardinalityKeyValues).toContainEqual(
      KeyValue.of(
        VectorStoreObservationAttributes.DB_VECTOR_QUERY_FILTER.value,
        String(queryRequest.filterExpression),
      ),
    );
  });

  it("should not have key values when missing", () => {
    const observationContext = new VectorStoreObservationContext({
      databaseSystem: "my-database",
      operationName: VectorStoreObservationContext.Operation.QUERY,
    });

    const highCardinalityKeys = observationConvention
      .getHighCardinalityKeyValues(observationContext)
      .toArray()
      .map((keyValue) => keyValue.key);

    expect(highCardinalityKeys).not.toContain(
      VectorStoreObservationAttributes.DB_COLLECTION_NAME.value,
    );
    expect(highCardinalityKeys).not.toContain(
      VectorStoreObservationAttributes.DB_VECTOR_DIMENSION_COUNT.value,
    );
    expect(highCardinalityKeys).not.toContain(
      VectorStoreObservationAttributes.DB_VECTOR_FIELD_NAME.value,
    );
    expect(highCardinalityKeys).not.toContain(
      VectorStoreObservationAttributes.DB_NAMESPACE.value,
    );
    expect(highCardinalityKeys).not.toContain(
      VectorStoreObservationAttributes.DB_SEARCH_SIMILARITY_METRIC.value,
    );
    expect(highCardinalityKeys).not.toContain(
      VectorStoreObservationAttributes.DB_VECTOR_QUERY_CONTENT.value,
    );
    expect(highCardinalityKeys).not.toContain(
      VectorStoreObservationAttributes.DB_VECTOR_QUERY_FILTER.value,
    );
  });
});
