import assert from "node:assert/strict";
import {
  type Document,
  ObservationContext,
  StringUtils,
} from "@nestjs-ai/commons";
import type { SearchRequest } from "../search-request";

export class VectorStoreObservationContext extends ObservationContext {
  private readonly _databaseSystem: string;
  private readonly _operationName: string;
  private _collectionName: string | null = null;
  private _dimensions: number | null = null;
  private _fieldName: string | null = null;
  private _namespace: string | null = null;
  private _similarityMetric: string | null = null;
  private _queryRequest: SearchRequest | null = null;
  private _queryResponse: Document[] | null = null;

  constructor(databaseSystem: string, operationName: string) {
    super();
    assert(
      StringUtils.hasText(databaseSystem),
      "databaseSystem cannot be null or empty",
    );
    assert(
      StringUtils.hasText(operationName),
      "operationName cannot be null or empty",
    );
    this._databaseSystem = databaseSystem;
    this._operationName = operationName;
  }

  static builder(
    databaseSystem: string,
    operationName: string,
  ): VectorStoreObservationContextBuilder;
  static builder(
    databaseSystem: string,
    operation: VectorStoreObservationContextOperation,
  ): VectorStoreObservationContextBuilder;
  static builder(
    databaseSystem: string,
    operationNameOrOperation: string | VectorStoreObservationContextOperation,
  ): VectorStoreObservationContextBuilder {
    const operationName =
      operationNameOrOperation instanceof VectorStoreObservationContextOperation
        ? operationNameOrOperation.value
        : operationNameOrOperation;
    return new VectorStoreObservationContextBuilder(
      databaseSystem,
      operationName,
    );
  }

  get databaseSystem(): string {
    return this._databaseSystem;
  }

  get operationName(): string {
    return this._operationName;
  }

  get collectionName(): string | null {
    return this._collectionName;
  }

  set collectionName(collectionName: string | null) {
    this._collectionName = collectionName;
  }

  get dimensions(): number | null {
    return this._dimensions;
  }

  set dimensions(dimensions: number | null) {
    this._dimensions = dimensions;
  }

  get fieldName(): string | null {
    return this._fieldName;
  }

  set fieldName(fieldName: string | null) {
    this._fieldName = fieldName;
  }

  get namespace(): string | null {
    return this._namespace;
  }

  set namespace(namespace: string | null) {
    this._namespace = namespace;
  }

  get similarityMetric(): string | null {
    return this._similarityMetric;
  }

  set similarityMetric(similarityMetric: string | null) {
    this._similarityMetric = similarityMetric;
  }

  get queryRequest(): SearchRequest | null {
    return this._queryRequest;
  }

  set queryRequest(queryRequest: SearchRequest | null) {
    this._queryRequest = queryRequest;
  }

  get queryResponse(): Document[] | null {
    return this._queryResponse;
  }

  set queryResponse(queryResponse: Document[] | null) {
    this._queryResponse = queryResponse;
  }
}

export class VectorStoreObservationContextOperation {
  static readonly ADD = new VectorStoreObservationContextOperation("add");
  static readonly DELETE = new VectorStoreObservationContextOperation("delete");
  static readonly QUERY = new VectorStoreObservationContextOperation("query");

  private constructor(private readonly _value: string) {}

  get value(): string {
    return this._value;
  }
}

export class VectorStoreObservationContextBuilder {
  private readonly _context: VectorStoreObservationContext;

  constructor(databaseSystem: string, operationName: string) {
    this._context = new VectorStoreObservationContext(
      databaseSystem,
      operationName,
    );
  }

  collectionName(collectionName: string): this {
    this._context.collectionName = collectionName;
    return this;
  }

  dimensions(dimensions: number): this {
    this._context.dimensions = dimensions;
    return this;
  }

  fieldName(fieldName: string | null): this {
    this._context.fieldName = fieldName;
    return this;
  }

  namespace(namespace: string): this {
    this._context.namespace = namespace;
    return this;
  }

  queryRequest(request: SearchRequest): this {
    this._context.queryRequest = request;
    return this;
  }

  queryResponse(documents: Document[]): this {
    this._context.queryResponse = documents;
    return this;
  }

  similarityMetric(similarityMetric: string): this {
    this._context.similarityMetric = similarityMetric;
    return this;
  }

  build(): VectorStoreObservationContext {
    return this._context;
  }
}
