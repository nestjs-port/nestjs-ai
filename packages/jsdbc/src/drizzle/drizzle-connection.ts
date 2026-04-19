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

import { sql as drizzleSql, type SQL } from "drizzle-orm";

import type { Connection, SqlFragment } from "../api";
import type { DrizzleDatabase } from "./drizzle";

export class DrizzleConnection implements Connection {
  #closed = false;

  constructor(private readonly db: DrizzleDatabase) {}

  async query(fragment: SqlFragment): Promise<Record<string, unknown>[]> {
    this.assertOpen();
    const result = await this.db.execute(toDrizzleSql(fragment));
    return extractRows(result);
  }

  async update(fragment: SqlFragment): Promise<number> {
    this.assertOpen();
    const result = await this.db.execute(toDrizzleSql(fragment));
    return extractAffectedRows(result);
  }

  async close(): Promise<void> {
    this.#closed = true;
  }

  private assertOpen(): void {
    if (this.#closed) {
      throw new Error("Connection is already closed.");
    }
  }
}

function toDrizzleSql(fragment: SqlFragment): SQL {
  const expressions = fragment.expressions.map((expression, index) => {
    if (expression === null) {
      return drizzleSql.raw("NULL");
    }

    if (typeof expression === "function") {
      const value = expression();

      if (typeof value === "string") {
        return drizzleSql.raw(value);
      }

      if (Array.isArray(value)) {
        if (value.length === 0) {
          throw new Error(
            `Expression ${index} in this sql tagged template is a function which returned an empty array. Empty arrays cannot safely be expanded into parameter lists.`,
          );
        }

        return drizzleSql.join(
          value.map((v) => drizzleSql`${v}`),
          drizzleSql.raw(", "),
        );
      }

      throw new Error(
        `Expression ${index} in this sql tagged template is a function which returned a value of type "${value === null ? "null" : typeof value}". Only array and string types are supported as function return values in sql tagged template expressions.`,
      );
    }

    return expression;
  });

  return drizzleSql(fragment.strings, ...expressions);
}

export function extractRows(result: unknown): Record<string, unknown>[] {
  if (result == null) {
    return [];
  }

  if (
    !Array.isArray(result) &&
    typeof result === "object" &&
    "rows" in result
  ) {
    const rows = (result as Record<string, unknown>).rows;
    if (Array.isArray(rows)) {
      return rows as Record<string, unknown>[];
    }
  }

  if (Array.isArray(result)) {
    if (result.length >= 1 && Array.isArray(result[0])) {
      return result[0] as Record<string, unknown>[];
    }
    return result as Record<string, unknown>[];
  }

  return [];
}

export function extractAffectedRows(result: unknown): number {
  if (result == null) {
    return 0;
  }

  const targets: unknown[] = [result];
  if (Array.isArray(result) && result.length >= 1) {
    targets.push(result[0]);
  }

  for (const target of targets) {
    if (target != null && typeof target === "object") {
      const obj = target as Record<string, unknown>;
      if (typeof obj.rowCount === "number") return obj.rowCount;
      if (typeof obj.count === "number") return obj.count;
      if (typeof obj.affectedRows === "number") return obj.affectedRows;
      if (typeof obj.changes === "number") return obj.changes;
      if (typeof obj.rowsAffected === "number") return obj.rowsAffected;
    }
  }

  return 0;
}
