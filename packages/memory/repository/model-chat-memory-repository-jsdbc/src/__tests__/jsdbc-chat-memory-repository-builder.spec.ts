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

import { UserMessage } from "@nestjs-ai/model";
import {
  DatabaseDialect,
  type DataSource,
  JsdbcTemplate,
} from "@nestjs-port/jsdbc";
import { describe, expect, it, vi } from "vitest";
import { JsdbcChatMemoryRepository } from "../jsdbc-chat-memory-repository.js";
import { JsdbcChatMemoryRepositoryDialectFactory } from "../jsdbc-chat-memory-repository-dialect-factory.js";
import { MysqlChatMemoryRepositoryDialect } from "../mysql-chat-memory-repository-dialect.js";
import { OracleChatMemoryRepositoryDialect } from "../oracle-chat-memory-repository-dialect.js";
import { PostgresChatMemoryRepositoryDialect } from "../postgres-chat-memory-repository-dialect.js";
import { SqlServerChatMemoryRepositoryDialect } from "../sql-server-chat-memory-repository-dialect.js";
import { SqliteChatMemoryRepositoryDialect } from "../sqlite-chat-memory-repository-dialect.js";

describe("JsdbcChatMemoryRepositoryBuilder", () => {
  const createDataSource = (dialect: DatabaseDialect): DataSource => ({
    getConnection: vi.fn(async () => {
      throw new Error("not used");
    }),
    getDialect: vi.fn(async () => dialect),
    transaction: async <T>(callback: (connection: never) => Promise<T>) =>
      callback({} as never),
  });

  const createTemplate = (dialect: DatabaseDialect): JsdbcTemplate =>
    new JsdbcTemplate(createDataSource(dialect));

  it("builds with an explicit data source and dialect", async () => {
    const dataSource = createDataSource(DatabaseDialect.POSTGRESQL);
    const dialect = new MysqlChatMemoryRepositoryDialect();

    const repository = await JsdbcChatMemoryRepository.builder()
      .dataSource(dataSource)
      .dialect(dialect)
      .build();

    expect(repository).toBeInstanceOf(JsdbcChatMemoryRepository);
    expect(Reflect.get(repository, "template")).toBeInstanceOf(JsdbcTemplate);
    expect(Reflect.get(repository, "template").dataSource).toBe(dataSource);
    expect(Reflect.get(repository, "dialect")).toBeInstanceOf(
      MysqlChatMemoryRepositoryDialect,
    );
  });

  it("builds with an explicit template and dialect", async () => {
    const template = createTemplate(DatabaseDialect.POSTGRESQL);
    const dialect = new MysqlChatMemoryRepositoryDialect();

    const repository = await JsdbcChatMemoryRepository.builder()
      .jsdbcTemplate(template)
      .dialect(dialect)
      .build();

    expect(repository).toBeInstanceOf(JsdbcChatMemoryRepository);
    expect(Reflect.get(repository, "template")).toBe(template);
    expect(Reflect.get(repository, "dialect")).toBeInstanceOf(
      MysqlChatMemoryRepositoryDialect,
    );
  });

  it.each([
    [DatabaseDialect.POSTGRESQL, PostgresChatMemoryRepositoryDialect],
    [DatabaseDialect.MYSQL, MysqlChatMemoryRepositoryDialect],
    [DatabaseDialect.MARIADB, MysqlChatMemoryRepositoryDialect],
    [
      DatabaseDialect.MICROSOFT_SQL_SERVER,
      SqlServerChatMemoryRepositoryDialect,
    ],
    [DatabaseDialect.SQLITE, SqliteChatMemoryRepositoryDialect],
    [DatabaseDialect.ORACLE, OracleChatMemoryRepositoryDialect],
  ])(
    "resolves the dialect factory from the data source: %s",
    async (dialect, expectedDialect) => {
      const dataSource = createDataSource(dialect);

      const resolvedDialect =
        await JsdbcChatMemoryRepositoryDialectFactory.from(dataSource);

      expect(resolvedDialect).toBeInstanceOf(expectedDialect);
    },
  );

  it.each([
    [DatabaseDialect.POSTGRESQL, PostgresChatMemoryRepositoryDialect],
    [DatabaseDialect.MYSQL, MysqlChatMemoryRepositoryDialect],
    [DatabaseDialect.MARIADB, MysqlChatMemoryRepositoryDialect],
    [
      DatabaseDialect.MICROSOFT_SQL_SERVER,
      SqlServerChatMemoryRepositoryDialect,
    ],
    [DatabaseDialect.SQLITE, SqliteChatMemoryRepositoryDialect],
    [DatabaseDialect.ORACLE, OracleChatMemoryRepositoryDialect],
  ])(
    "resolves the dialect from the data source: %s",
    async (dialect, expectedDialect) => {
      const dataSource = createDataSource(dialect);

      const repository = await JsdbcChatMemoryRepository.builder()
        .dataSource(dataSource)
        .build();

      expect(repository).toBeInstanceOf(JsdbcChatMemoryRepository);
      expect(Reflect.get(repository, "dialect")).toBeInstanceOf(
        expectedDialect,
      );
    },
  );

  it("defaults to Postgres when the dialect is unknown", async () => {
    const dataSource = createDataSource(
      "unknown" as unknown as DatabaseDialect,
    );

    const repository = await JsdbcChatMemoryRepository.builder()
      .dataSource(dataSource)
      .build();

    expect(repository).toBeInstanceOf(JsdbcChatMemoryRepository);
    expect(Reflect.get(repository, "dialect")).toBeInstanceOf(
      PostgresChatMemoryRepositoryDialect,
    );
  });

  it("defaults to Postgres when dialect resolution fails", async () => {
    const dataSource: DataSource = {
      getConnection: vi.fn(async () => {
        throw new Error("not used");
      }),
      getDialect: vi.fn(async () => {
        throw new Error("Connection failed");
      }),
      transaction: async <T>(callback: (connection: never) => Promise<T>) =>
        callback({} as never),
    };

    const repository = await JsdbcChatMemoryRepository.builder()
      .dataSource(dataSource)
      .build();

    expect(repository).toBeInstanceOf(JsdbcChatMemoryRepository);
    expect(Reflect.get(repository, "dialect")).toBeInstanceOf(
      PostgresChatMemoryRepositoryDialect,
    );
  });

  it("throws when the template is missing", async () => {
    await expect(JsdbcChatMemoryRepository.builder().build()).rejects.toThrow(
      "DataSource must be set via dataSource() or jsdbcTemplate()",
    );
  });

  it("prefers an explicit dialect over the detected dialect", async () => {
    const getDialect = vi.fn(async () => DatabaseDialect.POSTGRESQL);
    const dataSource: DataSource = {
      getConnection: vi.fn(async () => {
        throw new Error("not used");
      }),
      getDialect,
      transaction: async <T>(callback: (connection: never) => Promise<T>) =>
        callback({} as never),
    };

    const repository = await JsdbcChatMemoryRepository.builder()
      .dataSource(dataSource)
      .dialect(new MysqlChatMemoryRepositoryDialect())
      .build();

    expect(getDialect).toHaveBeenCalledTimes(1);
    expect(Reflect.get(repository, "dialect")).toBeInstanceOf(
      MysqlChatMemoryRepositoryDialect,
    );
  });

  it("maps message rows without zod", async () => {
    const template = {
      queryForList: vi.fn(
        async (
          _sql: string,
          rowMapper: {
            mapRow: (
              row: Record<string, unknown>,
              rowNum: number,
            ) => Promise<unknown>;
          },
        ) => [await rowMapper.mapRow({ content: "hello", type: "USER" }, 0)],
      ),
      update: vi.fn(async () => 0),
      transaction: async <T>(callback: (connection: never) => Promise<T>) =>
        callback({} as never),
    } as unknown as JsdbcTemplate;

    const repository = new JsdbcChatMemoryRepository(
      template,
      new PostgresChatMemoryRepositoryDialect(),
    );

    await expect(
      repository.findByConversationId("conversation-1"),
    ).resolves.toEqual([new UserMessage({ content: "hello" })]);
  });
});
