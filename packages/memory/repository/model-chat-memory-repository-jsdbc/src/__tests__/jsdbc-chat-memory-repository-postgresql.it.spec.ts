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

import {
  type Connection,
  DatabaseDialect,
  type DataSource,
  JsdbcTemplate,
  type SqlFragment,
  TransactionSynchronizationManager,
} from "@nestjs-ai/jsdbc";
import { MessageType } from "@nestjs-ai/model";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, it } from "vitest";
import { JsdbcChatMemoryRepository } from "../jsdbc-chat-memory-repository";
import { POSTGRESQL_CHAT_MEMORY_SCHEMA } from "../resources";
import { AbstractJdbcChatMemoryRepositoryIT } from "./abstract-jdbc-chat-memory-repository.it-shared";

describe("JsdbcChatMemoryRepositoryPostgresqlIT", () => {
  let postgresContainer: StartedPostgreSqlContainer;
  let pool: Pool;
  let dataSource: PgDataSource;
  let integration: AbstractJdbcChatMemoryRepositoryIT;

  beforeAll(async () => {
    postgresContainer = await new PostgreSqlContainer("postgres:17-alpine")
      .withDatabase("jsdbc_integration")
      .withUsername("jsdbc")
      .withPassword("jsdbc")
      .start();

    pool = new Pool({
      connectionString: postgresContainer.getConnectionUri(),
    });

    dataSource = new PgDataSource(pool);
    await dataSource.execute(POSTGRESQL_CHAT_MEMORY_SCHEMA);

    const chatMemoryRepository = await JsdbcChatMemoryRepository.builder()
      .dataSource(dataSource)
      .build();

    integration = new AbstractJdbcChatMemoryRepositoryIT(
      chatMemoryRepository,
      new JsdbcTemplate(dataSource),
    );
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
    await postgresContainer?.stop();
  }, 60_000);

  it("saves a single message", async () => {
    await integration.saveMessagesSingleMessage(
      "Message from user",
      MessageType.USER,
    );
  });

  it("saves multiple messages", async () => {
    await integration.saveMessagesMultipleMessages();
  });

  it("finds messages by conversation id", async () => {
    await integration.findMessagesByConversationId();
  });

  it("deletes messages by conversation id", async () => {
    await integration.deleteMessagesByConversationId();
  });

  it("preserves message order", async () => {
    await integration.testMessageOrder();
  });

  it("preserves message order for large batches", async () => {
    await integration.testMessageOrderWithLargeBatch();
  });
});

class PgDataSource implements DataSource {
  constructor(private readonly pool: Pool) {}

  async getConnection(): Promise<Connection> {
    return new PgConnection(await this.pool.connect());
  }

  async getDialect(): Promise<DatabaseDialect> {
    return DatabaseDialect.POSTGRESQL;
  }

  async transaction<T>(
    callback: (connection: Connection) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    const connection = new PgConnection(client);

    try {
      return await TransactionSynchronizationManager.withResourceContext(
        this,
        connection,
        () => callback(connection),
      );
    } finally {
      await connection.close();
    }
  }

  async execute(fragment: SqlFragment): Promise<void> {
    const client = await this.pool.connect();
    try {
      const { text, values } = buildPgSql(fragment);
      await client.query(text, values);
    } finally {
      client.release();
    }
  }
}

class PgConnection implements Connection {
  #closed = false;

  constructor(private readonly client: PoolClient) {}

  async query(fragment: SqlFragment): Promise<Record<string, unknown>[]> {
    this.assertOpen();
    const { text, values } = buildPgSql(fragment);
    const result = await this.client.query(text, values);
    return result.rows as Record<string, unknown>[];
  }

  async update(fragment: SqlFragment): Promise<number> {
    this.assertOpen();
    const { text, values } = buildPgSql(fragment);
    const result = await this.client.query(text, values);
    return result.rowCount ?? 0;
  }

  async close(): Promise<void> {
    if (this.#closed) {
      return;
    }

    this.#closed = true;
    this.client.release();
  }

  private assertOpen(): void {
    if (this.#closed) {
      throw new Error("Connection is already closed.");
    }
  }
}

function buildPgSql(fragment: SqlFragment): {
  text: string;
  values: unknown[];
} {
  let text = "";
  const values: unknown[] = [];

  for (const [index, expression] of fragment.expressions.entries()) {
    text += fragment.strings[index];

    if (expression === null) {
      text += "NULL";
      continue;
    }

    if (typeof expression === "function") {
      const value = expression();

      if (typeof value === "string") {
        text += value;
        continue;
      }

      if (Array.isArray(value)) {
        if (value.length === 0) {
          throw new Error(
            `Expression ${index} in this sql tagged template is a function which returned an empty array. Empty arrays cannot safely be expanded into parameter lists.`,
          );
        }

        text += value
          .map((item) => {
            values.push(item);
            return `$${values.length}`;
          })
          .join(", ");
        continue;
      }

      throw new Error(
        `Expression ${index} in this sql tagged template is a function which returned a value of type "${value === null ? "null" : typeof value}". Only array and string types are supported as function return values in sql tagged template expressions.`,
      );
    }

    values.push(expression);
    text += `$${values.length}`;
  }

  text += fragment.strings[fragment.strings.length - 1];

  return { text, values };
}
