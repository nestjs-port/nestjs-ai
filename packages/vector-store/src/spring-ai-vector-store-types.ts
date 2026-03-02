export abstract class SpringAIVectorStoreTypes {
  static readonly VECTOR_STORE_PREFIX = "spring.ai.vectorstore";
  static readonly TYPE = `${SpringAIVectorStoreTypes.VECTOR_STORE_PREFIX}.type`;

  static readonly AZURE = "azure";
  static readonly AZURE_COSMOS_DB = "azure-cosmos-db";
  static readonly CASSANDRA = "cassandra";
  static readonly CHROMA = "chroma";
  static readonly ELASTICSEARCH = "elasticsearch";
  static readonly GEMFIRE = "gemfire";
  static readonly HANADB = "hanadb";
  static readonly INFINISPAN = "infinispan";
  static readonly MARIADB = "mariadb";
  static readonly MILVUS = "milvus";
  static readonly MONGODB_ATLAS = "mongodb-atlas";
  static readonly NEO4J = "neo4j";
  static readonly OPENSEARCH = "opensearch";
  static readonly ORACLE = "oracle";
  static readonly PGVECTOR = "pgvector";
  static readonly PINECONE = "pinecone";
  static readonly QDRANT = "qdrant";
  static readonly REDIS = "redis";
  static readonly TYPESENSE = "typesense";
  static readonly WEAVIATE = "weaviate";
  static readonly BEDROCK_KNOWLEDGE_BASE = "bedrock-knowledge-base";
  static readonly S3 = "S3";
}
