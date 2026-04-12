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

import { type Logger, LoggerFactory } from "@nestjs-ai/commons";
import {
  DatabaseDialect,
  type DataSource,
  type SqlFragment,
} from "@nestjs-ai/jsdbc";
import { MysqlChatMemoryRepositoryDialect } from "./mysql-chat-memory-repository-dialect";
import { OracleChatMemoryRepositoryDialect } from "./oracle-chat-memory-repository-dialect";
import { PostgresChatMemoryRepositoryDialect } from "./postgres-chat-memory-repository-dialect";
import { SqlServerChatMemoryRepositoryDialect } from "./sql-server-chat-memory-repository-dialect";
import { SqliteChatMemoryRepositoryDialect } from "./sqlite-chat-memory-repository-dialect";

/**
 * Abstraction for database-specific SQL for chat memory repository.
 */
export abstract class JsdbcChatMemoryRepositoryDialect {
  private static readonly logger: Logger = LoggerFactory.getLogger(
    JsdbcChatMemoryRepositoryDialect.name,
  );

  abstract getSelectMessagesSql(conversationId: string): SqlFragment;

  abstract getInsertMessageSql(
    conversationId: string,
    content: string | null,
    type: string,
    timestamp: Date,
  ): SqlFragment;

  abstract getSelectConversationIdsSql(): SqlFragment;

  abstract getDeleteMessagesSql(conversationId: string): SqlFragment;

  static async from(
    dataSource: DataSource,
  ): Promise<JsdbcChatMemoryRepositoryDialect> {
    let dialect: DatabaseDialect | null = null;

    try {
      dialect = await dataSource.getDialect();
    } catch (error) {
      JsdbcChatMemoryRepositoryDialect.logger.warn(
        "Due to failure in resolving the JSDBC dialect, the chat memory repository dialect could not be determined",
        error as Error,
      );
    }

    if (dialect == null || String(dialect).trim().length === 0) {
      JsdbcChatMemoryRepositoryDialect.logger.warn(
        "Database product name is null or empty, defaulting to Postgres dialect.",
      );
      return new PostgresChatMemoryRepositoryDialect();
    }

    switch (dialect) {
      case DatabaseDialect.POSTGRESQL:
        return new PostgresChatMemoryRepositoryDialect();
      case DatabaseDialect.MYSQL:
      case DatabaseDialect.MARIADB:
        return new MysqlChatMemoryRepositoryDialect();
      case DatabaseDialect.MICROSOFT_SQL_SERVER:
        return new SqlServerChatMemoryRepositoryDialect();
      case DatabaseDialect.SQLITE:
        return new SqliteChatMemoryRepositoryDialect();
      case DatabaseDialect.ORACLE:
        return new OracleChatMemoryRepositoryDialect();
      default:
        return new PostgresChatMemoryRepositoryDialect();
    }
  }
}
