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

import { describe, expect, it } from "vitest";

import { DatabaseDialect } from "../../api";
import { PrismaDataSource } from "../prisma-data-source";

describe("PrismaDataSource", () => {
  it.each([
    ["postgresql", DatabaseDialect.POSTGRESQL],
    ["postgres", DatabaseDialect.POSTGRESQL],
    ["cockroachdb", DatabaseDialect.POSTGRESQL],
    ["mysql", DatabaseDialect.MYSQL],
    ["mariadb", DatabaseDialect.MARIADB],
    ["sqlite", DatabaseDialect.SQLITE],
    ["sqlserver", DatabaseDialect.MICROSOFT_SQL_SERVER],
    ["oracle", DatabaseDialect.ORACLE],
    ["mongodb", DatabaseDialect.POSTGRESQL],
  ])("maps %s to %s", async (activeProvider, expectedDialect) => {
    const dataSource = new PrismaDataSource(
      {
        _activeProvider: activeProvider,
      } as never,
      {} as never,
    );

    await expect(dataSource.getDialect()).resolves.toBe(expectedDialect);
  });
});
