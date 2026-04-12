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
import { rewritePositionalParameters } from "../sql-placeholder";

describe("rewritePositionalParameters", () => {
  it("rewrites positional placeholders for postgres", () => {
    expect(
      rewritePositionalParameters(
        "SELECT * FROM items WHERE id = ? AND name = ?",
        DatabaseDialect.POSTGRESQL,
      ),
    ).toBe("SELECT * FROM items WHERE id = $1 AND name = $2");
  });

  it("preserves placeholders inside quotes and comments", () => {
    expect(
      rewritePositionalParameters(
        "SELECT '?' AS literal, \"?\" AS identifier, `?` AS backtick -- ?\n/* ? */ WHERE id = ?",
        DatabaseDialect.POSTGRESQL,
      ),
    ).toBe(
      "SELECT '?' AS literal, \"?\" AS identifier, `?` AS backtick -- ?\n/* ? */ WHERE id = $1",
    );
  });

  it("does not rewrite non-postgres dialects", () => {
    expect(
      rewritePositionalParameters(
        "SELECT * FROM items WHERE id = ?",
        DatabaseDialect.MYSQL,
      ),
    ).toBe("SELECT * FROM items WHERE id = ?");
  });
});
