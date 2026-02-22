import assert from "node:assert/strict";
import {
  type Document,
  ObservationContext,
  StringUtils,
} from "@nestjs-ai/commons";
import type { SearchRequest } from "../search-request";

export interface VectorStoreObservationContextProps {
  databaseSystem: string;
  operationName: string | VectorStoreObservationContext.Operation;
  collectionName?: string | null;
  dimensions?: number | null;
  fieldName?: string | null;
  namespace?: string | null;
  similarityMetric?: string | null;
  queryRequest?: SearchRequest | null;
  queryResponse?: Document[] | null;
}

export class VectorStoreObservationContext extends ObservationContext {
  readonly databaseSystem: string;
  readonly operationName: string;
  readonly collectionName: string | null;
  readonly dimensions: number | null;
  readonly fieldName: string | null;
  readonly namespace: string | null;
  readonly similarityMetric: string | null;
  readonly queryRequest: SearchRequest | null;
  readonly queryResponse: Document[] | null;

  constructor({
    databaseSystem,
    operationName,
    collectionName = null,
    dimensions = null,
    fieldName = null,
    namespace = null,
    similarityMetric = null,
    queryRequest = null,
    queryResponse = null,
  }: VectorStoreObservationContextProps) {
    super();
    assert(
      StringUtils.hasText(databaseSystem),
      "databaseSystem cannot be null or empty",
    );
    const resolvedOperationName =
      operationName instanceof VectorStoreObservationContext.Operation
        ? operationName.value
        : operationName;
    assert(
      StringUtils.hasText(resolvedOperationName),
      "operationName cannot be null or empty",
    );
    this.databaseSystem = databaseSystem;
    this.operationName = resolvedOperationName;
    this.collectionName = collectionName;
    this.dimensions = dimensions;
    this.fieldName = fieldName;
    this.namespace = namespace;
    this.similarityMetric = similarityMetric;
    this.queryRequest = queryRequest;
    this.queryResponse = queryResponse;
  }
}

export namespace VectorStoreObservationContext {
  export class Operation {
    static readonly ADD = new Operation("add");
    static readonly DELETE = new Operation("delete");
    static readonly QUERY = new Operation("query");

    private constructor(public readonly value: string) {}
  }
}
