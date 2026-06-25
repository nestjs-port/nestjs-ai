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

import { readFileSync } from "node:fs";

import { Module } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  Document,
  EMBEDDING_MODEL_TOKEN,
  VECTOR_STORE_TOKEN,
} from "@nestjs-ai/commons";
import {
  MariaDBVectorStoreModule,
  type MariaDBVectorStore,
  type MariaDBVectorStoreProperties,
} from "@nestjs-ai/vector-store-mariadb";
import { SearchRequest } from "@nestjs-ai/vector-store";
import { JSDBC_TEMPLATE, JsdbcTemplate, sql } from "@nestjs-port/jsdbc";
import { TypeOrmDataSource } from "@nestjs-port/jsdbc/typeorm";
import {
  MariaDbContainer,
  type StartedMariaDbContainer,
} from "@testcontainers/mariadb";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

describe("MariaDBVectorStoreModuleIT", () => {
  const DEFAULT_SCHEMA_NAME = null;
  const DEFAULT_TABLE_NAME = "vector_store_add_search";

  let mariaDbContainer: StartedMariaDbContainer;
  let typeormDataSource: DataSource;
  let jsdbcTemplate: JsdbcTemplate;
  let embeddingModel: {
    embed: ReturnType<typeof vi.fn>;
    dimensions: ReturnType<typeof vi.fn>;
  };

  const documents = [
    new Document(
      readFileSync(
        new URL("../resources/spring.ai.txt", import.meta.url),
        "utf8",
      ),
      { spring: "great" },
    ),
    new Document(
      readFileSync(
        new URL("../resources/time.shelter.txt", import.meta.url),
        "utf8",
      ),
    ),
    new Document(
      readFileSync(
        new URL("../resources/great.depression.txt", import.meta.url),
        "utf8",
      ),
      { depression: "bad" },
    ),
  ];

  beforeAll(async () => {
    mariaDbContainer = await new MariaDbContainer("mariadb:11.7-rc")
      .withDatabase("mariadb")
      .withUsername("mariadb")
      .withUserPassword("mariadbpwd")
      .withRootPassword("mariadbpwd")
      .start();

    typeormDataSource = new DataSource({
      type: "mariadb",
      host: mariaDbContainer.getHost(),
      port: mariaDbContainer.getPort(),
      username: mariaDbContainer.getUsername(),
      password: "mariadbpwd",
      database: mariaDbContainer.getDatabase(),
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

  it("adds, searches, and deletes documents", async () => {
    const { moduleRef, vectorStore } = await createVectorStore({
      tableName: DEFAULT_TABLE_NAME,
      initializeSchema: true,
      schemaValidation: false,
      dimensions: 2,
    });

    try {
      await vectorStore.onModuleInit();

      expect(await isTableExists(DEFAULT_SCHEMA_NAME, DEFAULT_TABLE_NAME)).toBe(
        true,
      );

      await vectorStore.add(documents);

      const results = await vectorStore.similaritySearch(
        SearchRequest.builder()
          .query("What is Great Depression?")
          .topK(1)
          .build(),
      );

      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe(documents[2].id);
      expect(results[0]?.metadata).toMatchObject({
        depression: "bad",
      });
      expect(results[0]?.metadata.distance).toBeDefined();

      await vectorStore.delete(documents.map((document) => document.id));

      const emptyResults = await vectorStore.similaritySearch(
        SearchRequest.builder().query("Great Depression").topK(1).build(),
      );
      expect(emptyResults).toHaveLength(0);
    } finally {
      await moduleRef.close();
    }
  }, 240_000);

  it.each([
    ["mariadb:vector_store:id:metadata:embedding:content"],
    ["mariadb:my_table:my_id:my_metadata:my_embedding:my_content"],
  ])("creates custom schema and table for %s", async (schemaTableName) => {
    const [
      schemaName,
      tableName,
      idName,
      metaName,
      embeddingName,
      contentName,
    ] = schemaTableName.split(":");
    const { moduleRef, vectorStore } = await createVectorStore({
      schemaName,
      tableName,
      idFieldName: idName,
      metadataFieldName: metaName,
      embeddingFieldName: embeddingName,
      contentFieldName: contentName,
      initializeSchema: true,
      schemaValidation: false,
      dimensions: 2,
    });

    try {
      await vectorStore.onModuleInit();

      expect(await isSchemaExists(schemaName)).toBe(true);
      expect(await isTableExists(schemaName, tableName)).toBe(true);
      expect(await getColumnNames(schemaName, tableName)).toEqual(
        expect.arrayContaining([idName, contentName, metaName, embeddingName]),
      );
    } finally {
      await moduleRef.close();
    }
  });

  it.each([["mariadb:vector_store_disabled"], ["mariadb:my_table_disabled"]])(
    "does not initialize schema when disabled for %s",
    async (schemaTableName) => {
      const [schemaName, tableName] = schemaTableName.split(":");
      const { moduleRef, vectorStore } = await createVectorStore({
        schemaName,
        tableName,
        initializeSchema: false,
        schemaValidation: false,
        dimensions: 2,
      });

      try {
        await vectorStore.onModuleInit();
        expect(await isTableExists(schemaName, tableName)).toBe(false);
      } finally {
        await moduleRef.close();
      }
    },
  );

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
      embed: vi.fn(async (input: string | Document[]) => {
        if (typeof input === "string") {
          return [0, 1];
        }

        return input.map((_, index) => (index === 2 ? [0, 1] : [1, 0]));
      }),
      dimensions: vi.fn(async () => 2),
    };
  }

  async function isTableExists(
    schemaName: string | null,
    tableName: string,
  ): Promise<boolean> {
    const rows = await jsdbcTemplate.queryForList(
      schemaName == null
        ? sql`SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = SCHEMA()
              AND table_name = ${tableName}
          ) AS exists_flag`
        : sql`SELECT EXISTS (
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
