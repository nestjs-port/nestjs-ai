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

import type { Driver } from "typeorm/driver/Driver";
import type { QueryRunner } from "typeorm/query-runner/QueryRunner";
import { buildSqlTag } from "typeorm/util/SqlTagUtils";

import type { Connection, SqlFragment } from "../api";

export class TypeOrmConnection implements Connection {
  #closed = false;

  constructor(private readonly queryRunner: QueryRunner) {}

  async query(fragment: SqlFragment): Promise<Record<string, unknown>[]> {
    this.assertOpen();
    const { query, parameters } = buildSqlTag({
      driver: this.queryRunner.connection.driver as Driver,
      strings: fragment.strings,
      expressions: [...fragment.expressions],
    });
    const result = await this.queryRunner.query(query, parameters, true);
    return result.records;
  }

  async update(fragment: SqlFragment): Promise<number> {
    this.assertOpen();
    const { query, parameters } = buildSqlTag({
      driver: this.queryRunner.connection.driver as Driver,
      strings: fragment.strings,
      expressions: [...fragment.expressions],
    });
    const result = await this.queryRunner.query(query, parameters, true);
    return result.affected ?? 0;
  }

  async close(): Promise<void> {
    await this.queryRunner.release();
    this.#closed = true;
  }

  private assertOpen(): void {
    if (this.#closed) {
      throw new Error("Connection is already closed.");
    }
  }
}
