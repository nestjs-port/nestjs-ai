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

import { existsSync } from "node:fs";
import type { DynamicModule } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import type { DataSource as JsdbcDataSource } from "@nestjs-ai/jsdbc";
import { DatabaseDialect, JSDBC_DATA_SOURCE, sql } from "@nestjs-ai/jsdbc";
import { PrismaJsdbcModule } from "@nestjs-ai/jsdbc/prisma";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

type PrismaClientLike = {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<unknown>;
};

const prismaClientModulePath = "./generated/client";
const hasGeneratedPrismaClient = existsSync(
  `${__dirname}/generated/client/index.js`,
);

describe.skipIf(!hasGeneratedPrismaClient)("PrismaJsdbcDataSourceIT", () => {
  let postgresContainer!: StartedPostgreSqlContainer;
  let moduleRef!: TestingModule;
  let prisma!: PrismaClientLike;
  let jsdbcDataSource!: JsdbcDataSource;

  beforeAll(async () => {
    postgresContainer = await new PostgreSqlContainer("postgres:17-alpine")
      .withDatabase("jsdbc_integration")
      .withUsername("jsdbc")
      .withPassword("jsdbc")
      .start();

    const { PrismaClient } = (await import(prismaClientModulePath)) as {
      PrismaClient: new (options: {
        datasourceUrl: string;
      }) => PrismaClientLike;
    };

    prisma = new PrismaClient({
      datasourceUrl: postgresContainer.getConnectionUri(),
    });
    await prisma.$connect();

    const prismaClientModule: DynamicModule = {
      module: class PrismaClientModule {},
      providers: [
        {
          provide: "PRISMA_CLIENT",
          useValue: prisma,
        },
      ],
      exports: ["PRISMA_CLIENT"],
    };

    moduleRef = await Test.createTestingModule({
      imports: [
        prismaClientModule,
        PrismaJsdbcModule.forRoot({
          imports: [prismaClientModule],
          prismaToken: "PRISMA_CLIENT",
        }),
      ],
    }).compile();
    await moduleRef.init();

    jsdbcDataSource = moduleRef.get<JsdbcDataSource>(JSDBC_DATA_SOURCE);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS jsdbc_prisma_items (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL
      )
    `);
  }, 120_000);

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      "TRUNCATE TABLE jsdbc_prisma_items RESTART IDENTITY",
    );
  });

  afterAll(async () => {
    await moduleRef?.close();
    await prisma?.$disconnect();
    await postgresContainer?.stop();
  });

  it("exposes the postgres dialect and executes queries", async () => {
    expect(await jsdbcDataSource.getDialect()).toBe(DatabaseDialect.POSTGRESQL);

    const connection = await jsdbcDataSource.getConnection();

    await connection.update(
      sql`INSERT INTO jsdbc_prisma_items (name) VALUES (${"alpha"})`,
    );

    const rows = await connection.query(
      sql`SELECT id, name FROM jsdbc_prisma_items WHERE name = ${"alpha"}`,
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
          sql`INSERT INTO jsdbc_prisma_items (name) VALUES (${"inside-transaction"})`,
        );

        const rows = await connection.query(
          sql`SELECT name FROM jsdbc_prisma_items WHERE name = ${"inside-transaction"}`,
        );

        expect(rows).toEqual([{ name: "inside-transaction" }]);
      }),
    ).resolves.toBeUndefined();

    const connection = await jsdbcDataSource.getConnection();
    const rows = await connection.query(
      sql`SELECT name FROM jsdbc_prisma_items ORDER BY id`,
    );

    expect(rows).toEqual([{ name: "inside-transaction" }]);
  });

  it("rolls back failed transactions", async () => {
    await expect(
      jsdbcDataSource.transaction(async (connection) => {
        await connection.update(
          sql`INSERT INTO jsdbc_prisma_items (name) VALUES (${"rollback-me"})`,
        );
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    const connection = await jsdbcDataSource.getConnection();
    const rows = await connection.query(
      sql`SELECT name FROM jsdbc_prisma_items WHERE name = ${"rollback-me"}`,
    );

    expect(rows).toEqual([]);
  });
});
