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

import type { Connection, DatabaseDialect, SqlFragment } from "../api";
import { buildSqlTag } from "../api/sql-tag";

export interface PrismaExecutor {
  $queryRawUnsafe(sql: string, ...values: readonly unknown[]): Promise<unknown>;
  $executeRawUnsafe(
    sql: string,
    ...values: readonly unknown[]
  ): Promise<number>;
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

export class PrismaConnection implements Connection {
  #closed = false;

  constructor(
    private readonly prisma: PrismaExecutor,
    private readonly dialect: DatabaseDialect,
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
    const result = await this.prisma.$queryRawUnsafe(query, ...parameters);
    return toRecordArray(result);
  }

  async update(fragment: SqlFragment): Promise<number> {
    this.assertOpen();
    const { query, parameters } = buildSqlTag(
      fragment.strings,
      fragment.expressions,
      this.dialect,
    );
    return this.prisma.$executeRawUnsafe(query, ...parameters);
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
