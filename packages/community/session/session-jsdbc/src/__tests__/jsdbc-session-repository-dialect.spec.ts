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

import { toSql } from "@nestjs-port/jsdbc";
import { describe, expect, it } from "vitest";
import type { JsdbcSessionRepositoryDialect } from "../jsdbc-session-repository-dialect.js";
import { MysqlSessionRepositoryDialect } from "../mysql-session-repository-dialect.js";
import { PostgresSessionRepositoryDialect } from "../postgres-session-repository-dialect.js";
import { SqliteSessionRepositoryDialect } from "../sqlite-session-repository-dialect.js";

const countPlaceholders = (fragment: string): number =>
  (fragment.match(/\?/g) ?? []).length;

/**
 * Unit tests for {@link JsdbcSessionRepositoryDialect} implementations, focusing
 * on SQL correctness for dialect-specific fragments.
 */
describe("JsdbcSessionRepositoryDialect", () => {
  // -------------------------------------------------------------------------
  // getBranchFilterFragment — PostgreSQL / SQLite (default)
  // -------------------------------------------------------------------------

  it("postgres branch filter uses double pipe concat", () => {
    const fragment = toSql(
      new PostgresSessionRepositoryDialect().getBranchFilterFragment("branch"),
    );
    expect(fragment).toContain("||");
    expect(fragment).toContain("e.branch IS NULL");
    expect(fragment).toContain("e.branch = ?");
  });

  it("sqlite branch filter uses double pipe concat", () => {
    const fragment = toSql(
      new SqliteSessionRepositoryDialect().getBranchFilterFragment("branch"),
    );
    expect(fragment).toContain("||");
    expect(fragment).toContain("e.branch IS NULL");
    expect(fragment).toContain("e.branch = ?");
  });

  // -------------------------------------------------------------------------
  // getBranchFilterFragment — MySQL / MariaDB
  // -------------------------------------------------------------------------

  it("mysql branch filter uses concat function", () => {
    const fragment = toSql(
      new MysqlSessionRepositoryDialect().getBranchFilterFragment("branch"),
    );
    expect(fragment).toContain("CONCAT(");
    expect(fragment).toContain("e.branch IS NULL");
    expect(fragment).toContain("e.branch = ?");
  });

  it("mysql branch filter does not use double pipe", () => {
    // || is logical OR in MySQL — using it would silently return wrong results
    const fragment = toSql(
      new MysqlSessionRepositoryDialect().getBranchFilterFragment("branch"),
    );
    expect(fragment).not.toContain("||");
  });

  it("mysql branch filter has two placeholders", () => {
    const fragment = toSql(
      new MysqlSessionRepositoryDialect().getBranchFilterFragment("branch"),
    );
    expect(countPlaceholders(fragment)).toBe(2);
  });

  // -------------------------------------------------------------------------
  // Default method contract — all dialects must have two placeholders
  // -------------------------------------------------------------------------

  it("all dialects branch filter have two placeholders", () => {
    const dialects: JsdbcSessionRepositoryDialect[] = [
      new PostgresSessionRepositoryDialect(),
      new SqliteSessionRepositoryDialect(),
      new MysqlSessionRepositoryDialect(),
    ];
    for (const dialect of dialects) {
      const fragment = toSql(dialect.getBranchFilterFragment("branch"));
      expect(countPlaceholders(fragment)).toBe(2);
    }
  });
});
