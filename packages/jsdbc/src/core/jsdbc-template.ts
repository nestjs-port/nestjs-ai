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

import { LoggerFactory } from "@nestjs-ai/commons";
import { type DataSource, type SqlFragment, toSql } from "../api";
import type { RowMapper, RowMapperFunction } from "./row-mapper.interface";
import { TransactionSynchronizationManager } from "./transaction-synchronization-manager";

interface ConnectionHandle {
  connection: Awaited<ReturnType<DataSource["getConnection"]>>;
  transactional: boolean;
}

export class JsdbcTemplate {
  private readonly logger = LoggerFactory.getLogger(JsdbcTemplate.name);

  constructor(public readonly dataSource: DataSource) {}

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async () => callback());
  }

  async update(fragment: SqlFragment): Promise<number> {
    this.logger.debug(`Executing SQL update [${toSql(fragment)}]`);

    const connection = await this.getConnection();

    try {
      const updatedRows = await connection.connection.update(fragment);
      this.logger.trace("SQL update affected {} rows", updatedRows);
      return updatedRows;
    } finally {
      await this.releaseConnection(connection);
    }
  }

  async queryForList<T>(
    fragment: SqlFragment,
    rowMapper: RowMapperFunction<T>,
  ): Promise<T[]>;

  async queryForList<T>(
    fragment: SqlFragment,
    rowMapper: RowMapper<T>,
  ): Promise<T[]>;

  async queryForList(fragment: SqlFragment): Promise<Record<string, unknown>[]>;

  async queryForList<T>(
    fragment: SqlFragment,
    rowMapper?: RowMapperFunction<T> | RowMapper<T>,
  ): Promise<T[] | Record<string, unknown>[]> {
    this.logger.debug(`Executing SQL query [${toSql(fragment)}]`);

    const connection = await this.getConnection();

    try {
      const rows = await connection.connection.query(fragment);

      if (!rowMapper) {
        return rows;
      }

      if (typeof rowMapper === "function") {
        return rows.map((row, rowNum) => rowMapper(row, rowNum)) as T[];
      }

      if (isRowMapperInstance(rowMapper)) {
        return rows.map((row, rowNum) => rowMapper.mapRow(row, rowNum)) as T[];
      }

      return rows;
    } finally {
      await this.releaseConnection(connection);
    }
  }

  private async getConnection(): Promise<ConnectionHandle> {
    const transactionalConnection =
      TransactionSynchronizationManager.getResource(this.dataSource);
    if (transactionalConnection != null) {
      return {
        connection: transactionalConnection,
        transactional: true,
      };
    }

    return {
      connection: await this.dataSource.getConnection(),
      transactional: false,
    };
  }

  private async releaseConnection(handle: ConnectionHandle): Promise<void> {
    if (handle.transactional) {
      return;
    }

    await handle.connection.close();
  }
}

function isRowMapperInstance<T>(
  value: RowMapper<T> | RowMapperFunction<T>,
): value is RowMapper<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { mapRow?: unknown }).mapRow === "function"
  );
}
