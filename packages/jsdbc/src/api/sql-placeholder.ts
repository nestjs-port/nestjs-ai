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

import { DatabaseDialect } from "./database-dialect.enum";

type SqlRewriteState =
  | "normal"
  | "single"
  | "double"
  | "backtick"
  | "line"
  | "block";

/**
 * Rewrites positional `?` placeholders to PostgreSQL-style `$1`, `$2`, ...
 * while leaving quoted strings and SQL comments untouched.
 */
export function rewritePositionalParameters(
  sql: string,
  dialect: DatabaseDialect,
): string {
  if (dialect !== DatabaseDialect.POSTGRESQL) {
    return sql;
  }

  let rewritten = "";
  let parameterIndex = 1;
  let state: SqlRewriteState = "normal";

  for (let index = 0; index < sql.length; index++) {
    const char = sql[index];
    const next = sql[index + 1];

    if (state === "normal") {
      if (char === "'") {
        state = "single";
        rewritten += char;
        continue;
      }

      if (char === '"') {
        state = "double";
        rewritten += char;
        continue;
      }

      if (char === "`") {
        state = "backtick";
        rewritten += char;
        continue;
      }

      if (char === "-" && next === "-") {
        state = "line";
        rewritten += char + next;
        index++;
        continue;
      }

      if (char === "/" && next === "*") {
        state = "block";
        rewritten += char + next;
        index++;
        continue;
      }

      if (char === "?") {
        rewritten += `$${parameterIndex++}`;
        continue;
      }

      rewritten += char;
      continue;
    }

    if (state === "single") {
      rewritten += char;

      if (char === "'" && next === "'") {
        rewritten += next;
        index++;
      } else if (char === "'") {
        state = "normal";
      }

      continue;
    }

    if (state === "double") {
      rewritten += char;

      if (char === '"' && next === '"') {
        rewritten += next;
        index++;
      } else if (char === '"') {
        state = "normal";
      }

      continue;
    }

    if (state === "backtick") {
      rewritten += char;

      if (char === "`" && next === "`") {
        rewritten += next;
        index++;
      } else if (char === "`") {
        state = "normal";
      }

      continue;
    }

    if (state === "line") {
      rewritten += char;

      if (char === "\n" || char === "\r") {
        state = "normal";
      }

      continue;
    }

    rewritten += char;

    if (char === "*" && next === "/") {
      rewritten += next;
      index++;
      state = "normal";
    }
  }

  return rewritten;
}
