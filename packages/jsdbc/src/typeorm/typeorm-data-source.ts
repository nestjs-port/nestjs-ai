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

import type { EntityManager, DataSource as TypeOrmSource } from "typeorm";

import { type Connection, DatabaseDialect, type DataSource } from "../api";
import { type QueryExecutor, TypeOrmConnection } from "./typeorm-connection";

function toDialectFromTypeOrmType(type: string): DatabaseDialect {
  switch (type) {
    case "mariadb":
      return DatabaseDialect.MARIADB;
    case "mysql":
      return DatabaseDialect.MYSQL;
    case "postgres":
      return DatabaseDialect.POSTGRESQL;
    case "sqlite":
      return DatabaseDialect.SQLITE;
    case "mssql":
      return DatabaseDialect.MICROSOFT_SQL_SERVER;
    case "oracle":
      return DatabaseDialect.ORACLE;
    default:
      return DatabaseDialect.POSTGRESQL;
  }
}

type TypeOrmSqlExecutor = Pick<
  TypeOrmSource,
  "options" | "query" | "transaction"
> &
  Pick<EntityManager, "query">;

export class TypeOrmDataSource implements DataSource {
  private readonly dialect: DatabaseDialect;

  constructor(private readonly source: TypeOrmSqlExecutor) {
    this.dialect = toDialectFromTypeOrmType(String(this.source.options.type));
  }

  async getConnection(): Promise<Connection> {
    return new TypeOrmConnection(this.source, this.dialect);
  }

  async getDialect(): Promise<DatabaseDialect> {
    return this.dialect;
  }

  async transaction<T>(
    callback: (connection: Connection) => Promise<T>,
  ): Promise<T> {
    return this.source.transaction(async (manager) => {
      const executor: QueryExecutor = manager;
      return callback(new TypeOrmConnection(executor, this.dialect));
    });
  }
}
