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
import { DatabaseDialect } from "../database-dialect.enum";
import { buildSqlTag, sql } from "../sql-tag";

describe("buildSqlTag", () => {
  it("builds sql fragments", () => {
    const fragment = sql`SELECT * FROM users WHERE id = ${1}`;

    expect(fragment.strings).toEqual(["SELECT * FROM users WHERE id = ", ""]);
    expect(fragment.expressions).toEqual([1]);
  });

  it("builds postgres parameters", () => {
    const { query, parameters } = buildSqlTag(
      [
        "SELECT * FROM users WHERE id = ",
        " AND name = ",
        "",
      ] as unknown as TemplateStringsArray,
      [1, "John"],
      DatabaseDialect.POSTGRESQL,
    );

    expect(query).toBe("SELECT * FROM users WHERE id = $1 AND name = $2");
    expect(parameters).toEqual([1, "John"]);
  });

  it("expands arrays and allows raw strings", () => {
    const { query, parameters } = buildSqlTag(
      [
        "SELECT * FROM users WHERE id IN (",
        ") AND ",
        "",
      ] as unknown as TemplateStringsArray,
      [() => [1, 2, 3], () => "active = true"],
      DatabaseDialect.MYSQL,
    );

    expect(query).toBe(
      "SELECT * FROM users WHERE id IN (?, ?, ?) AND active = true",
    );
    expect(parameters).toEqual([1, 2, 3]);
  });

  it("uses oracle and mssql placeholder styles", () => {
    expect(
      buildSqlTag(
        [
          "SELECT * FROM users WHERE id = ",
          "",
        ] as unknown as TemplateStringsArray,
        [1],
        DatabaseDialect.ORACLE,
      ).query,
    ).toBe("SELECT * FROM users WHERE id = :1");

    expect(
      buildSqlTag(
        [
          "SELECT * FROM users WHERE id = ",
          "",
        ] as unknown as TemplateStringsArray,
        [1],
        DatabaseDialect.MICROSOFT_SQL_SERVER,
      ).query,
    ).toBe("SELECT * FROM users WHERE id = @0");
  });
});
