/*
 * Copyright 2026-present the original author or authors.
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
import { TransactionSynchronizationManager } from "../core";
import type { DrizzleDatabase } from "./drizzle";
import { DrizzleConnection } from "./drizzle-connection";

export interface DrizzleJsdbcOptions {
  dialect?: DatabaseDialect;
}

export class DrizzleDataSource implements DataSource {
  private readonly dialect: DatabaseDialect;

  constructor(
    private readonly db: DrizzleDatabase,
    options: DrizzleJsdbcOptions = {},
  ) {
    this.dialect = resolveDialect(this.db, options.dialect);
  }

  async getConnection(): Promise<Connection> {
    return new DrizzleConnection(this.db);
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

    return this.db.transaction(async (tx) => {
      const connection = new DrizzleConnection(tx);
      return TransactionSynchronizationManager.withResourceContext(
        this,
        connection,
        () => callback(connection),
      );
    });
  }
}

function resolveDialect(
  db: DrizzleDatabase,
  explicit?: DatabaseDialect,
): DatabaseDialect {
  if (explicit) {
    return explicit;
  }

  const databaseName = readDatabaseName(db);

  if (isPostgresDatabase(databaseName)) {
    return DatabaseDialect.POSTGRESQL;
  }
  if (isMySqlDatabase(databaseName)) {
    return DatabaseDialect.MYSQL;
  }
  if (isSqliteDatabase(databaseName)) {
    return DatabaseDialect.SQLITE;
  }
  if (isSingleStoreDatabase(databaseName)) {
    return DatabaseDialect.MYSQL;
  }

  const dialectName = readDialectName(db);
  if (isPostgresName(dialectName)) {
    return DatabaseDialect.POSTGRESQL;
  }
  if (isMySqlName(dialectName)) {
    return DatabaseDialect.MYSQL;
  }
  if (isSqliteName(dialectName)) {
    return DatabaseDialect.SQLITE;
  }
  if (isSingleStoreName(dialectName)) {
    return DatabaseDialect.MYSQL;
  }

  return DatabaseDialect.POSTGRESQL;
}

function readDatabaseName(db: DrizzleDatabase): string {
  try {
    return db.constructor.name;
  } catch {
    return "";
  }
}

function readDialectName(db: DrizzleDatabase): string {
  try {
    const internal = (db as Record<string, unknown>)._ as
      | Record<string, unknown>
      | undefined;
    const dialect = internal?.dialect as
      | { constructor: { name: string } }
      | undefined;
    return dialect?.constructor?.name ?? "";
  } catch {
    return "";
  }
}

function isPostgresDatabase(name: string): boolean {
  return (
    isPostgresName(name) ||
    name === "PgliteDatabase" ||
    name === "NeonHttpDatabase" ||
    name === "NeonServerlessDatabase" ||
    name === "VercelPgDatabase" ||
    name === "AwsDataApiPgDatabase" ||
    name === "PrismaPgDatabase" ||
    name === "PgRemoteDatabase"
  );
}

function isMySqlDatabase(name: string): boolean {
  return (
    isMySqlName(name) ||
    name === "MySqlRemoteDatabase" ||
    name === "MySql2Database" ||
    name === "PrismaMySqlDatabase" ||
    name === "PlanetScaleDatabase" ||
    name === "SingleStoreDriverDatabase" ||
    name === "SingleStoreRemoteDatabase" ||
    name === "TiDBServerlessDatabase"
  );
}

function isSqliteDatabase(name: string): boolean {
  return (
    isSqliteName(name) ||
    name === "BaseSQLiteDatabase" ||
    name === "BetterSQLite3Database" ||
    name === "BunSQLiteDatabase" ||
    name === "D1Database" ||
    name === "DrizzleSqliteDODatabase" ||
    name === "ExpoSQLiteDatabase" ||
    name === "OPSQLiteDatabase" ||
    name === "SqliteRemoteDatabase" ||
    name === "LibSQLDatabase" ||
    name === "SQLiteAsyncDatabase" ||
    name === "SQLiteSyncDatabase" ||
    name === "SqlJsDatabase"
  );
}

function isSingleStoreDatabase(name: string): boolean {
  return name === "SingleStoreDatabase" || name === "SingleStoreDriverDatabase";
}

function isPostgresName(name: string): boolean {
  return (
    name.includes("Pg") || name.includes("Postgre") || name.includes("Postgres")
  );
}

function isMySqlName(name: string): boolean {
  return name.includes("MySql") || name.includes("Maria");
}

function isSqliteName(name: string): boolean {
  return (
    name.includes("SQLite") || name.includes("Sqlite") || name.includes("SqlJs")
  );
}

function isSingleStoreName(name: string): boolean {
  return name.includes("SingleStore");
}
