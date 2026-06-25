/*
 * Copyright 2026-present the original author or authors.
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

import { Module } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { EMBEDDING_MODEL_TOKEN, VECTOR_STORE_TOKEN } from "@nestjs-ai/commons";
import {
  type MariaDBVectorStoreProperties,
  MariaDBVectorStoreModule,
  MariaDBDistanceType,
  type MariaDBVectorStore,
} from "@nestjs-ai/vector-store-mariadb";
import { JSDBC_TEMPLATE, JsdbcTemplate, sql } from "@nestjs-port/jsdbc";
import { TypeOrmDataSource } from "@nestjs-port/jsdbc/typeorm";
import {
  MariaDbContainer,
  type StartedMariaDbContainer,
} from "@testcontainers/mariadb";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const schemaName = "testdb";

describe("MariaDBStoreCustomNamesIT", () => {
  const defaultTableName = "vector_store";

  let mariaDbContainer: StartedMariaDbContainer;
  let typeormDataSource: DataSource;
  let jsdbcTemplate: JsdbcTemplate;
  let embeddingModel: {
    embed: ReturnType<typeof vi.fn>;
    dimensions: ReturnType<typeof vi.fn>;
  };

  beforeAll(async () => {
    mariaDbContainer = await new MariaDbContainer("mariadb:11.7-rc")
      .withDatabase(schemaName)
      .withUsername("mariadb")
      .withUserPassword("mariadbpwd")
      .withRootPassword("mariadbpwd")
      .start();

    typeormDataSource = new DataSource({
      type: "mariadb",
      url: mariaDbContainer.getConnectionUri(),
      synchronize: false,
      logging: false,
    });
    await typeormDataSource.initialize();

    jsdbcTemplate = new JsdbcTemplate(new TypeOrmDataSource(typeormDataSource));
    embeddingModel = createMockEmbeddingModel();
  }, 240_000);

  afterAll(async () => {
    await typeormDataSource?.destroy();
    await mariaDbContainer?.stop();
  }, 60_000);

  it("should create default table and index if not present in config", async () => {
    const { moduleRef, vectorStore } = await createVectorStore({
      schemaValidation: false,
      initializeSchema: true,
      removeExistingVectorStoreTable: true,
      dimensions: 1536,
      distanceType: MariaDBDistanceType.COSINE,
    });

    try {
      await vectorStore.onModuleInit();

      expect(await isTableExists(schemaName, defaultTableName)).toBe(true);
      expect(await isSchemaExists(schemaName)).toBe(true);
    } finally {
      await dropTableByName(schemaName, defaultTableName);
      await moduleRef.close();
    }
  });

  it("should create table and index if not present in database", async () => {
    const tableName = "new_vector_table";
    const { moduleRef, vectorStore } = await createVectorStore({
      tableName,
      initializeSchema: true,
      removeExistingVectorStoreTable: true,
      dimensions: 1536,
      distanceType: MariaDBDistanceType.COSINE,
    });

    try {
      await vectorStore.onModuleInit();

      expect(await isTableExists(schemaName, tableName)).toBe(true);
      expect(
        await isIndexExists(schemaName, tableName, `${tableName}_embedding`),
      ).toBe(true);
      expect(await isTableExists(schemaName, defaultTableName)).toBe(false);
    } finally {
      await dropTableByName(schemaName, tableName);
      await moduleRef.close();
    }
  });

  it("should create specific table and index if not present in database", async () => {
    const tableName = "new_vector_table2";
    const contentFieldName = "content2";
    const embeddingFieldName = "embedding2";
    const idFieldName = "id2";
    const metadataFieldName = "metadata2";

    const { moduleRef, vectorStore } = await createVectorStore({
      tableName,
      initializeSchema: true,
      removeExistingVectorStoreTable: true,
      dimensions: 1536,
      distanceType: MariaDBDistanceType.COSINE,
      contentFieldName,
      embeddingFieldName,
      idFieldName,
      metadataFieldName,
    });

    try {
      await vectorStore.onModuleInit();

      expect(await isTableExists(schemaName, tableName)).toBe(true);
      expect(
        await isIndexExists(schemaName, tableName, `${tableName}_embedding2`),
      ).toBe(true);
      expect(await isTableExists(schemaName, defaultTableName)).toBe(false);
      expect(await getColumnNames(schemaName, tableName)).toEqual(
        expect.arrayContaining([
          contentFieldName,
          embeddingFieldName,
          idFieldName,
          metadataFieldName,
        ]),
      );
    } finally {
      await dropTableByName(schemaName, tableName);
      await moduleRef.close();
    }
  });

  it("should fail when custom table is absent and validation enabled", async () => {
    const tableName = "customvectortable";
    const { moduleRef, vectorStore } = await createVectorStore({
      tableName,
      schemaName,
      initializeSchema: true,
      removeExistingVectorStoreTable: true,
      schemaValidation: true,
      dimensions: 1536,
      distanceType: MariaDBDistanceType.COSINE,
    });

    try {
      await expect(vectorStore.onModuleInit()).rejects.toThrow(
        `Table '${tableName}' does not exist in schema '${schemaName}'`,
      );
    } finally {
      await moduleRef.close();
    }
  });

  it("should fail on SQL injection attempt in table name", async () => {
    const tableName = "users; DROP TABLE users;";
    await expect(
      createVectorStore({
        tableName,
        schemaName,
        initializeSchema: true,
        removeExistingVectorStoreTable: true,
        schemaValidation: true,
        dimensions: 1536,
        distanceType: MariaDBDistanceType.COSINE,
      }),
    ).rejects.toThrow(
      "Identifier 'users; DROP TABLE users;' should only contain alphanumeric characters and underscores",
    );
  });

  it("should fail on SQL injection attempt in schema name", async () => {
    const tableName = "customvectortable";
    const injectedSchemaName = "public; DROP TABLE users;";
    await expect(
      createVectorStore({
        tableName,
        schemaName: injectedSchemaName,
        initializeSchema: true,
        removeExistingVectorStoreTable: true,
        schemaValidation: true,
        dimensions: 1536,
        distanceType: MariaDBDistanceType.COSINE,
      }),
    ).rejects.toThrow(
      "Identifier 'public; DROP TABLE users;' should only contain alphanumeric characters and underscores",
    );
  });

  async function createVectorStore(
    properties: MariaDBVectorStoreProperties,
  ): Promise<{
    moduleRef: TestingModule;
    vectorStore: MariaDBVectorStore;
  }> {
    const featureModule = MariaDBVectorStoreModule.forFeature(properties, {
      imports: [createDependencyModule()],
    });

    const moduleRef = await Test.createTestingModule({
      imports: [featureModule],
    }).compile();

    const vectorStore = (await moduleRef.resolve(
      VECTOR_STORE_TOKEN,
    )) as MariaDBVectorStore;

    return { moduleRef, vectorStore };
  }

  function createDependencyModule() {
    @Module({
      providers: [
        {
          provide: EMBEDDING_MODEL_TOKEN,
          useValue: embeddingModel,
        },
        {
          provide: JSDBC_TEMPLATE,
          useValue: jsdbcTemplate,
        },
      ],
      exports: [EMBEDDING_MODEL_TOKEN, JSDBC_TEMPLATE],
    })
    class DependencyModule {}

    return DependencyModule;
  }

  function createMockEmbeddingModel() {
    return {
      embed: vi.fn(async (_input: string) => [0, 1]),
      dimensions: vi.fn(async () => 1536),
    };
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
					SELECT 1 FROM information_schema.statistics
					WHERE TABLE_SCHEMA = ${schemaName}
						AND TABLE_NAME = ${tableName}
						AND INDEX_NAME = ${indexName}
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
				SELECT 1 FROM information_schema.tables
				WHERE table_schema = ${schemaName}
					AND table_name = ${tableName}
			) AS exists_flag`,
    );

    return Boolean(rows[0]?.exists_flag);
  }

  async function isSchemaExists(schemaName: string): Promise<boolean> {
    const rows = await jsdbcTemplate.queryForList(
      sql`SELECT EXISTS (
				SELECT 1 FROM information_schema.schemata
				WHERE schema_name = ${schemaName}
			) AS exists_flag`,
    );

    return Boolean(rows[0]?.exists_flag);
  }

  async function getColumnNames(
    schemaName: string,
    tableName: string,
  ): Promise<string[]> {
    const rows = await jsdbcTemplate.queryForList(
      sql`SELECT column_name
				FROM information_schema.columns
				WHERE table_schema = ${schemaName}
					AND table_name = ${tableName}`,
    );

    return rows.map((row) => String(row.column_name));
  }
});
