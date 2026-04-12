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

import type { Sequelize } from "sequelize";
import { QueryTypes, type Transaction } from "sequelize";
import type { Connection, SqlFragment } from "../api";

function buildSequelizeSqlTag(fragment: SqlFragment): {
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

export class SequelizeConnection implements Connection {
  #closed = false;

  constructor(
    private readonly sequelize: Sequelize,
    private readonly transaction?: Transaction,
  ) {}

  async query(fragment: SqlFragment): Promise<Record<string, unknown>[]> {
    this.assertOpen();
    const { query, parameters } = buildSequelizeSqlTag(fragment);
    return await this.sequelize.query(query, {
      replacements: parameters,
      raw: true,
      transaction: this.transaction,
      type: QueryTypes.SELECT,
    });
  }

  async update(fragment: SqlFragment): Promise<number> {
    this.assertOpen();
    const { query, parameters } = buildSequelizeSqlTag(fragment);
    const result = await this.sequelize.query(query, {
      replacements: parameters,
      transaction: this.transaction,
      type: QueryTypes.UPDATE,
    });
    return Array.isArray(result) ? result[1] : 0;
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
