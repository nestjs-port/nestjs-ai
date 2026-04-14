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

import type { MikroORM, Platform } from "@mikro-orm/core";
import { describe, expect, it } from "vitest";

import { DatabaseDialect } from "../../api";
import { MikroOrmDataSource } from "../mikroorm-data-source";

describe("MikroOrmDataSource", () => {
  it.each([
    ["MariaDbPlatform", DatabaseDialect.MARIADB],
    ["MySqlPlatform", DatabaseDialect.MYSQL],
    ["PostgreSqlPlatform", DatabaseDialect.POSTGRESQL],
    ["SqlitePlatform", DatabaseDialect.SQLITE],
    ["MsSqlPlatform", DatabaseDialect.MICROSOFT_SQL_SERVER],
    ["OraclePlatform", DatabaseDialect.ORACLE],
    ["H2Platform", DatabaseDialect.POSTGRESQL],
    ["HSQLPlatform", DatabaseDialect.POSTGRESQL],
    ["UnknownPlatform", DatabaseDialect.POSTGRESQL],
  ])("maps %s to %s", async (platformName, expectedDialect) => {
    const dataSource = new MikroOrmDataSource({
      em: {
        getPlatform: () => createPlatform(platformName),
      },
    } as MikroORM);

    await expect(dataSource.getDialect()).resolves.toBe(expectedDialect);
  });
});

function createPlatform(name: string): Platform {
  return {
    constructor: { name },
  } as Platform;
}
