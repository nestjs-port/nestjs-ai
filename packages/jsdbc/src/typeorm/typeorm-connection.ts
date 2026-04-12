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

import type { Connection, DatabaseDialect } from "../api";

export interface QueryExecutor {
  query(sql: string, parameters?: readonly unknown[]): Promise<unknown>;
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

export class TypeOrmConnection implements Connection {
  #closed = false;

  constructor(
    private readonly executor: QueryExecutor,
    private readonly dialect: DatabaseDialect,
  ) {}

  get dialectName(): DatabaseDialect {
    return this.dialect;
  }

  async query(
    sql: string,
    ...args: readonly unknown[]
  ): Promise<Record<string, unknown>[]> {
    this.assertOpen();
    const result = await this.executor.query(sql, args);
    return toRecordArray(result);
  }

  async update(sql: string, ...args: readonly unknown[]): Promise<number> {
    this.assertOpen();
    const result = await this.executor.query(sql, args);
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
