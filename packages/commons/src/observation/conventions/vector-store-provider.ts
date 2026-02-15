/**
 * Collection of systems providing vector store functionality.
 * Based on the OpenTelemetry Semantic Conventions for Vector Databases.
 *
 * @see {@link https://github.com/open-telemetry/semantic-conventions/tree/main/docs/database | DB Semantic Conventions}
 */
export class VectorStoreProvider {
	/**
	 * Vector store provided by Azure.
	 */
	static readonly AZURE = new VectorStoreProvider("azure");

	/**
	 * Vector store provided by Cassandra.
	 */
	static readonly CASSANDRA = new VectorStoreProvider("cassandra");

	/**
	 * Vector store provided by Chroma.
	 */
	static readonly CHROMA = new VectorStoreProvider("chroma");

	/**
	 * Vector store provided by CosmosDB.
	 */
	static readonly COSMOSDB = new VectorStoreProvider("cosmosdb");

	/**
	 * Vector store provided by Couchbase.
	 */
	static readonly COUCHBASE = new VectorStoreProvider("couchbase");

	/**
	 * Vector store provided by Elasticsearch.
	 */
	static readonly ELASTICSEARCH = new VectorStoreProvider("elasticsearch");

	/**
	 * Vector store provided by GemFire.
	 */
	static readonly GEMFIRE = new VectorStoreProvider("gemfire");

	/**
	 * Vector store provided by HANA.
	 */
	static readonly HANA = new VectorStoreProvider("hana");

	/**
	 * Vector store provided by Infinispan.
	 */
	static readonly INFINISPAN = new VectorStoreProvider("infinispan");

	/**
	 * Vector store provided by MariaDB.
	 */
	static readonly MARIADB = new VectorStoreProvider("mariadb");

	/**
	 * Vector store provided by Milvus.
	 */
	static readonly MILVUS = new VectorStoreProvider("milvus");

	/**
	 * Vector store provided by MongoDB.
	 */
	static readonly MONGODB = new VectorStoreProvider("mongodb");

	/**
	 * Vector store provided by Neo4j.
	 */
	static readonly NEO4J = new VectorStoreProvider("neo4j");

	/**
	 * Vector store provided by OpenSearch.
	 */
	static readonly OPENSEARCH = new VectorStoreProvider("opensearch");

	/**
	 * Vector store provided by Oracle.
	 */
	static readonly ORACLE = new VectorStoreProvider("oracle");

	/**
	 * Vector store provided by PGVector.
	 */
	static readonly PG_VECTOR = new VectorStoreProvider("pg_vector");

	/**
	 * Vector store provided by Pinecone.
	 */
	static readonly PINECONE = new VectorStoreProvider("pinecone");

	/**
	 * Vector store provided by Qdrant.
	 */
	static readonly QDRANT = new VectorStoreProvider("qdrant");

	/**
	 * Vector store provided by Redis.
	 */
	static readonly REDIS = new VectorStoreProvider("redis");

	/**
	 * Vector store provided by S3Vector.
	 */
	static readonly S3_VECTOR = new VectorStoreProvider("s3_vector");

	/**
	 * Vector store provided by Simple.
	 */
	static readonly SIMPLE = new VectorStoreProvider("simple");

	/**
	 * Vector store provided by Typesense.
	 */
	static readonly TYPESENSE = new VectorStoreProvider("typesense");

	/**
	 * Vector store provided by Weaviate.
	 */
	static readonly WEAVIATE = new VectorStoreProvider("weaviate");

	private constructor(private readonly _value: string) {}

	/**
	 * Return the value of the vector store provider.
	 * @returns the value of the vector store provider
	 */
	get value(): string {
		return this._value;
	}
}
