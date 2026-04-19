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

import { describe, expect, it } from "vitest";

import { DatabaseDialect } from "../../api";
import type { DrizzleDatabase } from "../drizzle";
import { DrizzleDataSource } from "../drizzle-data-source";

describe("DrizzleDataSource", () => {
  it.each([
    ["PostgresJsDatabase", DatabaseDialect.POSTGRESQL],
    ["NodePgDatabase", DatabaseDialect.POSTGRESQL],
    ["PrismaPgDatabase", DatabaseDialect.POSTGRESQL],
    ["MySql2Database", DatabaseDialect.MYSQL],
    ["PlanetScaleDatabase", DatabaseDialect.MYSQL],
    ["BetterSQLite3Database", DatabaseDialect.SQLITE],
    ["DrizzleSqliteDODatabase", DatabaseDialect.SQLITE],
    ["SingleStoreDriverDatabase", DatabaseDialect.MYSQL],
    ["UnknownDatabase", DatabaseDialect.POSTGRESQL],
  ])("maps %s to %s", async (databaseName, expectedDialect) => {
    const dataSource = new DrizzleDataSource(createMockDb(databaseName));

    await expect(dataSource.getDialect()).resolves.toBe(expectedDialect);
  });

  it("uses explicit dialect over auto-detection", async () => {
    const dataSource = new DrizzleDataSource(
      createMockDb("PostgresJsDatabase"),
      {
        dialect: DatabaseDialect.MYSQL,
      },
    );

    await expect(dataSource.getDialect()).resolves.toBe(DatabaseDialect.MYSQL);
  });

  it("falls back to the internal dialect object when the db class name is not informative", async () => {
    const dataSource = new DrizzleDataSource(
      createMockDbWithInternalDialect("Object", "SQLiteDialect"),
    );

    await expect(dataSource.getDialect()).resolves.toBe(DatabaseDialect.SQLITE);
  });

  it("falls back to POSTGRESQL when internal structure is missing", async () => {
    const db = {
      execute: () => Promise.resolve([]),
      transaction: () => Promise.resolve(undefined as never),
    } as unknown as DrizzleDatabase;

    const dataSource = new DrizzleDataSource(db);

    await expect(dataSource.getDialect()).resolves.toBe(
      DatabaseDialect.POSTGRESQL,
    );
  });
});

function createMockDb(databaseName: string): DrizzleDatabase {
  class MockDatabase {}
  Object.defineProperty(MockDatabase, "name", { value: databaseName });

  return Object.assign(new MockDatabase(), {
    execute: () => Promise.resolve([]),
    transaction: () => Promise.resolve(undefined as never),
  }) as unknown as DrizzleDatabase;
}

function createMockDbWithInternalDialect(
  databaseName: string,
  dialectName: string,
): DrizzleDatabase {
  class MockDatabase {}
  Object.defineProperty(MockDatabase, "name", { value: databaseName });

  class MockDialect {}
  Object.defineProperty(MockDialect, "name", { value: dialectName });

  return Object.assign(new MockDatabase(), {
    execute: () => Promise.resolve([]),
    transaction: () => Promise.resolve(undefined as never),
    _: {
      dialect: new MockDialect(),
    },
  }) as unknown as DrizzleDatabase;
}
