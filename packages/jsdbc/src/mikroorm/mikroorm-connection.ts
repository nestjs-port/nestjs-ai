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

import type { MikroORM } from "@mikro-orm/core";
import type { Connection, SqlFragment } from "../api";

type MikroOrmEntityManager = MikroORM["em"] & {
  execute(
    query: string,
    params?: readonly unknown[],
    method?: "all" | "get" | "run",
  ): Promise<unknown>;
};

export class MikroOrmConnection implements Connection {
  #closed = false;

  constructor(private readonly executor: MikroOrmEntityManager) {}

  async query(fragment: SqlFragment): Promise<Record<string, unknown>[]> {
    this.assertOpen();
    const { query, parameters } = buildMikroOrmSqlTag(fragment);
    return this.executor.execute(query, parameters, "all") as Promise<
      Record<string, unknown>[]
    >;
  }

  async update(fragment: SqlFragment): Promise<number> {
    this.assertOpen();
    const { query, parameters } = buildMikroOrmSqlTag(fragment);
    const result = await this.executor.execute(query, parameters, "run");
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

function buildMikroOrmSqlTag(fragment: SqlFragment): {
  query: string;
  parameters: unknown[];
} {
  let query = "";
  const parameters: unknown[] = [];

  for (let index = 0; index < fragment.expressions.length; index++) {
    query += fragment.strings[index];
    const expression = fragment.expressions[index];

    if (expression === null) {
      query += "NULL";
      continue;
    }

    if (typeof expression === "function") {
      const value = expression();

      if (typeof value === "string") {
        query += value;
        continue;
      }

      if (Array.isArray(value)) {
        if (value.length === 0) {
          throw new Error(
            `Expression ${index} in this sql tagged template is a function which returned an empty array. Empty arrays cannot safely be expanded into parameter lists.`,
          );
        }

        query += value.map(() => "?").join(", ");
        parameters.push(...value);
        continue;
      }

      throw new Error(
        `Expression ${index} in this sql tagged template is a function which returned a value of type "${value === null ? "null" : typeof value}". Only array and string types are supported as function return values in sql tagged template expressions.`,
      );
    }

    query += "?";
    parameters.push(expression);
  }

  query += fragment.strings[fragment.strings.length - 1];

  return { query, parameters };
}

function extractAffectedRows(result: unknown): number {
  if (result != null && typeof result === "object") {
    const candidate = result as {
      affectedRows?: unknown;
    };

    if (typeof candidate.affectedRows === "number") {
      return candidate.affectedRows;
    }
  }

  return 0;
}
