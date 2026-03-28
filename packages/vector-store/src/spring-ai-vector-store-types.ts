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
