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
import { type Connection, DatabaseDialect, type DataSource } from "../api";
import { TransactionSynchronizationManager } from "../core/transaction-synchronization-manager";
import { SequelizeConnection } from "./sequelize-connection";

export class SequelizeDataSource implements DataSource {
  constructor(private readonly sequelize: Sequelize) {}

  async getConnection(): Promise<Connection> {
    return new SequelizeConnection(this.sequelize);
  }

  async getDialect(): Promise<DatabaseDialect> {
    return resolveDialect(this.sequelize.getDialect());
  }

  async transaction<T>(
    callback: (connection: Connection) => Promise<T>,
  ): Promise<T> {
    const transactionalConnection =
      TransactionSynchronizationManager.getResource(this);
    if (transactionalConnection != null) {
      return callback(transactionalConnection);
    }

    return this.sequelize.transaction(async (transaction) => {
      const connection = new SequelizeConnection(this.sequelize, transaction);
      return TransactionSynchronizationManager.withResourceContext(
        this,
        connection,
        () => callback(connection),
      );
    });
  }
}

function resolveDialect(dialect: string): DatabaseDialect {
  switch (dialect) {
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
