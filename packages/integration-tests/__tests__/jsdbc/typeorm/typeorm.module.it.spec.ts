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
import { TypeOrmModule } from "@nestjs/typeorm";
import type { JsdbcTemplate } from "@nestjs-port/jsdbc";
import { DatabaseDialect, JSDBC_TEMPLATE, sql } from "@nestjs-port/jsdbc";
import { TypeOrmJsdbcModule } from "@nestjs-port/jsdbc/typeorm";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("TypeOrmJsdbcModuleIT", () => {
  let postgresContainer!: StartedPostgreSqlContainer;
  let moduleRef!: TestingModule;
  let jsdbcTemplate!: JsdbcTemplate;

  beforeAll(async () => {
    postgresContainer = await new PostgreSqlContainer("postgres:17-alpine")
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

    jsdbcTemplate = moduleRef.get<JsdbcTemplate>(JSDBC_TEMPLATE);

    await jsdbcTemplate.update(sql`
      CREATE TABLE IF NOT EXISTS jsdbc_typeorm_items (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL
      )
    `);
  }, 120_000);

  beforeEach(async () => {
    await jsdbcTemplate.update(
      sql`TRUNCATE TABLE jsdbc_typeorm_items RESTART IDENTITY`,
    );
  });

  afterAll(async () => {
    await moduleRef?.close();
    await postgresContainer?.stop();
  });

  it("exposes the postgres dialect and executes queries", async () => {
    expect(await jsdbcTemplate.dataSource.getDialect()).toBe(
      DatabaseDialect.POSTGRESQL,
    );

    await jsdbcTemplate.update(
      sql`INSERT INTO jsdbc_typeorm_items (name) VALUES (${"alpha"})`,
    );

    const rows = await jsdbcTemplate.queryForList(
      sql`SELECT id, name FROM jsdbc_typeorm_items WHERE name = ${"alpha"}`,
    );

    expect(rows).toEqual([
      {
        id: 1,
        name: "alpha",
      },
    ]);
  });

  it("runs transaction callbacks against the same datasource", async () => {
    await expect(
      jsdbcTemplate.transaction(async () => {
        await jsdbcTemplate.update(
          sql`INSERT INTO jsdbc_typeorm_items (name) VALUES (${"inside-transaction"})`,
        );

        const rows = await jsdbcTemplate.queryForList(
          sql`SELECT name FROM jsdbc_typeorm_items WHERE name = ${"inside-transaction"}`,
        );

        expect(rows).toEqual([{ name: "inside-transaction" }]);
      }),
    ).resolves.toBeUndefined();

    const rows = await jsdbcTemplate.queryForList(
      sql`SELECT name FROM jsdbc_typeorm_items ORDER BY id`,
    );

    expect(rows).toEqual([{ name: "inside-transaction" }]);
  });

  it("rolls back failed transactions", async () => {
    await expect(
      jsdbcTemplate.transaction(async () => {
        await jsdbcTemplate.update(
          sql`INSERT INTO jsdbc_typeorm_items (name) VALUES (${"rollback-me"})`,
        );
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    const rows = await jsdbcTemplate.queryForList(
      sql`SELECT name FROM jsdbc_typeorm_items WHERE name = ${"rollback-me"}`,
    );

    expect(rows).toEqual([]);
  });
});
