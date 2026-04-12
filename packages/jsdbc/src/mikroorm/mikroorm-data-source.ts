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
import { MikroOrmConnection, type SqlExecutor } from "./mikroorm-connection";

export type MikroOrmLike = {
  em: SqlExecutor & {
    transactional<T>(
      callback: (em: MikroOrmLike["em"]) => Promise<T>,
    ): Promise<T>;
    getPlatform(): { constructor: { name: string } };
  };
};

export class MikroOrmDataSource implements DataSource {
  private readonly dialect: DatabaseDialect;

  constructor(private readonly orm: MikroOrmLike) {
    this.dialect = resolveDialect(this.orm.em.getPlatform().constructor.name);
  }

  async getConnection(): Promise<Connection> {
    return new MikroOrmConnection(this.orm.em, this.dialect);
  }

  async getDialect(): Promise<DatabaseDialect> {
    return this.dialect;
  }

  async transaction<T>(
    callback: (connection: Connection) => Promise<T>,
  ): Promise<T> {
    return this.orm.em.transactional(async (em: MikroOrmLike["em"]) =>
      callback(new MikroOrmConnection(em, this.dialect)),
    );
  }
}

function resolveDialect(platformName: string): DatabaseDialect {
  if (platformName.includes("Maria")) {
    return DatabaseDialect.MARIADB;
  }
  if (platformName.includes("MySql")) {
    return DatabaseDialect.MYSQL;
  }
  if (platformName.includes("Postgre")) {
    return DatabaseDialect.POSTGRESQL;
  }
  if (platformName.includes("Sqlite") || platformName.includes("LibSql")) {
    return DatabaseDialect.SQLITE;
  }
  if (platformName.includes("MsSql")) {
    return DatabaseDialect.MICROSOFT_SQL_SERVER;
  }
  if (platformName.includes("Oracle")) {
    return DatabaseDialect.ORACLE;
  }
  if (platformName.includes("H2")) {
    return DatabaseDialect.H2;
  }
  if (platformName.includes("HSQL")) {
    return DatabaseDialect.HSQLDB;
  }

  return DatabaseDialect.POSTGRESQL;
}
