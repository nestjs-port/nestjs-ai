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

import { type Connection, DatabaseDialect, type DataSource } from "../api";
import { TransactionSynchronizationManager } from "../core/transaction-context";
import type { PrismaClientLike, PrismaDialectInfo } from "./prisma";
import { PrismaConnection } from "./prisma-connection";

export interface PrismaJsdbcOptions {
  dialect?: DatabaseDialect;
}

function resolveDialect(
  prisma: PrismaClientLike & PrismaDialectInfo,
  dialect?: DatabaseDialect,
): DatabaseDialect {
  if (dialect) {
    return dialect;
  }

  const activeProvider =
    prisma._activeProvider ?? prisma._engineConfig?.activeProvider;

  switch (activeProvider) {
    case "postgresql":
    case "postgres":
      return DatabaseDialect.POSTGRESQL;
    case "mysql":
      return DatabaseDialect.MYSQL;
    case "mariadb":
      return DatabaseDialect.MARIADB;
    case "sqlite":
      return DatabaseDialect.SQLITE;
    case "sqlserver":
      return DatabaseDialect.MICROSOFT_SQL_SERVER;
    case "oracle":
      return DatabaseDialect.ORACLE;
    default:
      return DatabaseDialect.POSTGRESQL;
  }
}

export class PrismaDataSource implements DataSource {
  private readonly dialect: DatabaseDialect;

  constructor(
    private readonly prisma: PrismaClientLike & PrismaDialectInfo,
    options: PrismaJsdbcOptions = {},
  ) {
    this.dialect = resolveDialect(this.prisma, options.dialect);
  }

  async getConnection(): Promise<Connection> {
    return new PrismaConnection(this.prisma);
  }

  async getDialect(): Promise<DatabaseDialect> {
    return this.dialect;
  }

  async transaction<T>(
    callback: (connection: Connection) => Promise<T>,
  ): Promise<T> {
    const transactionalConnection =
      TransactionSynchronizationManager.getResource(this);
    if (transactionalConnection != null) {
      return callback(transactionalConnection);
    }

    return this.prisma.$transaction(async (prisma) => {
      const connection = new PrismaConnection(prisma);
      return TransactionSynchronizationManager.withResourceContext(
        this,
        connection,
        () => callback(connection),
      );
    });
  }
}
