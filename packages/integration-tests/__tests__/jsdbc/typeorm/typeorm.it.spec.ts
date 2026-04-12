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

import "reflect-metadata";

import { Test, type TestingModule } from "@nestjs/testing";
import { getDataSourceToken, TypeOrmModule } from "@nestjs/typeorm";
import type { DataSource as JsdbcDataSource } from "@nestjs-ai/jsdbc";
import { DatabaseDialect, JSDBC_DATA_SOURCE, sql } from "@nestjs-ai/jsdbc";
import { TypeOrmJsdbcModule } from "@nestjs-ai/jsdbc/typeorm";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import type { DataSource } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("TypeOrmJsdbcDataSourceIT", () => {
  let postgresContainer!: StartedPostgreSqlContainer;
  let moduleRef!: TestingModule;
  let typeormDataSource!: DataSource;
  let jsdbcDataSource!: JsdbcDataSource;

  beforeAll(async () => {
    postgresContainer = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("jsdbc_integration")
      .withUsername("jsdbc")
      .withPassword("jsdbc")
      .start();

    const typeormModule = TypeOrmModule.forRoot({
      type: "postgres",
      url: postgresContainer.getConnectionUri(),
      synchronize: false,
      logging: false,
    });

    moduleRef = await Test.createTestingModule({
      imports: [typeormModule, TypeOrmJsdbcModule.forRoot()],
    }).compile();
    await moduleRef.init();

    typeormDataSource = moduleRef.get<DataSource>(getDataSourceToken());
    jsdbcDataSource = moduleRef.get<JsdbcDataSource>(JSDBC_DATA_SOURCE);

    await typeormDataSource.query(`
      CREATE TABLE IF NOT EXISTS jsdbc_typeorm_items (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL
      )
    `);
  }, 120_000);

  beforeEach(async () => {
    await typeormDataSource.query(
      "TRUNCATE TABLE jsdbc_typeorm_items RESTART IDENTITY",
    );
  });

  afterAll(async () => {
    await moduleRef?.close();
    await postgresContainer?.stop();
  });

  it("exposes the postgres dialect and executes queries", async () => {
    expect(await jsdbcDataSource.getDialect()).toBe(DatabaseDialect.POSTGRESQL);

    const connection = await jsdbcDataSource.getConnection();

    await connection.update(
      sql`INSERT INTO jsdbc_typeorm_items (name) VALUES (${"alpha"})`,
    );

    const rows = await connection.query(
      sql`SELECT id, name FROM jsdbc_typeorm_items WHERE name = ${"alpha"}`,
    );

    expect(rows).toEqual([
      {
        id: 1,
        name: "alpha",
      },
    ]);

    await connection.close();
  });

  it("runs transaction callbacks against the same datasource", async () => {
    await expect(
      jsdbcDataSource.transaction(async (connection) => {
        await connection.update(
          sql`INSERT INTO jsdbc_typeorm_items (name) VALUES (${"inside-transaction"})`,
        );

        const rows = await connection.query(
          sql`SELECT name FROM jsdbc_typeorm_items WHERE name = ${"inside-transaction"}`,
        );

        expect(rows).toEqual([{ name: "inside-transaction" }]);
      }),
    ).resolves.toBeUndefined();

    const rows = await typeormDataSource.query(
      "SELECT name FROM jsdbc_typeorm_items ORDER BY id",
    );

    expect(rows).toEqual([{ name: "inside-transaction" }]);
  });

  it("rolls back failed transactions", async () => {
    await expect(
      jsdbcDataSource.transaction(async (connection) => {
        await connection.update(
          sql`INSERT INTO jsdbc_typeorm_items (name) VALUES (${"rollback-me"})`,
        );
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    const rows = await typeormDataSource.query(
      "SELECT name FROM jsdbc_typeorm_items WHERE name = $1",
      ["rollback-me"],
    );

    expect(rows).toEqual([]);
  });
});
