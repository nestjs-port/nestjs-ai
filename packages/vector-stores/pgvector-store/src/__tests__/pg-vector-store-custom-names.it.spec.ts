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

import { DataSource } from "typeorm";
import {
  OpenAiEmbeddingModel,
  OpenAiEmbeddingOptions,
} from "@nestjs-ai/model-openai";
import { JsdbcTemplate } from "@nestjs-port/jsdbc";
import { TypeOrmDataSource } from "@nestjs-port/jsdbc/typeorm";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "@nestjs-port/jsdbc";

import {
  PgDistanceType,
  PgIndexType,
  PgVectorStore,
} from "../pg-vector-store.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)("PgVectorStoreCustomNamesIT", () => {
  const DEFAULT_SCHEMA_NAME = "public";
  const DEFAULT_TABLE_NAME = "vector_store";
  const DEFAULT_EMBEDDING_DIMENSIONS = 768;

  let postgresContainer: StartedPostgreSqlContainer;
  let typeormDataSource: DataSource;
  let jsdbcTemplate: JsdbcTemplate;
  let embeddingModel: OpenAiEmbeddingModel;

  beforeAll(async () => {
    postgresContainer = await new PostgreSqlContainer("pgvector/pgvector:pg17")
      .withDatabase("postgres")
      .withUsername("postgres")
      .withPassword("postgres")
      .start();

    typeormDataSource = new DataSource({
      type: "postgres",
      url: postgresContainer.getConnectionUri(),
      synchronize: false,
      logging: false,
    });
    await typeormDataSource.initialize();

    jsdbcTemplate = new JsdbcTemplate(new TypeOrmDataSource(typeormDataSource));
    embeddingModel = new OpenAiEmbeddingModel({
      options: OpenAiEmbeddingOptions.builder()
        .apiKey(OPENAI_API_KEY ?? "")
        .model(OpenAiEmbeddingOptions.DEFAULT_EMBEDDING_MODEL)
        .build(),
    });
  }, 240_000);

  afterAll(async () => {
    await typeormDataSource?.destroy();
    await postgresContainer?.stop();
  }, 60_000);

  it("create default table and index if not present in config", async () => {
    const store = createPgVectorStore({
      schemaValidation: false,
    });

    try {
      await store.onModuleInit();

      expect(await isTableExists(DEFAULT_SCHEMA_NAME, DEFAULT_TABLE_NAME)).toBe(
        true,
      );
      expect(await isSchemaExists(DEFAULT_SCHEMA_NAME)).toBe(true);
    } finally {
      await dropTableByName(DEFAULT_SCHEMA_NAME, DEFAULT_TABLE_NAME);
    }
  });

  it("create table and index if not present in database", async () => {
    const tableName = "new_vector_table";
    const store = createPgVectorStore({
      tableName,
    });

    try {
      await store.onModuleInit();

      expect(await isTableExists(DEFAULT_SCHEMA_NAME, tableName)).toBe(true);
      expect(
        await isIndexExists(
          DEFAULT_SCHEMA_NAME,
          tableName,
          `${tableName}_index`,
        ),
      ).toBe(true);
      expect(await isTableExists(DEFAULT_SCHEMA_NAME, DEFAULT_TABLE_NAME)).toBe(
        false,
      );
    } finally {
      await dropTableByName(DEFAULT_SCHEMA_NAME, tableName);
    }
  });

  it("fail when custom table is absent and validation enabled", async () => {
    const tableName = "customvectortable";
    const store = createPgVectorStore({
      tableName,
      schemaValidation: true,
    });

    await expect(store.onModuleInit()).rejects.toThrow(
      `${tableName} does not exist`,
    );
  });

  it("fail on sql injection attempt in table name", async () => {
    const tableName = "users; DROP TABLE users;";
    const store = createPgVectorStore({
      tableName,
      schemaValidation: true,
    });

    await expect(store.onModuleInit()).rejects.toThrow(
      "Table name should only contain alphanumeric characters and underscores",
    );
  });

  it("fail on sql injection attempt in schema name", async () => {
    const tableName = "customvectortable";
    const schemaName = "public; DROP TABLE users;";
    const store = createPgVectorStore({
      tableName,
      schemaName,
      schemaValidation: true,
    });

    await expect(store.onModuleInit()).rejects.toThrow(
      "Schema name should only contain alphanumeric characters and underscores",
    );
  });

  function createPgVectorStore(options: {
    tableName?: string;
    schemaName?: string;
    schemaValidation?: boolean;
  }): PgVectorStore {
    return PgVectorStore.builder(jsdbcTemplate, embeddingModel)
      .schemaName(options.schemaName ?? DEFAULT_SCHEMA_NAME)
      .vectorTableName(options.tableName ?? "")
      .vectorTableValidationsEnabled(options.schemaValidation ?? false)
      .dimensions(DEFAULT_EMBEDDING_DIMENSIONS)
      .distanceType(PgDistanceType.COSINE_DISTANCE)
      .removeExistingVectorStoreTable(true)
      .indexType(PgIndexType.HNSW)
      .initializeSchema(true)
      .build();
  }

  async function dropTableByName(
    schemaName: string,
    tableName: string,
  ): Promise<void> {
    await jsdbcTemplate.update(
      sql`DROP TABLE IF EXISTS ${() => `${schemaName}.${tableName}`}`,
    );
  }

  async function isIndexExists(
    schemaName: string,
    tableName: string,
    indexName: string,
  ): Promise<boolean> {
    const rows = await jsdbcTemplate.queryForList(
      sql`SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = ${schemaName}
          AND tablename = ${tableName}
          AND indexname = ${indexName}
      ) AS exists_flag`,
    );
    return Boolean(rows[0]?.exists_flag);
  }

  async function isTableExists(
    schemaName: string,
    tableName: string,
  ): Promise<boolean> {
    const rows = await jsdbcTemplate.queryForList(
      sql`SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = ${schemaName}
          AND table_name = ${tableName}
      ) AS exists_flag`,
    );
    return Boolean(rows[0]?.exists_flag);
  }

  async function isSchemaExists(schemaName: string): Promise<boolean> {
    const rows = await jsdbcTemplate.queryForList(
      sql`SELECT EXISTS (
        SELECT FROM information_schema.schemata
        WHERE schema_name = ${schemaName}
      ) AS exists_flag`,
    );
    return Boolean(rows[0]?.exists_flag);
  }
});
