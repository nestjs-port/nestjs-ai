/**
 * Collection of attribute keys used in vector store observations (spans, metrics, events).
 * Based on the OpenTelemetry Semantic Conventions for Vector Databases.
 *
 * @see {@link https://github.com/open-telemetry/semantic-conventions/tree/main/docs/database | DB Semantic Conventions}
 */
export class VectorStoreObservationAttributes {
  /**
   * The name of a collection (table, container) within the database.
   */
  static readonly DB_COLLECTION_NAME = new VectorStoreObservationAttributes(
    "db.collection.name",
  );

  /**
   * The name of the database, fully qualified within the server address and port.
   */
  static readonly DB_NAMESPACE = new VectorStoreObservationAttributes(
    "db.namespace",
  );

  /**
   * The name of the operation or command being executed.
   */
  static readonly DB_OPERATION_NAME = new VectorStoreObservationAttributes(
    "db.operation.name",
  );

  /**
   * The record identifier if present.
   */
  static readonly DB_RECORD_ID = new VectorStoreObservationAttributes(
    "db.record.id",
  );

  /**
   * The database management system (DBMS) product as identified by the client instrumentation.
   */
  static readonly DB_SYSTEM = new VectorStoreObservationAttributes("db.system");

  /**
   * The metric used in similarity search.
   */
  static readonly DB_SEARCH_SIMILARITY_METRIC =
    new VectorStoreObservationAttributes("db.search.similarity_metric");

  /**
   * The dimension of the vector.
   */
  static readonly DB_VECTOR_DIMENSION_COUNT =
    new VectorStoreObservationAttributes("db.vector.dimension_count");

  /**
   * The name field as of the vector (e.g. a field name).
   */
  static readonly DB_VECTOR_FIELD_NAME = new VectorStoreObservationAttributes(
    "db.vector.field_name",
  );

  /**
   * The content of the search query being executed.
   */
  static readonly DB_VECTOR_QUERY_CONTENT =
    new VectorStoreObservationAttributes("db.vector.query.content");

  /**
   * The metadata filters used in the search query.
   */
  static readonly DB_VECTOR_QUERY_FILTER = new VectorStoreObservationAttributes(
    "db.vector.query.filter",
  );

  /**
   * Returned documents from a similarity search query.
   */
  static readonly DB_VECTOR_QUERY_RESPONSE_DOCUMENTS =
    new VectorStoreObservationAttributes("db.vector.query.response.documents");

  /**
   * Similarity threshold that accepts all search scores. A threshold value of 0.0
   * means any similarity is accepted or disable the similarity threshold filtering.
   * A threshold value of 1.0 means an exact match is required.
   */
  static readonly DB_VECTOR_QUERY_SIMILARITY_THRESHOLD =
    new VectorStoreObservationAttributes(
      "db.vector.query.similarity_threshold",
    );

  /**
   * The top-k most similar vectors returned by a query.
   */
  static readonly DB_VECTOR_QUERY_TOP_K = new VectorStoreObservationAttributes(
    "db.vector.query.top_k",
  );

  private constructor(private readonly _value: string) {}

  /**
   * Return the string value of the attribute.
   * @returns the string value of the attribute
   */
  get value(): string {
    return this._value;
  }
}
