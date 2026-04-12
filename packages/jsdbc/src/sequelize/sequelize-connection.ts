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

import { QueryTypes, type Transaction } from "sequelize";
import type { Connection, DatabaseDialect, SqlFragment } from "../api";
import { buildSqlTag } from "../api/sql-tag";

export interface SequelizeExecutor {
  query(sql: string, options?: Record<string, unknown>): Promise<unknown>;
}

function toRecordArray(result: unknown): Record<string, unknown>[] {
  if (!Array.isArray(result)) {
    return [];
  }

  return result.filter(
    (value): value is Record<string, unknown> =>
      value != null && typeof value === "object" && !Array.isArray(value),
  );
}

function extractAffectedRows(result: unknown): number {
  if (typeof result === "number") {
    return result;
  }

  if (Array.isArray(result)) {
    return result.length;
  }

  if (result != null && typeof result === "object") {
    const candidate = result as {
      affected?: unknown;
      affectedRows?: unknown;
      changes?: unknown;
      rowCount?: unknown;
      rowsAffected?: unknown;
    };

    const values = [
      candidate.affected,
      candidate.affectedRows,
      candidate.changes,
      candidate.rowCount,
      candidate.rowsAffected,
    ];

    for (const value of values) {
      if (typeof value === "number") {
        return value;
      }
      if (Array.isArray(value) && typeof value[0] === "number") {
        return value[0];
      }
    }
  }

  return 0;
}

export class SequelizeConnection implements Connection {
  #closed = false;

  constructor(
    private readonly sequelize: SequelizeExecutor & {
      getDialect(): string;
    },
    private readonly dialect: DatabaseDialect,
    private readonly transaction?: Transaction,
  ) {}

  get dialectName(): DatabaseDialect {
    return this.dialect;
  }

  async query(fragment: SqlFragment): Promise<Record<string, unknown>[]> {
    this.assertOpen();
    const { query, parameters } = buildSqlTag(
      fragment.strings,
      fragment.expressions,
      this.dialect,
    );
    const result = await this.sequelize.query(query, {
      replacements: parameters,
      raw: true,
      transaction: this.transaction,
      type: QueryTypes.SELECT,
    });
    return toRecordArray(result);
  }

  async update(fragment: SqlFragment): Promise<number> {
    this.assertOpen();
    const { query, parameters } = buildSqlTag(
      fragment.strings,
      fragment.expressions,
      this.dialect,
    );
    const result = await this.sequelize.query(query, {
      replacements: parameters,
      transaction: this.transaction,
    });
    const metadata = Array.isArray(result) ? result[1] : result;
    return extractAffectedRows(metadata);
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
