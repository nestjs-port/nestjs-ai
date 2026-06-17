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

import { LoggerFactory } from "@nestjs-port/core";
import { DatabaseDialect, type DataSource } from "@nestjs-port/jsdbc";
import type { JsdbcSessionRepositoryDialect } from "./jsdbc-session-repository-dialect.js";
import { MysqlSessionRepositoryDialect } from "./mysql-session-repository-dialect.js";
import { PostgresSessionRepositoryDialect } from "./postgres-session-repository-dialect.js";
import { SqliteSessionRepositoryDialect } from "./sqlite-session-repository-dialect.js";

/**
 * Detects the best-matching {@link JsdbcSessionRepositoryDialect} for a
 * {@link DataSource}, defaulting to PostgreSQL when the database product cannot
 * be determined.
 */
export class JsdbcSessionRepositoryDialectFactory {
  private static readonly logger = LoggerFactory.getLogger(
    JsdbcSessionRepositoryDialectFactory.name,
  );

  static async from(
    dataSource: DataSource,
  ): Promise<JsdbcSessionRepositoryDialect> {
    let dialect: DatabaseDialect | null = null;

    try {
      dialect = await dataSource.getDialect();
    } catch (error) {
      JsdbcSessionRepositoryDialectFactory.logger.warn(
        "Due to failure in resolving the JSDBC dialect, the session repository dialect could not be determined",
        error as Error,
      );
    }

    if (dialect == null || String(dialect).trim().length === 0) {
      JsdbcSessionRepositoryDialectFactory.logger.warn(
        "Database product name is null or empty, defaulting to Postgres dialect.",
      );
      return new PostgresSessionRepositoryDialect();
    }

    switch (dialect) {
      case DatabaseDialect.POSTGRESQL:
        return new PostgresSessionRepositoryDialect();
      case DatabaseDialect.MYSQL:
      case DatabaseDialect.MARIADB:
        return new MysqlSessionRepositoryDialect();
      case DatabaseDialect.SQLITE:
        return new SqliteSessionRepositoryDialect();
      default:
        return new PostgresSessionRepositoryDialect();
    }
  }
}
